import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { actionRequests, auditLogs } from "../../../db/schema";
import {
  auditStatusByAdapterStatus,
  getInstitutionAdapter,
  type InstitutionActionRequest,
} from "../../../lib/action-adapters";
import { services, type PermissionLevel, type ServiceId } from "../../../lib/catalog";
import { getRequestOwnerId } from "../../../lib/request-owner";

const permissionLevels: PermissionLevel[] = ["L0", "L1", "L2", "L3", "L4"];

const safeMessage = (error: unknown) =>
  error instanceof Error ? error.message : "샌드박스 실행 처리 중 오류가 발생했습니다.";

const isServiceId = (value: string): value is ServiceId =>
  services.some((service) => service.id === value);

export async function GET(request: Request) {
  try {
    const ownerId = await getRequestOwnerId(request);
    const actions = await getDb()
      .select()
      .from(actionRequests)
      .where(eq(actionRequests.ownerId, ownerId))
      .orderBy(desc(actionRequests.createdAt))
      .limit(100);
    return Response.json({ actions });
  } catch (error) {
    return Response.json({ error: safeMessage(error), actions: [] }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(request.url).host) {
      return Response.json({ error: "교차 출처 실행 요청은 허용되지 않습니다." }, { status: 403 });
    }
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return Response.json({ error: "JSON 요청만 허용됩니다." }, { status: 415 });
    }
    const payload = (await request.json()) as Partial<InstitutionActionRequest> & {
      provider?: string;
    };
    const serviceId = String(payload.serviceId ?? "");
    const permission = String(payload.permission ?? "");
    if (payload.operation !== "execute" && payload.operation !== "cancel") {
      return Response.json({ error: "실행 작업은 execute 또는 cancel이어야 합니다." }, { status: 400 });
    }
    const operation = payload.operation;
    const required = [
      payload.id,
      payload.idempotencyKey,
      payload.feature,
    ];

    if (required.some((value) => !String(value ?? "").trim())) {
      return Response.json({ error: "필수 실행 필드가 누락되었습니다." }, { status: 400 });
    }
    if (!isServiceId(serviceId) || !permissionLevels.includes(permission as PermissionLevel)) {
      return Response.json({ error: "서비스 또는 권한 단계가 유효하지 않습니다." }, { status: 400 });
    }
    const service = services.find((item) => item.id === serviceId)!;
    if (!service.features.includes(String(payload.feature)) || permission !== service.permission) {
      return Response.json({ error: "실행 정보가 서버 카탈로그와 일치하지 않습니다." }, { status: 400 });
    }
    const actionId = String(payload.id);
    const idempotencyKey = String(payload.idempotencyKey);
    if (
      actionId.length > 180 ||
      idempotencyKey.length > 180 ||
      !/^[0-9A-Za-z._:-]+$/.test(actionId) ||
      !/^[0-9A-Za-z._:-]+$/.test(idempotencyKey)
    ) {
      return Response.json({ error: "실행 식별자 형식이 유효하지 않습니다." }, { status: 400 });
    }
    const amount = Number(payload.amount ?? 0);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1_000_000_000_000) {
      return Response.json({ error: "실행 금액은 0원 이상 1조원 이하의 정수여야 합니다." }, { status: 400 });
    }

    const db = getDb();
    const ownerId = await getRequestOwnerId(request);
    const [existing] = await db
      .select()
      .from(actionRequests)
      .where(and(eq(actionRequests.ownerId, ownerId), eq(actionRequests.idempotencyKey, idempotencyKey)))
      .limit(1);
    if (existing) {
      const [log] = await db
        .select()
        .from(auditLogs)
        .where(and(eq(auditLogs.ownerId, ownerId), eq(auditLogs.id, existing.id)))
        .limit(1);
      return Response.json({ action: existing, log, duplicate: true });
    }

    const actionRequest: InstitutionActionRequest = {
      id: actionId,
      idempotencyKey,
      operation,
      serviceId,
      serviceTitle: service.title,
      feature: String(payload.feature),
      action: service.action,
      amount,
      permission: permission as PermissionLevel,
      confirmed: payload.confirmed === true,
      scenario: payload.scenario,
    };
    const adapter = getInstitutionAdapter(payload.provider ?? "sandbox");
    const result = operation === "cancel"
      ? await adapter.cancel(actionRequest)
      : await adapter.execute(actionRequest);
    const status = auditStatusByAdapterStatus[result.status];

    const actionInsert = db.insert(actionRequests).values({
        id: actionRequest.id,
        ownerId,
        idempotencyKey,
        serviceId,
        serviceTitle: actionRequest.serviceTitle,
        feature: actionRequest.feature,
        action: actionRequest.action,
        amount: actionRequest.amount,
        permission: actionRequest.permission,
        operation,
        adapter: result.adapter,
        status,
        code: result.code,
        detail: result.detail,
        externalRef: result.externalRef,
      }).returning();
    const logInsert = db.insert(auditLogs).values({
        id: actionRequest.id,
        ownerId,
        serviceId,
        serviceTitle: actionRequest.serviceTitle,
        feature: actionRequest.feature,
        action: actionRequest.action,
        amount: actionRequest.amount,
        permission: actionRequest.permission,
        status,
        detail: `${result.detail} [${result.code} · ${result.externalRef}]`,
      }).returning();
    const [actionRows, logRows] = await db.batch([actionInsert, logInsert]);
    const action = actionRows[0];
    const log = logRows[0];

    return Response.json({ action, log, duplicate: false }, { status: 201 });
  } catch (error) {
    return Response.json({ error: safeMessage(error) }, { status: 503 });
  }
}
