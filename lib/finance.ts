import type { ServiceId } from "./catalog";
import { getFeatureProfile } from "./feature-profiles";

export type Metric = {
  label: string;
  value: string;
  delta?: string;
  tone?: "positive" | "warning" | "neutral" | "danger";
};

export type AnalysisResult = {
  headline: string;
  summary: string;
  metrics: Metric[];
  steps: string[];
  assumptions: string[];
  confidence: number;
  risk: "낮음" | "보통" | "높음";
  source: string;
  sourceTime: string;
};

export type AssetAccount = {
  id: string;
  category: string;
  institution: string;
  name: string;
  value: number;
  type: "asset" | "liability";
  change: number;
  source: string;
  updatedAt: string;
};

export const assetAccounts: AssetAccount[] = [
  { id: "a1", category: "은행", institution: "FIA 데모은행", name: "생활비 계좌", value: 18400000, type: "asset", change: 0, source: "오픈뱅킹 샌드박스", updatedAt: "오늘 09:41" },
  { id: "a2", category: "예·적금", institution: "FIA 데모은행", name: "주택 준비 적금", value: 32600000, type: "asset", change: 0.3, source: "마이데이터 샌드박스", updatedAt: "오늘 09:41" },
  { id: "a3", category: "국내증권", institution: "FIA 데모증권", name: "국내 주식·ETF", value: 86300000, type: "asset", change: 1.8, source: "증권 샌드박스", updatedAt: "오늘 15:30" },
  { id: "a4", category: "해외증권", institution: "FIA 글로벌증권", name: "미국 주식·ETF", value: 118900000, type: "asset", change: -0.7, source: "해외증권 샌드박스", updatedAt: "오늘 06:10" },
  { id: "a5", category: "연금", institution: "FIA 연금", name: "IRP·연금저축", value: 62900000, type: "asset", change: 0.4, source: "마이데이터 샌드박스", updatedAt: "어제 23:50" },
  { id: "a6", category: "ISA/CMA", institution: "FIA 데모증권", name: "ISA·CMA", value: 27400000, type: "asset", change: 0.2, source: "증권 샌드박스", updatedAt: "오늘 15:30" },
  { id: "a7", category: "외화", institution: "FIA 외화은행", name: "USD·JPY", value: 9800000, type: "asset", change: 0.9, source: "외환 샌드박스", updatedAt: "오늘 16:00" },
  { id: "a8", category: "가상자산", institution: "FIA 가상자산", name: "BTC·ETH", value: 17300000, type: "asset", change: 2.7, source: "거래소 샌드박스", updatedAt: "오늘 16:01" },
  { id: "a9", category: "부동산", institution: "사용자 입력", name: "주거용 부동산", value: 510000000, type: "asset", change: 0, source: "사용자 평가", updatedAt: "2026.07.01" },
  { id: "a10", category: "자동차", institution: "사용자 입력", name: "자가용", value: 24500000, type: "asset", change: -1.1, source: "공공시세 샌드박스", updatedAt: "2026.07.10" },
  { id: "a11", category: "금·은", institution: "FIA 금고", name: "금·은 보유", value: 11600000, type: "asset", change: 0.6, source: "원자재 시세 샌드박스", updatedAt: "오늘 15:55" },
  { id: "a12", category: "NFT", institution: "지원 지갑", name: "NFT 컬렉션", value: 1900000, type: "asset", change: -3.8, source: "지갑·마켓 샌드박스", updatedAt: "오늘 15:45" },
  { id: "l1", category: "주택대출", institution: "FIA 데모은행", name: "주택담보대출", value: 214000000, type: "liability", change: -0.2, source: "마이데이터 샌드박스", updatedAt: "오늘 09:41" },
  { id: "l2", category: "신용대출", institution: "FIA 데모은행", name: "직장인 신용대출", value: 19800000, type: "liability", change: -1.5, source: "마이데이터 샌드박스", updatedAt: "오늘 09:41" },
  { id: "l3", category: "카드", institution: "FIA 데모카드", name: "이번 달 결제 예정", value: 2840000, type: "liability", change: 4.2, source: "카드 샌드박스", updatedAt: "오늘 13:20" },
  { id: "b1", category: "기업계좌", institution: "FIA 기업은행", name: "개인사업자 운영계좌", value: 23600000, type: "asset", change: -2.3, source: "법인 오픈뱅킹 샌드박스", updatedAt: "오늘 09:38" },
];

export const totalAssets = assetAccounts
  .filter((account) => account.type === "asset")
  .reduce((sum, account) => sum + account.value, 0);

export const totalLiabilities = assetAccounts
  .filter((account) => account.type === "liability")
  .reduce((sum, account) => sum + account.value, 0);

export const netWorth = totalAssets - totalLiabilities;

const krw = (value: number, compact = false) => {
  if (compact && Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억원`;
  }
  if (compact && Math.abs(value) >= 10000) {
    return `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`;
  }
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
};

const pct = (value: number) => `${value.toFixed(1)}%`;

const payment = (principal: number, annualRate: number, months: number) => {
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / months;
  return (
    (principal * monthlyRate * (1 + monthlyRate) ** months) /
    ((1 + monthlyRate) ** months - 1)
  );
};

const futureMonthlySaving = (
  target: number,
  years: number,
  annualReturn: number,
) => {
  const months = Math.max(1, years * 12);
  const monthlyRate = annualReturn / 12;
  if (monthlyRate === 0) return target / months;
  return target / (((1 + monthlyRate) ** months - 1) / monthlyRate);
};

const sourceTime = "2026.07.16 16:05 KST";

function analyzeBaseService(
  id: ServiceId,
  feature: string,
  amount: number,
  horizonYears: number,
  riskTolerance: number,
): AnalysisResult {
  const years = Math.max(1, horizonYears);
  const risk = Math.max(1, Math.min(5, riskTolerance));
  const shared = {
    sourceTime,
    confidence: 88,
    risk: "보통" as const,
  };

  switch (id) {
    case "assets": {
      const projectedNetWorth = netWorth + amount;
      const freshness = assetAccounts.filter((item) => item.updatedAt.includes("오늘")).length;
      return {
        ...shared,
        headline: `${feature} 반영 시 순자산이 ${krw(projectedNetWorth, true)}입니다`,
        summary: "15개 금융·실물·디지털 자산 원천과 3개 부채 원천을 같은 기준으로 환산했습니다. 수기 평가 자산은 별도 최신성 경고를 유지합니다.",
        metrics: [
          { label: "통합 순자산", value: krw(projectedNetWorth, true), delta: `+${krw(amount, true)}`, tone: "positive" },
          { label: "총자산", value: krw(totalAssets + amount, true), tone: "neutral" },
          { label: "부채비율", value: pct((totalLiabilities / (totalAssets + amount)) * 100), delta: "안정 범위", tone: "positive" },
          { label: "오늘 갱신", value: `${freshness}/${assetAccounts.length}개`, delta: "수기자산 2개", tone: "warning" },
        ],
        steps: ["선택 자산의 소유·평가기준 확인", "중복 계좌 식별자 병합", "새 순자산 스냅샷과 기준시각 저장"],
        assumptions: ["부동산·차량은 최근 사용자 평가액", "외화·해외자산은 샌드박스 기준환율", "실제 기관 연결 전 합성 데이터 사용"],
        source: "마이데이터·오픈뱅킹·사용자 입력 샌드박스",
      };
    }
    case "invest": {
      const expectedReturn = 3.1 + risk * 1.12;
      const volatility = 4.8 + risk * 2.45;
      const futureValue = amount * (1 + expectedReturn / 100) ** years;
      const maxDrawdown = volatility * 1.35;
      return {
        ...shared,
        confidence: 84,
        risk: risk >= 4 ? "높음" : risk <= 2 ? "낮음" : "보통",
        headline: `${feature} 기준 ${years}년 예상범위 ${krw(futureValue * 0.78, true)}~${krw(futureValue * 1.18, true)}`,
        summary: "주식·ETF·채권·현금·외화 노출을 통합하고 목표수익률과 최대손실 제약을 함께 적용한 샌드박스 분석입니다.",
        metrics: [
          { label: "기대 연수익", value: pct(expectedReturn), delta: `위험 ${risk}/5`, tone: "positive" },
          { label: "예상 변동성", value: pct(volatility), tone: "warning" },
          { label: "스트레스 손실", value: `-${pct(maxDrawdown)}`, delta: krw(amount * maxDrawdown / 100, true), tone: "danger" },
          { label: `${years}년 기대가치`, value: krw(futureValue, true), tone: "positive" },
        ],
        steps: ["현금·채권 32% 방어자산 유지", "국가·통화·산업 집중도 25% 이내 제한", "월 1회 또는 ±5% 이탈 시 리밸런싱"],
        assumptions: ["과거 수익률이 미래를 보장하지 않음", "세금·수수료 전 시뮬레이션", "옵션·선물은 지원 계좌에서만 실행"],
        source: "FIA 합성 시장데이터·포트폴리오 계산 엔진 v0.1",
      };
    }
    case "planning": {
      const monthly = futureMonthlySaving(amount, years, 0.045);
      const currentSurplus = 2380000;
      const probability = Math.max(18, Math.min(96, 72 + (currentSurplus - monthly) / 60000));
      return {
        ...shared,
        headline: `${feature} 목표를 위해 월 ${krw(monthly, true)}이 필요합니다`,
        summary: "현재 잉여현금, 투자자산, 비상자금과 다른 생애 목표를 함께 반영해 월 실행액을 계산했습니다.",
        metrics: [
          { label: "목표 금액", value: krw(amount, true), tone: "neutral" },
          { label: "필요 월저축", value: krw(monthly, true), delta: `${years}년`, tone: "warning" },
          { label: "현재 월잉여", value: krw(currentSurplus, true), tone: "positive" },
          { label: "달성 확률", value: pct(probability), delta: "기준 시나리오", tone: probability > 70 ? "positive" : "warning" },
        ],
        steps: ["비상자금 6개월분은 목표자금에서 제외", "급여일 다음 날 목표계좌 자동저축", "분기마다 소득·물가·수익률 가정 재검토"],
        assumptions: ["연 4.5% 명목수익률", "물가상승률 2.2%", "기존 목표 우선순위 유지"],
        source: "FIA 현금흐름·목표 시뮬레이션 엔진 v0.1",
      };
    }
    case "tax": {
      const estimatedRate = feature.includes("증여") || feature.includes("상속") ? 0.1 : feature.includes("배당") ? 0.154 : 0.18;
      const grossTax = amount * estimatedRate;
      const optimizedTax = grossTax * 0.76;
      return {
        ...shared,
        confidence: 79,
        headline: `${feature} 사전 추정세액은 ${krw(grossTax, true)}입니다`,
        summary: "선택한 세목의 단순 가정을 적용한 준비용 추정치입니다. 실제 신고 전에는 최신 법령과 공제요건을 공식 채널에서 재확인합니다.",
        metrics: [
          { label: "추정세액", value: krw(grossTax, true), tone: "warning" },
          { label: "절세 검토 후", value: krw(optimizedTax, true), delta: `-${krw(grossTax - optimizedTax, true)}`, tone: "positive" },
          { label: "적용 가정세율", value: pct(estimatedRate * 100), tone: "neutral" },
          { label: "준비서류", value: "6개", delta: "2개 미확인", tone: "warning" },
        ],
        steps: ["거래·소득·보유기간 증빙 연결", "공제·손익통산 가능항목 확인", "공식 신고 전 전문가 또는 세무 채널 재검토"],
        assumptions: ["누진세율·지방세는 단순화", "국가·거주자 지위에 따라 달라질 수 있음", "FIA가 실제 신고를 대신하지 않음"],
        source: "FIA 세금 샌드박스 규칙팩 2026.07",
      };
    }
    case "insurance": {
      const currentCoverage = 126000000;
      const gap = Math.max(0, amount - currentCoverage);
      const duplicatePremium = 78000;
      return {
        ...shared,
        headline: `${feature} 결과 보장 공백은 ${krw(gap, true)}입니다`,
        summary: "실손·상해·질병·사망·자동차 보장을 가구 부채와 소득대체 필요액에 맞춰 중복과 부족을 동시에 계산했습니다.",
        metrics: [
          { label: "필요 보장", value: krw(amount, true), tone: "neutral" },
          { label: "현재 보장", value: krw(currentCoverage, true), tone: "warning" },
          { label: "보장 공백", value: krw(gap, true), tone: gap > 0 ? "danger" : "positive" },
          { label: "중복 보험료", value: `${krw(duplicatePremium)}/월`, delta: "검토 가능", tone: "positive" },
        ],
        steps: ["약관별 보장·면책·대기기간 구조화", "중복 특약 3개 우선 비교", "해지 전 대체보장 인수 가능 여부 확인"],
        assumptions: ["샌드박스 보험계약 5건", "의료·직업 위험은 사용자 확인 필요", "보험료는 최종 견적이 아님"],
        source: "보험계약·약관 샌드박스 분석기 v0.1",
      };
    }
    case "loan": {
      const currentRate = 0.052;
      const candidateRate = 0.041;
      const months = years * 12;
      const currentPayment = payment(amount, currentRate / 12 * 12, months);
      const candidatePayment = payment(amount, candidateRate / 12 * 12, months);
      const saving = Math.max(0, (currentPayment - candidatePayment) * months);
      return {
        ...shared,
        headline: `${feature} 적용 시 총이자 약 ${krw(saving, true)}을 줄일 수 있습니다`,
        summary: "현재 잔액과 남은 기간에 원리금균등상환을 적용해 대환·조기상환 효과를 비교했습니다.",
        metrics: [
          { label: "현재 월상환", value: krw(currentPayment, true), tone: "warning" },
          { label: "비교 월상환", value: krw(candidatePayment, true), delta: `-${krw(currentPayment - candidatePayment, true)}`, tone: "positive" },
          { label: "가정 금리", value: "5.2% → 4.1%", tone: "positive" },
          { label: "총 절감액", value: krw(saving, true), tone: "positive" },
        ],
        steps: ["중도상환수수료와 인지비용 확인", "DSR·신용점수 변화 시나리오 계산", "등록 비교채널에서 사전심사 후 최종 조건 확인"],
        assumptions: ["원리금균등상환", `남은 기간 ${years}년`, "실제 승인은 금융기관 심사 필요"],
        source: "FIA 대출 상환 계산 엔진 v0.1",
      };
    }
    case "spending": {
      const fixedCost = 1820000;
      const variableSpent = 1380000;
      const safeToSpend = Math.max(0, amount - variableSpent);
      const subscriptions = 142900;
      return {
        ...shared,
        headline: `${feature} 기준 이번 달 안심 지출 가능액은 ${krw(safeToSpend, true)}입니다`,
        summary: "고정비·목표저축·카드 승인 예정액을 먼저 제외하고 소비 가능한 금액을 계산했습니다.",
        metrics: [
          { label: "관리 예산", value: krw(amount, true), tone: "neutral" },
          { label: "사용 금액", value: krw(variableSpent, true), delta: pct((variableSpent / amount) * 100), tone: "warning" },
          { label: "안심 지출", value: krw(safeToSpend, true), tone: "positive" },
          { label: "월 구독", value: krw(subscriptions, true), delta: "3건 정리 후보", tone: "warning" },
        ],
        steps: ["반복거래에서 구독 11건 식별", "카드·캐시백·마일리지 우선순위 적용", "주간 예산 초과 시 자동 알림"],
        assumptions: [`고정비 ${krw(fixedCost, true)} 별도`, "카드 승인취소는 다음 갱신 때 반영", "포인트 가치는 현금등가로 단순화"],
        source: "거래분류·예산 샌드박스 엔진 v0.1",
      };
    }
    case "assistant": {
      const monthlySurplus = 2380000;
      const buffer = 850000;
      const available = Math.max(0, monthlySurplus * 2 - buffer);
      const fxSaving = amount * 0.013;
      return {
        ...shared,
        headline: `${feature} 플랜: 최대 ${krw(Math.min(amount, available), true)}까지 목표를 해치지 않습니다`,
        summary: "예산·카드·환전·보험·할인·정산을 6개 전문가가 하나의 여행 작업으로 조정했습니다.",
        metrics: [
          { label: "안심 여행예산", value: krw(available, true), tone: available >= amount ? "positive" : "warning" },
          { label: "입력 예산", value: krw(amount, true), tone: "neutral" },
          { label: "환전 절감", value: krw(fxSaving, true), delta: "경로 비교", tone: "positive" },
          { label: "연결 작업", value: "6개", delta: "승인 전", tone: "warning" },
        ],
        steps: ["소비 AI가 안심 예산 확정", "카드·환전·여행보험 후보를 비용순 비교", "귀국 다음 날 외화·카드·현금 자동 정산"],
        assumptions: ["다음 두 달 소득 유지", "비상자금 미사용", "숙소·보험은 제휴 샌드박스 가격"],
        source: "FIA Supervisor 다중 에이전트 계획 v0.1",
      };
    }
    case "agent": {
      const dailyLimit = Math.min(amount * 3, 5000000);
      return {
        ...shared,
        risk: amount > 1000000 ? "높음" : "보통",
        headline: `${feature}을 1회 ${krw(amount, true)} 한도로 샌드박스 실행할 수 있습니다`,
        summary: "기관 어댑터, 사용자 권한, 1회·일간 한도, 재확인과 중복실행 방지를 모두 통과해야 실행됩니다.",
        metrics: [
          { label: "1회 한도", value: krw(amount, true), tone: "warning" },
          { label: "일간 한도", value: krw(dailyLimit, true), tone: "neutral" },
          { label: "필요 권한", value: "L4 기관 인증", tone: "danger" },
          { label: "어댑터", value: "Sandbox v1", delta: "실거래 없음", tone: "positive" },
        ],
        steps: ["액션 스키마·수취인·금액 검증", "사용자 재확인 및 기관 샌드박스 인증", "성공·실패·취소 결과를 감사로그에 기록"],
        assumptions: ["실제 계좌·카드·주문 API 미연결", "OTP·비밀번호를 FIA가 보관하지 않음", "동일 요청 키로 중복실행 차단"],
        source: "FIA Action Policy Engine Sandbox v0.1",
      };
    }
    case "risk": {
      const amountScore = Math.min(42, Math.log10(Math.max(amount, 1)) * 5.8);
      const anomaly = Math.round(Math.min(99, 28 + amountScore + risk * 6));
      return {
        ...shared,
        confidence: 93,
        risk: anomaly >= 70 ? "높음" : anomaly >= 45 ? "보통" : "낮음",
        headline: `${feature} 위험점수 ${anomaly}/100 — ${anomaly >= 70 ? "즉시 확인이 필요합니다" : "추가 인증을 권장합니다"}`,
        summary: "평소 거래 패턴, 신규 기기, 수취인, 메시지 링크, 금액 편차를 결합한 합성 탐지 결과입니다.",
        metrics: [
          { label: "위험점수", value: `${anomaly}/100`, tone: anomaly >= 70 ? "danger" : "warning" },
          { label: "노출 금액", value: krw(amount, true), tone: "neutral" },
          { label: "탐지 신호", value: "4개", delta: "신규기기 포함", tone: "warning" },
          { label: "모델 확신도", value: "93%", tone: "positive" },
        ],
        steps: ["거래를 10분 보류하고 본인활동 확인", "의심 링크·발신번호·수취인 교차검증", "필요 시 기관 신고·차단 절차 안내"],
        assumptions: ["합성 이상거래 데이터", "경보가 범죄를 확정하지 않음", "실제 차단은 기관 인증 필요"],
        source: "FIA Guardian 합성 이상탐지 모델 v0.1",
      };
    }
    case "news": {
      const downside = amount * (0.015 + risk * 0.006);
      const upside = amount * (0.012 + risk * 0.004);
      return {
        ...shared,
        confidence: 81,
        headline: `${feature} 이벤트가 관련 자산에 미치는 1개월 영향은 -${krw(downside, true)}~+${krw(upside, true)}입니다`,
        summary: "금리·환율·원자재·산업 노출을 보유자산과 연결한 시나리오이며 뉴스 사실과 모델 해석을 분리해 표시합니다.",
        metrics: [
          { label: "하락 시나리오", value: `-${krw(downside, true)}`, tone: "danger" },
          { label: "기준 시나리오", value: "+0.4%", tone: "neutral" },
          { label: "상승 시나리오", value: `+${krw(upside, true)}`, tone: "positive" },
          { label: "영향 자산", value: "7개", delta: "환율 3개", tone: "warning" },
        ],
        steps: ["사실·전망·의견 문장을 분리", "보유자산·대출·목표에 영향 매핑", "조건 충족 시 알림하고 즉시매매는 제한"],
        assumptions: ["합성 뉴스 피드", "1개월 민감도 기반", "뉴스만으로 자동 투자하지 않음"],
        source: "합성 금융뉴스 RAG·자산 민감도 엔진 v0.1",
      };
    }
    case "business": {
      const cash = 23600000;
      const receivables = 78000000;
      const runway = (cash + receivables * 0.72) / Math.max(amount, 1);
      const nextMonth = 92000000 - amount;
      return {
        ...shared,
        headline: `${feature} 결과 보수적 현금 런웨이는 ${runway.toFixed(1)}개월입니다`,
        summary: "법인계좌, 매출채권, 급여, 재고·매입 일정을 개인 자산과 분리된 기업 장부에서 예측했습니다.",
        metrics: [
          { label: "현금 런웨이", value: `${runway.toFixed(1)}개월`, tone: runway < 3 ? "danger" : "positive" },
          { label: "월 운영비", value: krw(amount, true), tone: "warning" },
          { label: "다음달 순현금", value: krw(nextMonth, true), tone: nextMonth >= 0 ? "positive" : "danger" },
          { label: "미수금 회수율", value: "72%", delta: "보수적", tone: "neutral" },
        ],
        steps: ["급여·임차료 등 필수지출 우선 잠금", "재고 발주를 회전율 기준으로 12% 조정", "런웨이 3개월 미만 시 CFO 경보"],
        assumptions: ["매출채권 회수율 72%", "다음달 매출 9,200만원", "개인·법인 계좌 권한 완전 분리"],
        source: "FIA CFO 합성 ERP·법인계좌 예측 v0.1",
      };
    }
    case "contract": {
      const fee = amount * 0.0135;
      const earlyExit = amount * 0.008;
      return {
        ...shared,
        confidence: 91,
        headline: `${feature}에서 연간 최대 ${krw(fee, true)}의 명시·숨은 비용을 찾았습니다`,
        summary: "수수료, 자동갱신, 중도해지, 면책, 손실가능 조항을 추출하고 원문 위치와 확인 질문을 연결했습니다.",
        metrics: [
          { label: "예상 연비용", value: krw(fee, true), tone: "warning" },
          { label: "중도해지 비용", value: krw(earlyExit, true), tone: "danger" },
          { label: "위험 조항", value: "5개", delta: "높음 2개", tone: "danger" },
          { label: "근거 위치", value: "100% 연결", tone: "positive" },
        ],
        steps: ["표·각주·별첨까지 텍스트 구조화", "비용·권리제한·면책 조항 우선 표시", "가입·서명 전 확인 질문 7개 생성"],
        assumptions: ["샘플 문서 기준", "법률 자문이 아닌 정보 정리", "원문과 추출값을 함께 검토"],
        source: "FIA Document RAG 샌드박스 v0.1",
      };
    }
    case "global": {
      const bankFee = amount * 0.018 + 18000;
      const optimizedFee = amount * 0.0065 + 5000;
      const saving = bankFee - optimizedFee;
      return {
        ...shared,
        headline: `${feature} 최적 경로로 비용을 약 ${krw(saving, true)} 줄일 수 있습니다`,
        summary: "환율 스프레드, 송금 수수료, 중개은행 비용, 해외카드 혜택과 국가별 규정 안내를 합산했습니다.",
        metrics: [
          { label: "일반 경로 비용", value: krw(bankFee, true), tone: "warning" },
          { label: "최적 경로 비용", value: krw(optimizedFee, true), tone: "positive" },
          { label: "예상 절감", value: krw(saving, true), tone: "positive" },
          { label: "환율 변동범위", value: "±2.4%", delta: "30일", tone: "warning" },
        ],
        steps: ["목적국·통화·도착기한별 경로 비교", "세법상 거주자·보고의무 확인", "사용자 승인 후 샌드박스 환전·송금 예약"],
        assumptions: ["USD 기준 샌드박스 환율", "국가별 세금은 기초정보", "실제 송금은 기관 심사·인증 필요"],
        source: "FIA FX·송금 샌드박스 엔진 v0.1",
      };
    }
    case "voice": {
      return {
        ...shared,
        risk: "높음",
        headline: `${feature} 명령을 ${krw(amount, true)} 기준으로 구조화했습니다`,
        summary: "음성 인식 결과에서 금액·대상·목적을 분리했습니다. 금융 실행은 화면에서 다시 확인해야 하며 음성만으로 확정하지 않습니다.",
        metrics: [
          { label: "인식 금액", value: krw(amount, true), tone: "warning" },
          { label: "의도 분류", value: feature, tone: "neutral" },
          { label: "인식 신뢰도", value: "94%", tone: "positive" },
          { label: "최종 확인", value: "화면 필수", tone: "danger" },
        ],
        steps: ["음성을 텍스트와 실행 스키마로 변환", "수취인·금액·상품을 화면에 강조", "생체·기관 인증 후에만 샌드박스 실행"],
        assumptions: ["브라우저 음성 API 지원 시 작동", "민감 음성 원본은 기본 저장하지 않음", "오인식 가능성을 전제로 화면 재확인"],
        source: "브라우저 음성 인식·FIA 의도분류 샌드박스 v0.1",
      };
    }
    case "credit": {
      const currentScore = 872;
      const pointGain = Math.round(Math.min(42, 7 + amount / 500000));
      const projected = Math.min(1000, currentScore + pointGain);
      const approval = Math.min(96, 58 + pointGain * 0.9);
      return {
        ...shared,
        headline: `${feature} 실행 3개월 후 신용점수 예상범위는 ${projected - 8}~${projected + 5}점입니다`,
        summary: "단기부채 상환, 한도 사용률, 연체이력, 조회 빈도 등 설명 가능한 요인으로 변화를 추정했습니다.",
        metrics: [
          { label: "현재 점수", value: `${currentScore}점`, tone: "neutral" },
          { label: "예상 점수", value: `${projected}점`, delta: `+${pointGain}`, tone: "positive" },
          { label: "대출 가능성", value: pct(approval), tone: "positive" },
          { label: "한도 사용률", value: "34% → 22%", tone: "positive" },
        ],
        steps: ["고금리·단기부채부터 계획 상환", "카드 한도 사용률 30% 이내 유지", "불필요한 신규 대출조회 간격 관리"],
        assumptions: ["신용평가사 실제 점수와 다를 수 있음", "3개월 정상 납부 유지", "점수 보장을 의미하지 않음"],
        source: "FIA 설명가능 신용 시뮬레이터 v0.1",
      };
    }
    case "life": {
      const reserve = amount * 0.22;
      const monthly = futureMonthlySaving(amount - reserve, years, 0.035);
      return {
        ...shared,
        headline: `${feature} 준비를 위해 비상예비금 ${krw(reserve, true)}과 월 ${krw(monthly, true)}을 배정합니다`,
        summary: "선택한 라이프 이벤트를 예산·세금·보험·대출·투자·신용·문서 작업으로 분해해 하나의 로드맵으로 만들었습니다.",
        metrics: [
          { label: "준비자금", value: krw(amount, true), tone: "neutral" },
          { label: "예비금", value: krw(reserve, true), tone: "warning" },
          { label: "필요 월저축", value: krw(monthly, true), tone: "warning" },
          { label: "전문가 작업", value: "7개", delta: "충돌검사 완료", tone: "positive" },
        ],
        steps: ["이벤트 날짜와 가족·직업 변화 확인", "재무설계·세금·보험·신용 작업 병렬 생성", "월별 체크포인트와 승인형 액션 예약"],
        assumptions: [`준비기간 ${years}년`, "예비금 22%", "개인 상황 변화 시 자동 재계산"],
        source: "FIA Life Event Orchestrator v0.1",
      };
    }
  }
}

export function analyzeService(
  id: ServiceId,
  feature: string,
  amount: number,
  horizonYears: number,
  riskTolerance: number,
): AnalysisResult {
  const result = analyzeBaseService(id, feature, amount, horizonYears, riskTolerance);
  const profile = getFeatureProfile(id, feature);
  const scenarioImpact = Math.round(Math.abs(amount) * (profile.sensitivityPercent / 100));

  return {
    ...result,
    summary: `${result.summary} ${profile.focus}을(를) 이 기능의 전용 검증축으로 적용했습니다.`,
    metrics: [
      ...result.metrics,
      {
        label: `${feature} 민감도`,
        value: `${profile.sensitivityPercent.toFixed(1)}%`,
        delta: `${krw(scenarioImpact, true)} 영향범위`,
        tone: profile.sensitivityPercent >= 7 ? "warning" : "neutral",
      },
    ],
    steps: [`${profile.requiredInputs.slice(0, 3).join(" · ")} 확인`, ...result.steps],
    assumptions: [...result.assumptions, profile.executionGuard],
    source: `${result.source} · ${profile.signature}`,
  };
}

export const formatKrw = krw;
