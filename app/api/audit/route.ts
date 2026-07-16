import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditLogs } from "../../../db/schema";
import { getRequestOwnerId } from "../../../lib/request-owner";

const safeMessage = (error: unknown) =>
  error instanceof Error ? error.message : "감사로그 처리 중 오류가 발생했습니다.";

export async function GET(request: Request) {
  try {
    const ownerId = await getRequestOwnerId(request);
    const db = getDb();
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.ownerId, ownerId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);
    return Response.json({ logs });
  } catch (error) {
    return Response.json({ error: safeMessage(error), logs: [] }, { status: 503 });
  }
}
