import assert from "node:assert/strict";
import test from "node:test";
import { zipSync } from "fflate";
import { SandboxInstitutionAdapter } from "../lib/action-adapters";
import { featureCount, services, type PermissionLevel, type ServiceId } from "../lib/catalog";
import { analyzeDocumentText, extractDocumentText } from "../lib/document-extraction";
import { allFeatureProfiles, getFeatureProfile } from "../lib/feature-profiles";
import { analyzeService, netWorth, totalAssets, totalLiabilities } from "../lib/finance";
import { planCommand } from "../lib/supervisor";

test("all 17 services and 155 features have unique executable profiles", () => {
  assert.equal(services.length, 17);
  assert.equal(featureCount, 155);
  assert.deepEqual(
    services.map((service) => service.features.length),
    [21, 18, 12, 9, 9, 7, 9, 7, 9, 9, 8, 8, 7, 6, 5, 4, 7],
  );
  assert.equal(allFeatureProfiles.length, featureCount);
  assert.equal(new Set(allFeatureProfiles.map((profile) => profile.key)).size, featureCount);
  assert.equal(new Set(allFeatureProfiles.map((profile) => profile.signature)).size, featureCount);

  for (const service of services) {
    for (const feature of service.features) {
      const profile = getFeatureProfile(service.id, feature);
      assert.equal(profile.feature, feature);
      assert.match(profile.inputLabel, new RegExp(feature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.ok(profile.requiredInputs.length >= 4);
      assert.match(profile.validation, new RegExp(feature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.ok(profile.sensitivityPercent >= 0.6 && profile.sensitivityPercent <= 9);
    }
  }
});

test("all 155 feature analyses are deterministic and evidence-bearing", () => {
  const sources = new Set<string>();

  for (const service of services) {
    for (const feature of service.features) {
      const first = analyzeService(service.id, feature, service.defaultValue, 5, 3);
      const second = analyzeService(service.id, feature, service.defaultValue, 5, 3);
      const profile = getFeatureProfile(service.id, feature);
      assert.deepEqual(first, second, `${service.id}/${feature} must be deterministic`);
      assert.ok(first.metrics.length >= 5, `${service.id}/${feature} must expose metrics`);
      assert.ok(first.steps.length >= 4, `${service.id}/${feature} must expose execution steps`);
      assert.ok(first.assumptions.length >= 4, `${service.id}/${feature} must expose constraints`);
      assert.match(first.source, new RegExp(profile.signature));
      assert.match(first.sourceTime, /KST/);
      assert.ok(first.confidence > 0 && first.confidence <= 100);
      sources.add(first.source);
    }
  }

  assert.equal(sources.size, featureCount, "each feature must retain a unique source signature");
});

test("17 representative financial engine baselines match expected values", () => {
  assert.deepEqual(
    { totalAssets, totalLiabilities, netWorth },
    { totalAssets: 945_200_000, totalLiabilities: 236_640_000, netWorth: 708_560_000 },
  );
  const expected: Record<ServiceId, string[]> = {
    assets: ["7.4억원", "9.8억원", "24.3%", "13/16개"],
    invest: ["6.5%", "12.2%", "-16.4%", "6,838만원"],
    planning: ["3.0억원", "447만원", "238만원", "37.2%"],
    tax: ["540만원", "410만원", "18.0%", "6개"],
    insurance: ["2.0억원", "1.3억원", "7,400만원", "78,000원/월"],
    loan: ["228만원", "222만원", "5.2% → 4.1%", "361만원"],
    spending: ["240만원", "138만원", "102만원", "14만원"],
    assistant: ["391만원", "350만원", "5만원", "6개"],
    agent: ["100만원", "300만원", "L4 기관 인증", "Sandbox v1"],
    risk: ["85/100", "480만원", "4개", "93%"],
    news: ["-132만원", "+0.4%", "+96만원", "7개"],
    business: ["1.8개월", "4,500만원", "4,700만원", "72%"],
    contract: ["34만원", "20만원", "5개", "100% 연결"],
    global: ["20만원", "7만원", "13만원", "±2.4%"],
    voice: ["30만원", "음성 송금", "94%", "화면 필수"],
    credit: ["872점", "889점", "73.3%", "34% → 22%"],
    life: ["5,000만원", "1,100만원", "60만원", "7개"],
  };

  for (const service of services) {
    const result = analyzeService(service.id, service.features[0], service.defaultValue, 5, 3);
    assert.deepEqual(result.metrics.slice(0, 4).map((metric) => metric.value), expected[service.id]);
  }
});

const makeRequest = (overrides: {
  id?: string;
  idempotencyKey?: string;
  amount?: number;
  permission?: PermissionLevel;
  confirmed?: boolean;
  operation?: "execute" | "cancel";
  scenario?: "success" | "institution_failure";
} = {}) => ({
  id: overrides.id ?? "action-test-001",
  idempotencyKey: overrides.idempotencyKey ?? "idem-test-001",
  operation: overrides.operation ?? "execute",
  serviceId: "agent" as ServiceId,
  serviceTitle: "AI 자동 실행(Agent)",
  feature: "자동 송금",
  action: "샌드박스 실행 승인",
  amount: overrides.amount ?? 1_000_000,
  permission: overrides.permission ?? "L4",
  confirmed: overrides.confirmed ?? true,
  scenario: overrides.scenario,
});

test("sandbox adapter reproduces success, policy failure, institution failure and cancel", async () => {
  const adapter = new SandboxInstitutionAdapter();
  const success = await adapter.execute(makeRequest());
  const noConsent = await adapter.execute(makeRequest({ confirmed: false }));
  const limit = await adapter.execute(makeRequest({ amount: 5_000_001 }));
  const unavailable = await adapter.execute(makeRequest({ scenario: "institution_failure" }));
  const cancelled = await adapter.cancel(makeRequest({ operation: "cancel", confirmed: false }));
  const duplicateReference = await adapter.execute(makeRequest());

  assert.equal(success.code, "SANDBOX_COMPLETED");
  assert.equal(noConsent.code, "CONSENT_REQUIRED");
  assert.equal(limit.code, "POLICY_LIMIT_EXCEEDED");
  assert.equal(unavailable.code, "INSTITUTION_UNAVAILABLE");
  assert.equal(cancelled.code, "USER_CANCELLED");
  assert.equal(success.externalRef, duplicateReference.externalRef);
});

test("TXT, DOCX and text-based PDF extraction produce contract evidence", () => {
  const encoder = new TextEncoder();
  const text = "중도상환수수료 0.8%\n자동 연장 및 해지 조항\n책임 제한";
  const extractedText = extractDocumentText(encoder.encode(text), "contract.txt", "text/plain");
  const docx = zipSync({
    "word/document.xml": encoder.encode(
      "<w:document><w:body><w:p><w:r><w:t>보험 수수료 1%</w:t></w:r></w:p><w:p><w:r><w:t>면책 및 갱신 조항</w:t></w:r></w:p></w:body></w:document>",
    ),
  });
  const extractedDocx = extractDocumentText(
    docx,
    "contract.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  const pdf = encoder.encode("%PDF-1.4\n1 0 obj<<>>stream\nBT (Fee clause) Tj (Risk clause) Tj ET\nendstream\nendobj\n%%EOF");
  const extractedPdf = extractDocumentText(pdf, "contract.pdf", "application/pdf");

  assert.match(extractedText, /중도상환수수료/);
  assert.match(extractedDocx, /보험 수수료 1%/);
  assert.match(extractedDocx, /면책 및 갱신 조항/);
  assert.match(extractedPdf, /Fee clause/);
  assert.deepEqual(analyzeDocumentText(extractedText), {
    feeTerms: 1,
    riskTerms: 3,
    moneyTerms: 1,
    paragraphCount: 3,
    excerpt: extractedText,
  });
});

test("Supervisor routes representative requests across all 17 experts", () => {
  const cases: Array<[string, ServiceId]> = [
    ["내 순자산과 모든 금융계좌 보여줘", "assets"],
    ["ETF 포트폴리오 리밸런싱 분석", "invest"],
    ["은퇴 자금 계획을 세워줘", "planning"],
    ["양도소득세 추정", "tax"],
    ["실손보험 보장 공백", "insurance"],
    ["대환대출 최저 금리", "loan"],
    ["구독 관리와 월 예산", "spending"],
    ["다음 달 여행 가는데 얼마 써도 될까", "assistant"],
    ["자동 송금 실행", "agent"],
    ["보이스피싱 위험 경고", "risk"],
    ["경제 뉴스 요약", "news"],
    ["법인 자금 관리", "business"],
    ["대출 계약 위험 조항 요약", "contract"],
    ["해외송금 최적 경로", "global"],
    ["음성 조회", "voice"],
    ["신용점수 하락 원인 분석", "credit"],
    ["취업 후 상황별 금융 계획", "life"],
  ];

  for (const [command, expected] of cases) {
    const plan = planCommand(command);
    assert.equal(plan.primaryServiceId, expected, command);
    assert.ok(plan.specialists.length >= 1);
    assert.equal(plan.specialists[0].serviceId, expected);
    assert.equal(plan.steps.length, 3);
  }

  const travel = planCommand("다음 달 여행 가는데 300만원 써도 될까");
  assert.deepEqual(
    travel.specialists.slice(0, 5).map((item) => item.serviceId),
    ["assistant", "spending", "global", "insurance", "planning"],
  );
});
