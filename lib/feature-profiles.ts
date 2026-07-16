import { services, type ServiceId } from "./catalog";

export type FeatureProfile = {
  key: string;
  signature: string;
  serviceId: ServiceId;
  feature: string;
  focus: string;
  inputLabel: string;
  inputHint: string;
  requiredInputs: string[];
  validation: string;
  executionGuard: string;
  sensitivityPercent: number;
};

type ServiceProfile = Omit<
  FeatureProfile,
  "key" | "signature" | "serviceId" | "feature" | "inputLabel" | "inputHint" | "sensitivityPercent"
> & {
  inputNoun: string;
  inputDescription: string;
};

const serviceProfiles: Record<ServiceId, ServiceProfile> = {
  assets: {
    focus: "소유권·잔액·평가시점과 중복 계좌를 일치시키는 통합",
    inputNoun: "평가 기준금액",
    inputDescription: "연결 또는 재평가할 자산·부채의 현재 금액",
    requiredInputs: ["기관·자산 식별자", "소유 구분", "평가 기준일"],
    validation: "동일 계좌 중복, 통화 환산, 자산·부채 부호를 교차검증",
    executionGuard: "읽기 전용 연결 토큰만 사용하고 수기 자산은 별도 표시",
  },
  invest: {
    focus: "기대수익과 최대손실 제약 안에서 위험조정 성과를 비교",
    inputNoun: "전략 적용금액",
    inputDescription: "선택 전략을 시뮬레이션할 투자 원금",
    requiredInputs: ["보유 종목·비중", "목표 수익률", "허용 최대손실"],
    validation: "수익률·변동성·집중도·환노출을 기준 포트폴리오와 비교",
    executionGuard: "투자 주문은 L4 재확인과 계좌별 상품 거래 가능 여부가 필요",
  },
  planning: {
    focus: "목표일·물가·현금흐름을 반영한 월별 필요자금 계산",
    inputNoun: "목표 필요금액",
    inputDescription: "목표 시점의 물가를 고려한 총 필요자금",
    requiredInputs: ["목표일", "현재 준비자금", "월 잉여현금"],
    validation: "비상자금과 다른 목표를 침해하지 않는지 현금흐름으로 검증",
    executionGuard: "자동저축은 잔액 하한과 월 한도를 지킬 때만 예약",
  },
  tax: {
    focus: "과세표준·공제·보유기간을 분리한 신고 전 추정",
    inputNoun: "과세 기준금액",
    inputDescription: "소득·차익·재산가액 중 선택 세목의 계산 기준",
    requiredInputs: ["거주자·납세자 구분", "취득·발생일", "공제 증빙"],
    validation: "세목, 귀속연도, 공제요건과 손익통산 가능 여부를 검증",
    executionGuard: "추정 결과는 신고가 아니며 제출 전 최신 법령과 공식 채널 확인이 필요",
  },
  insurance: {
    focus: "보장·면책·대기기간을 구조화해 중복과 공백을 동시 진단",
    inputNoun: "목표 보장금액",
    inputDescription: "가구 소득·부채를 고려한 필요 보장 수준",
    requiredInputs: ["피보험자·수익자", "기존 계약·특약", "직업·건강 고지"],
    validation: "보장기간, 면책, 갱신, 중복 지급 여부를 약관 근거와 대조",
    executionGuard: "기존 보험 해지는 대체보장 인수 완료 전 실행하지 않음",
  },
  loan: {
    focus: "금리·수수료·DSR을 포함한 총상환비용 비교",
    inputNoun: "비교 대출잔액",
    inputDescription: "상환·대환·한도 추정에 사용할 현재 원금",
    requiredInputs: ["현재 금리·상환방식", "남은 만기", "중도상환수수료"],
    validation: "월상환액, 총이자, DSR과 손익분기점을 후보 조건별 검증",
    executionGuard: "대출 실행은 금융기관 심사와 사용자 기관 인증 후에만 가능",
  },
  spending: {
    focus: "거래 분류와 목표저축 이후의 안전한 소비 여력 계산",
    inputNoun: "월 관리예산",
    inputDescription: "고정비·목표저축을 제외하고 관리할 소비 금액",
    requiredInputs: ["최근 거래내역", "고정비·구독", "예산 주기"],
    validation: "취소·할부·가족카드·이체를 중복 분류하지 않았는지 검증",
    executionGuard: "카드·구독 변경은 혜택 소멸과 위약금을 확인한 뒤 승인",
  },
  assistant: {
    focus: "한 문장을 예산·카드·환전·보험·정산 작업으로 오케스트레이션",
    inputNoun: "복합 계획 예산",
    inputDescription: "여행과 다단계 금융 계획에 사용할 총 한도",
    requiredInputs: ["목적·일정", "통화·국가", "우선순위"],
    validation: "전문가별 제안의 예산 중복과 일정·권한 충돌을 Supervisor가 검증",
    executionGuard: "각 외부 실행은 하나의 전체 승인과 별개로 단계별 재확인",
  },
  agent: {
    focus: "사용자 권한·한도·멱등키를 검사하는 승인형 자동 실행",
    inputNoun: "1회 실행금액",
    inputDescription: "기관 샌드박스에 전달할 단일 액션 금액",
    requiredInputs: ["출발·도착 계정", "실행 시각·주기", "1회·일간 한도"],
    validation: "대상, 금액, 권한, 기관 가용성과 중복 요청 키를 실행 직전 검증",
    executionGuard: "L4 매회 재확인, 1회 500만원 초과 차단, 결과 감사로그 필수",
  },
  risk: {
    focus: "거래·기기·메시지·수취인 신호를 결합한 설명 가능한 위험점수",
    inputNoun: "위험 노출금액",
    inputDescription: "의심 거래 또는 피해 가능 금액",
    requiredInputs: ["발생 채널·시각", "기기·발신 정보", "수취인·링크"],
    validation: "평소 패턴 편차와 알려진 사기 신호를 교차검증하고 오탐 가능성 표시",
    executionGuard: "탐지 결과만으로 범죄를 확정하지 않고 차단은 사용자·기관 확인 후 수행",
  },
  news: {
    focus: "시장 사건을 보유자산의 금리·환율·산업 민감도에 연결",
    inputNoun: "영향 노출금액",
    inputDescription: "뉴스 사건과 관련된 보유자산 평가액",
    requiredInputs: ["분석 주제·기간", "관련 보유자산", "기준 시나리오"],
    validation: "발행시각·원문 출처·사건시각을 확인하고 사실과 전망을 분리",
    executionGuard: "뉴스 요약만으로 자동 매매하지 않고 투자 실행은 별도 승인",
  },
  business: {
    focus: "법인 매출·비용·급여·재고를 연결한 운영 현금 예측",
    inputNoun: "사업 운영금액",
    inputDescription: "월 운영 또는 의사결정의 기준이 되는 법인 자금",
    requiredInputs: ["법인 계좌·장부", "매출채권·매입채무", "세금·급여 일정"],
    validation: "발생주의 장부와 실제 현금 입출금을 대사하고 시나리오 편차를 검증",
    executionGuard: "법인 집행 권한과 2인 승인 정책을 통과한 샌드박스 요청만 실행",
  },
  contract: {
    focus: "문서 조항에서 비용·의무·해지·위험을 근거 위치와 함께 추출",
    inputNoun: "계약 기준금액",
    inputDescription: "수수료와 최대 노출을 환산할 계약 원금",
    requiredInputs: ["원문 파일·버전", "계약 당사자", "효력·갱신일"],
    validation: "추출 문구를 페이지·조항 번호와 대조하고 누락·OCR 불확실성을 표시",
    executionGuard: "법률 자문을 대체하지 않으며 원문 없이 계약 변경을 실행하지 않음",
  },
  global: {
    focus: "환율 스프레드·수수료·도착시간·국가 규정을 합산 비교",
    inputNoun: "해외 금융금액",
    inputDescription: "환전·송금·해외 결제 또는 투자 예정 원화액",
    requiredInputs: ["출발·도착 국가", "통화·도착기한", "거주자·송금 목적"],
    validation: "환율 기준시각, 중개수수료, 한도와 국가별 보고의무를 검증",
    executionGuard: "제재·AML·기관 심사와 본인 인증 통과 전 해외송금을 실행하지 않음",
  },
  voice: {
    focus: "음성에서 의도·대상·금액을 분리하고 화면으로 재확인",
    inputNoun: "음성 인식금액",
    inputDescription: "음성 명령에서 추출하거나 확인할 금융 금액",
    requiredInputs: ["음성·텍스트 명령", "대상·목적", "화면 확인"],
    validation: "인식 신뢰도가 낮은 필드와 동음이의 숫자를 사용자에게 재질문",
    executionGuard: "음성만으로 금융 실행을 확정하지 않고 L4 화면·기관 인증 필수",
  },
  credit: {
    focus: "부채·한도 사용률·납부 이력 변화의 설명 가능한 점수 시뮬레이션",
    inputNoun: "신용 개선금액",
    inputDescription: "상환 또는 한도 조정으로 줄일 단기부채",
    requiredInputs: ["현재 점수·평가사", "부채·한도 사용률", "최근 조회·연체"],
    validation: "점수 영향 요인을 긍정·부정으로 분리하고 실제 평가사 차이를 표시",
    executionGuard: "예측값은 승인 보장이 아니며 신규 대출 신청은 별도 동의 필요",
  },
  life: {
    focus: "삶의 변화를 예산·세금·보험·신용·투자 작업으로 통합",
    inputNoun: "이벤트 준비자금",
    inputDescription: "선택한 생애 변화에 배정할 총 준비금",
    requiredInputs: ["이벤트 날짜", "가구·직업 변화", "현재 준비상태"],
    validation: "전문가별 자금 요구가 중복되지 않고 비상자금 하한을 지키는지 검증",
    executionGuard: "로드맵 생성 후 자동저축·보험·대출 등은 각각 별도 승인",
  },
};

const detailRules: Array<{ pattern: RegExp; detail: string; input: string }> = [
  { pattern: /통합|모든|전체/, detail: "전체 원천의 누락·중복·연결 최신성", input: "연결 범위·제외 기관" },
  { pattern: /은행|계좌|CMA|예금|적금/, detail: "계좌별 잔액·금리·만기·입출금 가능 여부", input: "기관·계좌·만기" },
  { pattern: /증권|주식|종목|ETF|채권|배당|펀드/, detail: "상품별 가격·수익·비용·유동성", input: "상품·수량·평균단가" },
  { pattern: /보험|보장|실손/, detail: "담보·특약·면책·갱신 구조", input: "계약번호·담보·피보험자" },
  { pattern: /연금|ISA|IRP|은퇴/, detail: "세제계좌 한도·인출시점·장기 현금흐름", input: "납입액·개시연령·수령기간" },
  { pattern: /외화|환율|환전|해외|송금/, detail: "통화별 환산·스프레드·국가 리스크", input: "통화·국가·기준환율" },
  { pattern: /가상자산|NFT|금·은|원자재/, detail: "시세 원천·보관·유동성·가격 변동", input: "자산명·수량·시세 원천" },
  { pattern: /부동산|주택|자동차/, detail: "시세·대출·세금·유지비의 총비용", input: "지역·모델·취득예정일" },
  { pattern: /대출|상환|금리|신용/, detail: "금리·만기·상환액·승인 가능성", input: "금리·만기·상환방식" },
  { pattern: /리스크|손실|사기|피싱|스미싱|도난|탈취|유출|이상/, detail: "손실 한도와 탐지 신호별 기여도", input: "발생 채널·신호·허용 손실" },
  { pattern: /전략|추천|퀀트|백테스트|시나리오|사이클|예측|분석/, detail: "기준·낙관·스트레스 시나리오의 비교", input: "비교 기준·기간·제약" },
  { pattern: /세|연말정산|신고/, detail: "귀속연도·과세표준·공제·신고 증빙", input: "귀속연도·세목·증빙" },
  { pattern: /예산|소비|가계부|구독|카드|캐시백|포인트|마일리지/, detail: "거래분류·혜택·예산 소진 속도", input: "결제수단·기간·혜택 우선순위" },
  { pattern: /현금흐름|자금|급여|비용|매출|재고|CFO|창업/, detail: "유입·유출 시점과 현금 부족 구간", input: "월 유입·유출·지급 일정" },
  { pattern: /계약|약관|설명서|수수료|조항/, detail: "원문 근거·비용·의무·해지 조건", input: "문서·페이지·효력일" },
  { pattern: /음성/, detail: "인식 의도·개체·숫자와 재확인 필요 필드", input: "명령 문장·대상·금액" },
  { pattern: /취업|이직|결혼|출산|유학|여행|귀국/, detail: "이벤트 전후 소득·비용·보장 변화", input: "일정·가구·소득 변화" },
  { pattern: /자동|납부|해지|실행/, detail: "실행 조건·주기·한도·취소 가능 시점", input: "실행일·주기·중지 조건" },
];

const stableHash = (value: string) =>
  [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 17);

export const allFeatureProfiles: FeatureProfile[] = services.flatMap((service) =>
  service.features.map((feature, featureIndex) => {
    const base = serviceProfiles[service.id];
    const detail = detailRules.find((rule) => rule.pattern.test(feature));
    const ordinal = featureIndex + 1;
    const signature = `FIA-${String(service.index).padStart(2, "0")}-${String(ordinal).padStart(3, "0")}`;
    return {
      key: `${service.id}:${feature}`,
      signature,
      serviceId: service.id,
      feature,
      focus: `${base.focus}; ${detail?.detail ?? `${feature} 전용 결과와 근거`} 검토`,
      inputLabel: `${feature} ${base.inputNoun}`,
      inputHint: `${base.inputDescription}. 추가 확인: ${detail?.input ?? feature}`,
      requiredInputs: [`대상 기능: ${feature}`, detail?.input ?? "분석 목적·우선순위", ...base.requiredInputs],
      validation: `${feature}: ${base.validation}`,
      executionGuard: base.executionGuard,
      sensitivityPercent: Number((0.6 + (stableHash(`${service.id}:${feature}`) % 85) / 10).toFixed(1)),
    };
  }),
);

const profilesByKey = new Map(allFeatureProfiles.map((profile) => [profile.key, profile]));

export function getFeatureProfile(serviceId: ServiceId, feature: string): FeatureProfile {
  const exact = profilesByKey.get(`${serviceId}:${feature}`);
  if (exact) return exact;

  const fallback = allFeatureProfiles.find((profile) => profile.serviceId === serviceId);
  if (!fallback) throw new Error(`Unknown FIA service: ${serviceId}`);
  return fallback;
}
