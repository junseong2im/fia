# FIA — Financial Intelligence Agent

17개 금융 AI 전문가와 155개 하위 기능을 하나의 금융 디지털 트윈, 계산 엔진, 권한 정책과 샌드박스 실행 흐름으로 연결한 Full-scope 웹 MVP입니다.

## 현재 구현

- 홈 금융 브리핑과 실시간에 가까운 순자산 대시보드
- 은행·증권·연금·외화·가상자산·부동산·차량·귀금속·NFT·부채·기업계좌 합성 데이터
- 17개 서비스와 155개 하위 기능 탐색
- 155개 기능별 고유 입력 조건·검증 기준·결과 시그니처
- 자연어·음성 질문의 17개 전문가 Supervisor 라우팅과 협업 계획
- 서비스별 재현 가능한 계산 결과, 근거, 가정, 신뢰도와 기준시각
- L0~L4 권한, 사용자 재확인, 1회 한도 차단과 샌드박스 액션
- 서버 기관 어댑터 기반 성공·실패·취소·멱등 실행과 D1 감사로그
- PDF·DOCX·TXT 본문 추출, 비용·위험 표현 탐지, R2 원문·D1 메타데이터 저장
- 사용자 식별 해시별 데이터 분리, 서버 카탈로그 재검증, 보안 응답 헤더
- 데스크톱·태블릿·모바일 반응형 UI

세부 범위와 남은 검증 게이트는 [docs/FULL_SCOPE_SPEC.md](docs/FULL_SCOPE_SPEC.md)에 있습니다.

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```powershell
npm install
npm run build
Get-ChildItem drizzle\*.sql | Sort-Object Name | ForEach-Object { npx wrangler d1 execute site-creator-d1 --local --file $_.FullName --config dist/server/wrangler.json --persist-to .wrangler/state }
npm run dev
```

개발 서버가 출력한 Local URL을 엽니다. 기본 포트가 사용 중이면 다음 포트를 자동 선택합니다.

## 검증

```powershell
npx tsc --noEmit
npm run lint
npm test
npm audit --omit=dev
```

`npm test`는 배포 빌드 후 다음을 검사합니다.

- 스타터 화면이 제거되고 FIA 제품 화면이 연결됐는지
- 서비스 17개와 하위 기능 155개가 정확히 유지되는지
- 155개 기능 프로필·결과가 고유하고 같은 입력에서 재현되는지
- 17개 대표 자연어 요청과 복합 여행 요청의 Supervisor 라우팅이 맞는지
- 샌드박스 성공·동의 없음·한도 초과·기관 실패·취소가 재현되는지
- TXT·DOCX·텍스트형 PDF의 실제 본문 추출이 되는지
- D1·R2·사용자 분리·보안 헤더가 배포 산출물에 포함되는지

상세 시나리오와 실제 확인값은 [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md), 상용 기관 연동 경계는 [docs/ADAPTER_CONTRACT.md](docs/ADAPTER_CONTRACT.md)에 있습니다.

## 저장 구조

- D1 `action_requests`: 멱등키, 서버 결정 서비스·기능·권한, 어댑터 결과코드, 외부 참조번호
- D1 `audit_logs`: 성공·실패·취소의 사용자별 불변 실행 기록
- D1 `documents`: 문서 소유자, SHA-256, 추출 길이, 분석 신호, R2 객체 키
- R2 `DOCUMENTS`: 최대 10MB의 PDF·DOCX·TXT 원문
- 사용자 구분: 호스팅이 전달한 인증 이메일을 SHA-256 기반 내부 소유자 ID로 변환하며 로컬은 데모 ID 사용

## 안전 경계

- 화면의 계좌, 시장, 상품, 세금과 거래 데이터는 합성 또는 샌드박스 데이터입니다.
- 실제 송금·투자·환전·납부·대출·보험·세금 신고를 실행하지 않습니다.
- 고위험 액션은 사용자 승인 후에도 정책과 한도를 다시 검사합니다.
- 비밀번호, OTP와 인증서 비밀키를 FIA가 보관하지 않습니다.
- 상용 전환 시 인허가 보유기관 또는 승인된 API·제휴 연결이 필요합니다.
