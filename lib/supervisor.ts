import { getService, services, type ServiceId } from "./catalog";

export type SupervisorPlan = {
  command: string;
  primaryServiceId: ServiceId;
  feature: string;
  specialists: Array<{ serviceId: ServiceId; title: string; score: number; reason: string }>;
  steps: string[];
};

const intentRules: Array<{ serviceId: ServiceId; pattern: RegExp; reason: string }> = [
  { serviceId: "assets", pattern: /순자산|자산 통합|금융계좌|계좌 연결|부동산|가상자산|NFT|보유 자산/, reason: "자산·부채 원천 통합" },
  { serviceId: "invest", pattern: /포트폴리오|투자|주식|종목|ETF|채권|배당|리밸런싱|퀀트|백테스트|옵션|선물/, reason: "투자 위험·수익 분석" },
  { serviceId: "planning", pattern: /은퇴 자금|결혼 자금|주택 구매|자동차 구매|교육비|유학 자금|목표 금액|재무설계/, reason: "목표 기반 현금흐름 설계" },
  { serviceId: "tax", pattern: /세금|연말정산|양도소득|종합소득|증여세|상속세|배당소득세|세금 신고/, reason: "과세·공제·신고 준비" },
  { serviceId: "insurance", pattern: /보험|실손|보장|보험료|보험금 청구/, reason: "보장 중복·공백 진단" },
  { serviceId: "loan", pattern: /대출|대환|최저 금리|상환|DSR|대출 가능 금액/, reason: "금리·상환·승인 조건 계산" },
  { serviceId: "spending", pattern: /가계부|소비|예산|구독|캐시백|포인트|마일리지|소비 습관/, reason: "거래 분류·안심 예산 계산" },
  { serviceId: "assistant", pattern: /여행 가|여행 예산|여행 플랜|숙소 할인|귀국 후 정산|얼마 써도|복합 금융/, reason: "복합 요청 작업 오케스트레이션" },
  { serviceId: "agent", pattern: /자동 송금|자동 저축|자동 투자|자동 환전|자동 공과금|자동 대출 상환|자동 카드 결제|자동 구독 해지|자동 실행/, reason: "권한형 금융 액션 실행" },
  { serviceId: "risk", pattern: /이상 거래|피싱|스미싱|보이스피싱|탈취|도난|투자 사기|개인정보 유출|위험 경고/, reason: "사기·이상 신호 위험 판단" },
  { serviceId: "news", pattern: /경제 뉴스|기업 실적|정책 변화|금리 변화|원자재 분석|산업 동향|뉴스 요약|자산 영향/, reason: "시장 사건과 자산 영향 연결" },
  { serviceId: "business", pattern: /법인|기업금융|급여 관리|매출 예측|재고 자금|CFO|사업 현금흐름/, reason: "기업 운영현금·예측" },
  { serviceId: "contract", pattern: /약관|계약 분석|대출 계약|투자설명서|펀드 설명서|숨겨진 수수료|위험 조항/, reason: "문서 조항·비용 근거 추출" },
  { serviceId: "global", pattern: /해외송금|환율 예측|해외 카드|해외 세금|국가별 금융|해외 투자/, reason: "국가·통화·규정 비교" },
  { serviceId: "voice", pattern: /음성 송금|음성 투자|음성 조회|음성 예산|음성 금융|말로 조회/, reason: "음성 의도·금액 구조화" },
  { serviceId: "credit", pattern: /신용점수|점수 하락|점수 개선|대출 가능성/, reason: "설명 가능한 신용 변화 예측" },
  { serviceId: "life", pattern: /취업|이직|출산|라이프 이벤트|상황별 금융 계획/, reason: "생애 변화별 통합 로드맵" },
];

const dependencies: Partial<Record<ServiceId, ServiceId[]>> = {
  assistant: ["spending", "global", "insurance", "planning"],
  agent: ["risk", "assets"],
  invest: ["risk", "tax", "news"],
  planning: ["assets", "tax", "insurance"],
  life: ["planning", "tax", "insurance", "credit"],
  business: ["risk", "contract"],
  global: ["tax", "risk"],
  voice: ["risk", "agent"],
};

const normalized = (value: string) => value.toLowerCase().replace(/[\s()·,.!?-]/g, "");

const featureScore = (command: string, feature: string) => {
  const normalizedCommand = normalized(command);
  const normalizedFeature = normalized(feature.replace(/지원되는 경우|지원 환경에서/g, ""));
  if (normalizedFeature && normalizedCommand.includes(normalizedFeature)) {
    return normalizedFeature.length <= 2 ? 8 : 24;
  }
  const tokens = feature.split(/[\s·()]+/).filter((token) => token.length >= 2);
  return tokens.reduce((score, token) => score + (command.includes(token) ? 3 : 0), 0);
};

export function planCommand(command: string): SupervisorPlan {
  const trimmed = command.trim();
  const scores = new Map<ServiceId, { score: number; reasons: string[] }>(
    services.map((service) => [service.id, { score: 0, reasons: [] }]),
  );

  for (const rule of intentRules) {
    if (rule.pattern.test(trimmed)) {
      const current = scores.get(rule.serviceId)!;
      current.score += 9;
      current.reasons.push(rule.reason);
    }
  }

  for (const service of services) {
    const current = scores.get(service.id)!;
    for (const feature of service.features) {
      const score = featureScore(trimmed, feature);
      if (score > current.score) {
        current.score = score;
        current.reasons.unshift(`${feature} 의도 일치`);
      }
    }
  }

  const ranked = services
    .map((service) => ({ service, ...scores.get(service.id)! }))
    .sort((left, right) => right.score - left.score || left.service.index - right.service.index);
  const primary = ranked[0].score > 0 ? ranked[0].service : getService("assistant");
  const feature = primary.features
    .map((item) => ({ item, score: featureScore(trimmed, item) }))
    .sort((left, right) => right.score - left.score)[0];
  const selectedFeature = feature.score > 0 ? feature.item : primary.features[0];

  const specialistIds: ServiceId[] = [];
  for (const candidate of [...(dependencies[primary.id] ?? []), ...ranked.filter((item) => item.score > 0).map((item) => item.service.id)]) {
    if (candidate !== primary.id && !specialistIds.includes(candidate)) specialistIds.push(candidate);
  }

  const specialists = [primary.id, ...specialistIds.slice(0, 4)].map((serviceId, index) => {
    const service = getService(serviceId);
    const scored = scores.get(serviceId)!;
    return {
      serviceId,
      title: service.title,
      score: index === 0 ? Math.max(1, scored.score) : Math.max(1, scored.score || 4 - index),
      reason: index === 0 ? scored.reasons[0] ?? `${selectedFeature} 주관` : scored.reasons[0] ?? "주관 전문가의 충돌·제약 검토",
    };
  });

  return {
    command: trimmed,
    primaryServiceId: primary.id,
    feature: selectedFeature,
    specialists,
    steps: [
      `${primary.title}가 ${selectedFeature} 계산을 주관`,
      `${specialists.slice(1).map((item) => item.title).join(" · ") || "FIA Supervisor"}가 제약·충돌 검토`,
      "사용자 승인 전까지 외부 금융 실행 보류",
    ],
  };
}
