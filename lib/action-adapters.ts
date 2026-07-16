import type { PermissionLevel, ServiceId } from "./catalog";

export type ActionOperation = "execute" | "cancel";
export type AdapterStatus = "success" | "failed" | "cancelled";

export type InstitutionActionRequest = {
  id: string;
  idempotencyKey: string;
  operation: ActionOperation;
  serviceId: ServiceId;
  serviceTitle: string;
  feature: string;
  action: string;
  amount: number;
  permission: PermissionLevel;
  confirmed: boolean;
  scenario?: "success" | "institution_failure";
};

export type InstitutionActionResult = {
  status: AdapterStatus;
  code: string;
  detail: string;
  adapter: string;
  externalRef: string;
};

export interface InstitutionAdapter {
  readonly name: string;
  execute(request: InstitutionActionRequest): Promise<InstitutionActionResult>;
  cancel(request: InstitutionActionRequest): Promise<InstitutionActionResult>;
}

const makeReference = (idempotencyKey: string) => {
  const hash = [...idempotencyKey].reduce(
    (value, character) => (value * 33 + character.charCodeAt(0)) >>> 0,
    5381,
  );
  return `FIA-SBX-${hash.toString(16).toUpperCase().padStart(8, "0")}`;
};

export class SandboxInstitutionAdapter implements InstitutionAdapter {
  readonly name = "FIA Sandbox Adapter v1";

  async execute(request: InstitutionActionRequest): Promise<InstitutionActionResult> {
    const externalRef = makeReference(request.idempotencyKey);

    if (!request.confirmed) {
      return {
        status: "failed",
        code: "CONSENT_REQUIRED",
        detail: "사용자의 명시적 최종 승인이 없어 실행하지 않았습니다.",
        adapter: this.name,
        externalRef,
      };
    }

    if (!Number.isFinite(request.amount) || request.amount < 0) {
      return {
        status: "failed",
        code: "INVALID_AMOUNT",
        detail: "실행 금액이 유효한 0 이상의 숫자가 아닙니다.",
        adapter: this.name,
        externalRef,
      };
    }

    if (request.permission === "L4" && request.amount > 5_000_000) {
      return {
        status: "failed",
        code: "POLICY_LIMIT_EXCEEDED",
        detail: "설정된 샌드박스 L4 1회 실행 한도 500만원을 초과해 정책 엔진이 차단했습니다.",
        adapter: this.name,
        externalRef,
      };
    }

    if (request.scenario === "institution_failure") {
      return {
        status: "failed",
        code: "INSTITUTION_UNAVAILABLE",
        detail: "기관 샌드박스가 일시적인 처리 불가 응답을 반환했습니다. 금액 이동은 발생하지 않았습니다.",
        adapter: this.name,
        externalRef,
      };
    }

    return {
      status: "success",
      code: "SANDBOX_COMPLETED",
      detail: "사용자 승인, 권한, 한도와 중복 검사를 통과해 기관 샌드박스에서 정상 처리되었습니다.",
      adapter: this.name,
      externalRef,
    };
  }

  async cancel(request: InstitutionActionRequest): Promise<InstitutionActionResult> {
    return {
      status: "cancelled",
      code: "USER_CANCELLED",
      detail: "사용자가 최종 승인 단계에서 샌드박스 실행을 취소했습니다. 금액 이동은 발생하지 않았습니다.",
      adapter: this.name,
      externalRef: makeReference(request.idempotencyKey),
    };
  }
}

const sandboxAdapter = new SandboxInstitutionAdapter();

export function getInstitutionAdapter(provider = "sandbox"): InstitutionAdapter {
  if (provider !== "sandbox") {
    throw new Error(`지원하지 않는 기관 어댑터입니다: ${provider}`);
  }
  return sandboxAdapter;
}

export const auditStatusByAdapterStatus: Record<AdapterStatus, "성공" | "실패" | "취소"> = {
  success: "성공",
  failed: "실패",
  cancelled: "취소",
};
