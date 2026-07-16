import { unzlibSync, unzipSync } from "fflate";

export type DocumentSignals = {
  feeTerms: number;
  riskTerms: number;
  moneyTerms: number;
  paragraphCount: number;
  excerpt: string;
};

const decodeXml = (value: string) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));

const normalize = (value: string) =>
  value
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const countMatches = (value: string, pattern: RegExp) => value.match(pattern)?.length ?? 0;

export const analyzeDocumentText = (text: string): DocumentSignals => ({
  feeTerms: countMatches(text, /중도상환수수료|수수료|보수|위약금|연체료|공제액|부담금/gi),
  riskTerms: countMatches(text, /면책|해지|갱신|손해배상|기한의 이익|책임 제한|자동 연장|위험/gi),
  moneyTerms: countMatches(text, /(?:₩|￦|KRW|원|만원|억원|%|퍼센트)/gi),
  paragraphCount: text ? text.split(/\n+/).filter(Boolean).length : 0,
  excerpt: text.slice(0, 420),
});

const extractDocx = (bytes: Uint8Array) => {
  const archive = unzipSync(bytes, {
    filter: (file) => file.name === "word/document.xml" && file.originalSize <= 5 * 1024 * 1024,
  });
  const documentXml = archive["word/document.xml"];
  if (!documentXml) throw new Error("DOCX 본문 XML을 찾지 못했습니다.");
  const xml = new TextDecoder().decode(documentXml);
  return normalize(
    decodeXml(
      xml
        .replace(/<w:tab\b[^>]*\/>/g, "\t")
        .replace(/<w:br\b[^>]*\/>/g, "\n")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<[^>]+>/g, ""),
    ),
  );
};

const binaryString = (bytes: Uint8Array) => {
  let value = "";
  const chunkSize = 16_384;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    value += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return value;
};

const decodePdfLiteral = (value: string) =>
  value
    .replace(/\\([nrtbf()\\])/g, (_, token: string) => {
      const replacements: Record<string, string> = {
        n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\",
      };
      return replacements[token] ?? token;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\\r?\n/g, "");

const extractPdfOperators = (content: string) => {
  const output: string[] = [];
  const blocks = content.match(/BT[\s\S]*?ET/g) ?? [content];
  for (const block of blocks) {
    for (const match of block.matchAll(/\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")/g)) {
      output.push(decodePdfLiteral(match[1]));
    }
    for (const arrayMatch of block.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
      for (const match of arrayMatch[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)) {
        output.push(decodePdfLiteral(match[1]));
      }
    }
  }
  return output.join("\n");
};

const extractPdf = (bytes: Uint8Array) => {
  const raw = binaryString(bytes);
  const streams: string[] = [raw];
  let cursor = 0;

  while (cursor < raw.length) {
    const marker = raw.indexOf("stream", cursor);
    if (marker < 0) break;
    const lineEnd = raw.indexOf("\n", marker);
    const end = raw.indexOf("endstream", lineEnd + 1);
    if (lineEnd < 0 || end < 0) break;
    let streamEnd = end;
    while (streamEnd > lineEnd && (raw[streamEnd - 1] === "\r" || raw[streamEnd - 1] === "\n")) streamEnd -= 1;
    const dictionary = raw.slice(Math.max(0, marker - 600), marker);
    const streamBytes = bytes.subarray(lineEnd + 1, streamEnd);
    if (/FlateDecode/.test(dictionary)) {
      try {
        streams.push(binaryString(unzlibSync(streamBytes)));
      } catch {
        // Some PDFs use predictors or chained filters. The raw stream remains available as fallback.
      }
    } else {
      streams.push(binaryString(streamBytes));
    }
    cursor = end + 9;
  }

  return normalize(streams.map(extractPdfOperators).filter(Boolean).join("\n"));
};

export function extractDocumentText(bytes: Uint8Array, filename: string, contentType: string) {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "txt" || contentType.startsWith("text/")) {
    return normalize(new TextDecoder().decode(bytes));
  }
  if (extension === "docx" || contentType.includes("wordprocessingml")) {
    return extractDocx(bytes);
  }
  if (extension === "pdf" || contentType === "application/pdf") {
    return extractPdf(bytes);
  }
  throw new Error("지원 형식은 PDF, DOCX, TXT입니다.");
}
