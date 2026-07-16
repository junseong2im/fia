import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { documents } from "../../../db/schema";
import { analyzeDocumentText, extractDocumentText } from "../../../lib/document-extraction";
import { getRequestOwnerId } from "../../../lib/request-owner";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedExtensions = new Set(["pdf", "docx", "txt"]);

const getBucket = () => {
  const bucket = (env as typeof env & { DOCUMENTS?: R2Bucket }).DOCUMENTS;
  if (!bucket) throw new Error("R2 DOCUMENTS 바인딩을 사용할 수 없습니다.");
  return bucket;
};

const safeMessage = (error: unknown) =>
  error instanceof Error ? error.message : "문서 처리 중 오류가 발생했습니다.";

const sha256 = async (bytes: Uint8Array) => {
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
};

const hasExpectedSignature = (bytes: Uint8Array, extension: string) => {
  if (extension === "pdf") return new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
  if (extension === "docx") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (extension === "txt") return !bytes.subarray(0, 1024).includes(0);
  return false;
};

const parseSignals = (value: string) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  try {
    const ownerId = await getRequestOwnerId(request);
    const items = await getDb()
      .select()
      .from(documents)
      .where(eq(documents.ownerId, ownerId))
      .orderBy(desc(documents.createdAt))
      .limit(50);
    return Response.json({ documents: items.map((item) => ({ ...item, signals: parseSignals(item.signalsJson) })) });
  } catch (error) {
    return Response.json({ error: safeMessage(error), documents: [] }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const feature = String(formData.get("feature") ?? "위험 조항 요약");
    if (!(file instanceof File)) {
      return Response.json({ error: "분석할 문서 파일이 필요합니다." }, { status: 400 });
    }
    const extension = file.name.toLowerCase().split(".").pop() ?? "";
    if (!allowedExtensions.has(extension)) {
      return Response.json({ error: "지원 형식은 PDF, DOCX, TXT입니다." }, { status: 415 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "파일 크기는 1바이트 이상 10MB 이하여야 합니다." }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasExpectedSignature(bytes, extension)) {
      return Response.json({ error: "파일 확장자와 실제 파일 형식이 일치하지 않습니다." }, { status: 415 });
    }
    const digest = await sha256(bytes);
    const ownerId = await getRequestOwnerId(request);
    const id = `doc-${crypto.randomUUID()}`;
    const safeName = file.name.replace(/[^0-9A-Za-z가-힣._-]/g, "_").slice(-120);
    const objectKey = `contracts/${new Date().toISOString().slice(0, 10)}/${id}-${safeName}`;
    const text = extractDocumentText(bytes, file.name, file.type || "application/octet-stream").slice(0, 50_000);
    const signals = analyzeDocumentText(text);
    const status = text.length > 0 ? "분석 완료" : "OCR 필요";

    const bucket = getBucket();
    await bucket.put(objectKey, bytes, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { documentId: id, sha256: digest, feature },
    });

    let document: typeof documents.$inferSelect;
    try {
      [document] = await getDb()
        .insert(documents)
        .values({
          id,
          ownerId,
          objectKey,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          sha256: digest,
          status,
          extractedLength: text.length,
          preview: text.slice(0, 2_000),
          signalsJson: JSON.stringify(signals),
          serviceId: "contract",
          feature,
        })
        .returning();
    } catch (error) {
      await bucket.delete(objectKey);
      throw error;
    }

    return Response.json({ document, signals }, { status: 201 });
  } catch (error) {
    return Response.json({ error: safeMessage(error) }, { status: 503 });
  }
}
