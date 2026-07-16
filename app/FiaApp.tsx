"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  featureCount,
  getService,
  permissionCopy,
  services,
  type PermissionLevel,
  type ServiceId,
} from "../lib/catalog";
import {
  analyzeService,
  assetAccounts,
  formatKrw,
  netWorth,
  totalAssets,
  totalLiabilities,
  type AnalysisResult,
} from "../lib/finance";
import { getFeatureProfile } from "../lib/feature-profiles";
import { planCommand, type SupervisorPlan } from "../lib/supervisor";

type View = "overview" | "service" | "accounts" | "activity" | "permissions";

type AuditEntry = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  feature: string;
  action: string;
  amount: number;
  permission: PermissionLevel;
  status: "성공" | "실패" | "취소" | "승인 대기";
  detail: string;
  createdAt: string;
};

type VoiceRecognition = {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
  onerror: () => void;
  start: () => void;
};

type VoiceRecognitionConstructor = new () => VoiceRecognition;

type DocumentAnalysisPayload = {
  document: {
    id: string;
    filename: string;
    sha256: string;
    status: string;
    extractedLength: number;
  };
  signals: {
    feeTerms: number;
    riskTerms: number;
    moneyTerms: number;
    paragraphCount: number;
    excerpt: string;
  };
  error?: string;
};

const startingAudit: AuditEntry[] = [
  {
    id: "demo-01",
    serviceId: "risk",
    serviceTitle: "AI 위험관리",
    feature: "이상 거래 탐지",
    action: "신규 기기 거래 추가 인증",
    amount: 4800000,
    permission: "L4",
    status: "성공",
    detail: "샌드박스 기관이 거래를 10분 보류하고 본인활동 확인을 요청했습니다.",
    createdAt: "오늘 15:42",
  },
  {
    id: "demo-02",
    serviceId: "spending",
    serviceTitle: "AI 소비 관리",
    feature: "구독 관리",
    action: "중복 구독 해지 준비",
    amount: 24900,
    permission: "L3",
    status: "승인 대기",
    detail: "다음 결제 3일 전 재확인하도록 예약되었습니다.",
    createdAt: "오늘 13:18",
  },
  {
    id: "demo-03",
    serviceId: "invest",
    serviceTitle: "AI 투자 매니저",
    feature: "자동 리밸런싱",
    action: "허용 범위 초과로 실행 차단",
    amount: 8200000,
    permission: "L4",
    status: "실패",
    detail: "사용자가 설정한 1회 투자한도 500만원을 초과했습니다.",
    createdAt: "어제 16:05",
  },
];

const goalItems = [
  { title: "주택 대출 조기상환", progress: 68, current: "6,820만원", target: "1억원", date: "2028.12" },
  { title: "자녀 교육자금", progress: 42, current: "3,360만원", target: "8,000만원", date: "2032.03" },
  { title: "은퇴 현금흐름", progress: 57, current: "월 318만원", target: "월 550만원", date: "2045.01" },
];

const insightItems = [
  { tone: "danger", tag: "위험", title: "해외 결제 1건을 확인해 주세요", text: "평소와 다른 기기·국가에서 486만원 승인이 감지됐습니다.", service: "risk" as ServiceId },
  { tone: "warning", tag: "절약", title: "중복 가능 구독 3건", text: "최근 90일 이용 기록이 없는 구독료 월 5.8만원입니다.", service: "spending" as ServiceId },
  { tone: "positive", tag: "기회", title: "대환 시 이자 1,230만원 절감", text: "중도상환 비용을 반영해도 손익분기점은 8개월입니다.", service: "loan" as ServiceId },
];

export default function FiaApp() {
  const [view, setView] = useState<View>("overview");
  const [activeServiceId, setActiveServiceId] = useState<ServiceId>("assets");
  const activeService = getService(activeServiceId);
  const [selectedFeature, setSelectedFeature] = useState(activeService.features[0]);
  const [amount, setAmount] = useState(activeService.defaultValue);
  const [horizon, setHorizon] = useState(5);
  const [riskTolerance, setRiskTolerance] = useState(3);
  const [analysis, setAnalysis] = useState<AnalysisResult>(() =>
    analyzeService("assets", activeService.features[0], activeService.defaultValue, 5, 3),
  );
  const [hasRun, setHasRun] = useState(false);
  const [command, setCommand] = useState("");
  const [commandContext, setCommandContext] = useState("");
  const [supervisorPlan, setSupervisorPlan] = useState<SupervisorPlan | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(startingAudit);
  const [auditHealth, setAuditHealth] = useState<"loading" | "connected" | "offline">("loading");
  const [toast, setToast] = useState("");
  const [attachment, setAttachment] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [documentStatus, setDocumentStatus] = useState<"idle" | "uploading" | "stored" | "error">("idle");
  const [documentPreview, setDocumentPreview] = useState("");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "unsupported">("idle");
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/audit")
      .then(async (response) => {
        if (!response.ok) throw new Error("audit unavailable");
        return (await response.json()) as { logs?: AuditEntry[] };
      })
      .then((payload) => {
        setAuditHealth("connected");
        if (payload?.logs?.length) {
          setAuditEntries((current) => [...payload.logs!, ...current].slice(0, 100));
        }
      })
      .catch(() => setAuditHealth("offline"));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (approvalOpen && !executing) {
        setApprovalOpen(false);
        setApprovalChecked(false);
      }
      if (mobileNavOpen) setMobileNavOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [approvalOpen, executing, mobileNavOpen]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return services;
    return services.filter(
      (service) => service.title.toLowerCase().includes(query) || service.features.some((feature) => feature.toLowerCase().includes(query)),
    );
  }, [search]);

  const featureProfile = useMemo(
    () => getFeatureProfile(activeServiceId, selectedFeature),
    [activeServiceId, selectedFeature],
  );

  const openService = (id: ServiceId, feature?: string, context?: string) => {
    const service = getService(id);
    const targetFeature = feature && service.features.includes(feature) ? feature : service.features[0];
    const targetHorizon = id === "planning" || id === "life" ? 10 : 5;
    setActiveServiceId(id);
    setSelectedFeature(targetFeature);
    setAmount(service.defaultValue);
    setHorizon(targetHorizon);
    setRiskTolerance(3);
    setAnalysis(analyzeService(id, targetFeature, service.defaultValue, targetHorizon, 3));
    setHasRun(false);
    setAttachment("");
    setAttachmentFile(null);
    setDocumentStatus("idle");
    setDocumentPreview("");
    setCommandContext(context ?? "");
    setSupervisorPlan(null);
    setView("service");
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const runAnalysis = async () => {
    const baseResult = analyzeService(activeServiceId, selectedFeature, Number(amount) || 0, horizon, riskTolerance);
    setAnalysis(baseResult);
    setHasRun(true);

    if (activeServiceId === "contract" && attachmentFile) {
      setDocumentStatus("uploading");
      setDocumentPreview("");
      try {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        formData.append("feature", selectedFeature);
        const response = await fetch("/api/documents", { method: "POST", body: formData });
        const payload = (await response.json()) as DocumentAnalysisPayload;
        if (!response.ok || !payload.document) throw new Error(payload.error ?? "문서를 처리하지 못했습니다.");
        const { document, signals } = payload;
        setAnalysis({
          ...baseResult,
          summary: `${baseResult.summary} ${document.filename} 본문 ${document.extractedLength.toLocaleString("ko-KR")}자를 추출해 비용·위험 표현을 실제로 대조했습니다.`,
          metrics: [
            ...baseResult.metrics.slice(0, 4),
            { label: "본문 추출", value: `${document.extractedLength.toLocaleString("ko-KR")}자`, delta: `${signals.paragraphCount}개 문단`, tone: document.extractedLength > 0 ? "positive" : "warning" },
            { label: "비용 표현", value: `${signals.feeTerms}건`, delta: `${signals.moneyTerms}개 금액표현`, tone: signals.feeTerms > 0 ? "warning" : "neutral" },
            { label: "위험 표현", value: `${signals.riskTerms}건`, delta: "원문 근거 확인", tone: signals.riskTerms > 0 ? "danger" : "positive" },
          ],
          steps: [`${document.filename} 추출본문과 원문 페이지 대조`, ...baseResult.steps],
          assumptions: [`문서 SHA-256 ${document.sha256.slice(0, 12)}…`, ...baseResult.assumptions],
          source: `${baseResult.source} · R2 문서 ${document.id}`,
        });
        setDocumentStatus("stored");
        setDocumentPreview(signals.excerpt);
        setToast("문서 본문 추출·R2 저장·계약 분석을 완료했습니다.");
        return;
      } catch (error) {
        setDocumentStatus("error");
        setToast(error instanceof Error ? error.message : "문서 분석에 실패했습니다.");
        return;
      }
    }

    setToast(`${activeService.expert}가 ${selectedFeature} 분석을 완료했습니다.`);
  };

  const handleCommand = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;
    const plan = planCommand(trimmed);
    openService(plan.primaryServiceId, plan.feature, trimmed);
    setSupervisorPlan(plan);
    setCommand("");
  };

  const startVoice = () => {
    const voiceWindow = window as typeof window & { SpeechRecognition?: VoiceRecognitionConstructor; webkitSpeechRecognition?: VoiceRecognitionConstructor };
    const Recognition = voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceState("unsupported");
      setCommand("다음 달 여행에 얼마까지 써도 될까?");
      setToast("이 브라우저는 음성 인식을 지원하지 않아 예시 문장을 입력했습니다.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.onresult = (event) => { setCommand(event.results[0]?.[0]?.transcript ?? ""); setVoiceState("idle"); };
    recognition.onerror = () => { setVoiceState("idle"); setToast("음성을 인식하지 못했습니다. 다시 시도해 주세요."); };
    recognition.start();
    setVoiceState("listening");
  };

  const submitAction = async (operation: "execute" | "cancel") => {
    const requestId = `${operation}-${Date.now()}-${crypto.randomUUID()}`;
    const response = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: requestId,
        idempotencyKey: requestId,
        operation,
        serviceId: activeService.id,
        serviceTitle: activeService.title,
        feature: selectedFeature,
        action: activeService.action,
        amount,
        permission: activeService.permission,
        confirmed: operation === "execute" && approvalChecked,
        provider: "sandbox",
      }),
    });
    const payload = (await response.json()) as { log?: AuditEntry; error?: string };
    if (!response.ok || !payload.log) {
      throw new Error(payload.error ?? "실행 결과를 감사로그에 저장하지 못했습니다.");
    }
    return payload.log;
  };

  const approveAction = async () => {
    if (!approvalChecked || executing) return;
    setExecuting(true);
    try {
      const entry = await submitAction("execute");
      setAuditEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      setApprovalOpen(false);
      setApprovalChecked(false);
      setToast(entry.status === "성공" ? "샌드박스 실행이 완료되고 감사로그에 기록됐습니다." : entry.detail);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "샌드박스 실행 연결에 실패했습니다.");
    } finally {
      setExecuting(false);
    }
  };

  const cancelApproval = async () => {
    if (executing) return;
    setExecuting(true);
    try {
      const entry = await submitAction("cancel");
      setAuditEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      setApprovalOpen(false);
      setApprovalChecked(false);
      setToast("실행을 취소하고 서버 감사로그에 기록했습니다.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "취소 기록을 저장하지 못했습니다.");
    } finally {
      setExecuting(false);
    }
  };

  const approvalLevel = permissionCopy[activeService.permission];

  return (
    <div className="app-shell">
      <aside id="fia-navigation" className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`} aria-label="FIA 서비스 탐색">
        <button className="brand" onClick={() => setView("overview")}>
          <span className="brand-mark">F</span><span><strong>FIA</strong><small>Financial Intelligence Agent</small></span>
        </button>
        <div className="side-search"><span>⌕</span><input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="기능 검색" aria-label="서비스 기능 검색" /><kbd>/</kbd></div>
        <nav className="primary-nav">
          <button className={view === "overview" ? "nav-core active" : "nav-core"} onClick={() => { setView("overview"); setMobileNavOpen(false); }}><span className="nav-symbol">HM</span><span>홈 브리핑</span></button>
          <button className={view === "accounts" ? "nav-core active" : "nav-core"} onClick={() => { setView("accounts"); setMobileNavOpen(false); }}><span className="nav-symbol">₩</span><span>통합 계좌</span><em>{assetAccounts.length}</em></button>
          <button className={view === "activity" ? "nav-core active" : "nav-core"} onClick={() => { setView("activity"); setMobileNavOpen(false); }}><span className="nav-symbol">LG</span><span>실행 기록</span><em>{auditEntries.length}</em></button>
        </nav>
        <div className="nav-label"><span>AI 전문가 17</span><small>{featureCount}개 기능</small></div>
        <nav className="service-nav">
          {filteredServices.map((service) => (
            <button key={service.id} className={view === "service" && activeServiceId === service.id ? "service-nav-item active" : "service-nav-item"} onClick={() => openService(service.id)} style={{ "--service-accent": service.accent } as React.CSSProperties}>
              <span className="service-index">{String(service.index).padStart(2, "0")}</span><span className="service-dot">{service.short}</span><span>{service.title.replace("AI ", "")}</span>
            </button>
          ))}
        </nav>
        <button className="permission-card" onClick={() => { setView("permissions"); setMobileNavOpen(false); }}><span className="permission-pulse" /><span><strong>실행 권한 보호 중</strong><small>L4 작업은 매번 재확인</small></span><b>›</b></button>
      </aside>

      <button type="button" className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} aria-label="메뉴 닫기" tabIndex={mobileNavOpen ? 0 : -1} />

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="메뉴 열기" aria-controls="fia-navigation" aria-expanded={mobileNavOpen}>☰</button>
          <form className="command-bar" onSubmit={handleCommand}>
            <span className="command-spark">✦</span><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="FIA에게 물어보세요. 예: 다음 달 여행에 얼마까지 써도 될까?" aria-label="FIA 자연어 금융 질문" />
            <button type="button" className={`voice-button ${voiceState === "listening" ? "listening" : ""}`} onClick={startVoice} aria-label="음성으로 질문">{voiceState === "listening" ? "듣는 중" : "음성"}</button><button type="submit" className="send-command" aria-label="질문 보내기">→</button>
          </form>
          <div className="top-actions"><button className="icon-button" aria-label="알림">◦<span className="notification-dot" /></button><button className="profile-button"><span>김</span><strong>김민준</strong><small>개인+사업자</small></button></div>
        </header>

        {view === "overview" && (
          <section className="page-content overview-page">
            <div className="page-heading overview-heading"><div><span className="eyebrow">Financial Intelligence Agent · Live</span><h1>내 금융을 하나의 <em>운영체제로.</em></h1><p>17개 AI 전문가가 152개 데이터 포인트와 {featureCount}개 기능을 연결해 자산을 이해하고, 계획하고, 실행합니다.</p></div><div className="health-score"><div><span>금융 건강점수</span><strong>82</strong><small>/ 100</small></div><i style={{ "--score": "82%" } as React.CSSProperties} /></div></div>
            <div className="dashboard-grid hero-grid">
              <article className="card networth-card">
                <div className="card-topline"><span>통합 순자산</span><button onClick={() => setView("accounts")}>15개 원천 보기 ↗</button></div>
                <div className="networth-value"><strong>{formatKrw(netWorth, true)}</strong><span className="up">▲ 1.8%</span><small>지난달 대비 +1,243만원</small></div>
                <div className="wealth-flow" aria-label="자산 및 부채 구성"><div className="flow-track"><span className="flow-financial" style={{ width: "43%" }} /><span className="flow-real" style={{ width: "38%" }} /><span className="flow-business" style={{ width: "7%" }} /><span className="flow-debt" style={{ width: "12%" }} /></div><div className="flow-legend"><span><i className="financial" />금융자산 42%</span><span><i className="real" />실물자산 39%</span><span><i className="business" />사업자산 7%</span><span><i className="debt" />부채 12%</span></div></div>
                <div className="summary-row"><div><span>총자산</span><strong>{formatKrw(totalAssets, true)}</strong></div><div><span>총부채</span><strong>{formatKrw(totalLiabilities, true)}</strong></div><div><span>이번 달 현금흐름</span><strong className="up">+238만원</strong></div></div>
                <div className="source-line"><span className="live-dot" />금융 데이터 오늘 16:01 기준 · 수기자산 2개는 별도 기준일 적용</div>
              </article>
              <article className="card briefing-card"><div className="card-topline"><span>FIA 오늘의 브리핑</span><small>우선순위순</small></div><div className="briefing-list">{insightItems.map((item) => <button key={item.title} className={`briefing-item ${item.tone}`} onClick={() => openService(item.service)}><span className="briefing-tag">{item.tag}</span><span><strong>{item.title}</strong><small>{item.text}</small></span><b>›</b></button>)}</div><button className="briefing-all" onClick={() => setView("activity")}>모든 실행 제안 보기 <span>4</span></button></article>
            </div>
            <div className="dashboard-grid lower-grid">
              <article className="card cashflow-card"><div className="card-topline"><span>이번 달 현금흐름</span><button onClick={() => openService("planning", "현금흐름 분석")}>자세히 ↗</button></div><div className="cashflow-numbers"><div><span>수입</span><strong>798만원</strong></div><div><span>지출</span><strong>560만원</strong></div><div><span>잉여</span><strong className="up">238만원</strong></div></div><div className="cashflow-chart" aria-label="최근 6개월 현금흐름 차트">{[58, 73, 61, 82, 67, 88].map((height, index) => <div key={index}><span style={{ height: `${height}%` }} /><i style={{ height: `${Math.max(28, height - 28)}%` }} /><small>{["2월", "3월", "4월", "5월", "6월", "7월"][index]}</small></div>)}</div></article>
              <article className="card goals-card"><div className="card-topline"><span>목표 진행상황</span><button onClick={() => openService("planning")}>목표 관리 ↗</button></div><div className="goals-list">{goalItems.map((goal) => <button key={goal.title} onClick={() => openService("planning", goal.title.includes("은퇴") ? "은퇴 계획" : "목표 달성 시뮬레이션")}><span><strong>{goal.title}</strong><small>{goal.date}</small></span><span className="goal-track"><i style={{ width: `${goal.progress}%` }} /></span><span><b>{goal.progress}%</b><small>{goal.current} / {goal.target}</small></span></button>)}</div></article>
              <article className="card expert-card"><div className="card-topline"><span>전문가 네트워크</span><small>17/17 정상</small></div><div className="expert-orbit"><div className="orbit-core">FIA<small>Supervisor</small></div>{services.slice(0, 8).map((service, index) => <button key={service.id} style={{ "--angle": `${index * 45}deg`, "--accent": service.accent } as React.CSSProperties} onClick={() => openService(service.id)}>{service.short}</button>)}</div><p>한 질문에 필요한 전문가만 호출하고, 충돌하는 제안은 현금흐름·위험한도로 다시 조정합니다.</p></article>
            </div>
            <section className="service-launcher"><div className="section-heading"><div><span>전체 서비스</span><h2>17개 금융 전문가, 하나의 상태</h2></div><small>{featureCount}개 하위 기능 모두 활성화</small></div><div className="service-card-grid">{services.map((service) => <button key={service.id} className="service-card" onClick={() => openService(service.id)} style={{ "--service-accent": service.accent } as React.CSSProperties}><span className="service-card-index">{String(service.index).padStart(2, "0")}</span><span className="service-card-mark">{service.short}</span><span><strong>{service.title}</strong><small>{service.description}</small><em>{service.features.length}개 기능</em></span><b>↗</b></button>)}</div></section>
          </section>
        )}

        {view === "service" && (
          <section className="page-content service-page" style={{ "--service-accent": activeService.accent } as React.CSSProperties}>
            <div className="service-hero"><div className="service-hero-mark">{activeService.short}</div><div><span className="eyebrow">AI 전문가 {String(activeService.index).padStart(2, "0")} · {activeService.expert}</span><h1>{activeService.title}</h1><p>{activeService.description}</p></div><div className="service-status"><span className="live-dot" />정상 작동<small>{activeService.features.length}개 기능 · Sandbox</small></div></div>
            {commandContext && <div className="context-banner"><span>✦</span><div><small>FIA가 해석한 질문{supervisorPlan ? ` · ${supervisorPlan.specialists.length}개 전문가 호출` : ""}</small><strong>“{commandContext}”</strong>{supervisorPlan && <em>{supervisorPlan.specialists.map((item) => item.title.replace("AI ", "")).join(" → ")}</em>}</div><button onClick={() => { setCommandContext(""); setSupervisorPlan(null); }}>×</button></div>}
            <div className="service-workspace">
              <article className="card feature-panel">
                <div className="panel-heading"><div><span>01</span><div><strong>분석할 기능 선택</strong><small>모든 하위 기능이 같은 금융 상태를 공유합니다.</small></div></div><em>{activeService.features.length}개</em></div>
                <div className="feature-chip-grid">{activeService.features.map((feature) => <button key={feature} className={feature === selectedFeature ? "feature-chip active" : "feature-chip"} onClick={() => { setSelectedFeature(feature); setHasRun(false); }}>{feature}<span>✓</span></button>)}</div>
                <div className="panel-heading form-heading"><div><span>02</span><div><strong>조건 입력</strong><small>수치와 가정은 결과에 함께 기록됩니다.</small></div></div></div>
                <div className="analysis-form">
                  <label className="amount-field"><span>{featureProfile.inputLabel}</span><small>{featureProfile.inputHint}</small><div><input type="number" min={0} step={10000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /><b>{activeService.unit}</b></div></label>
                  <label><span>분석 기간</span><small>목표·시나리오의 기준 기간</small><div className="segmented">{[1, 3, 5, 10, 20].map((year) => <button type="button" key={year} className={horizon === year ? "active" : ""} onClick={() => setHorizon(year)}>{year}년</button>)}</div></label>
                  <label><span>위험 허용도</span><small>1은 보수적, 5는 적극적</small><div className="risk-scale">{[1, 2, 3, 4, 5].map((level) => <button type="button" key={level} className={riskTolerance === level ? "active" : ""} onClick={() => setRiskTolerance(level)}>{level}</button>)}</div></label>
                  {activeServiceId === "contract" && <label className="upload-field"><span>분석 문서</span><small>PDF·DOCX·TXT · 최대 10MB · R2 암호화 저장소와 D1 메타데이터에 보존</small><input type="file" accept=".pdf,.docx,.txt" onChange={(event) => { const file = event.target.files?.[0] ?? null; setAttachmentFile(file); setAttachment(file?.name ?? ""); setDocumentStatus("idle"); setDocumentPreview(""); }} /><b>{attachment || "샘플 계약서 사용"}</b></label>}
                </div>
                {activeServiceId === "contract" && documentStatus !== "idle" && <div className={`document-process ${documentStatus}`} role="status" aria-live="polite"><div><span>{documentStatus === "uploading" ? "문서 처리 중" : documentStatus === "stored" ? "R2 저장·본문 분석 완료" : "문서 처리 실패"}</span><strong>{attachment}</strong></div>{documentPreview && <p>{documentPreview}</p>}</div>}
                <div className="feature-requirements"><div><span>기능별 추가 조건</span><strong>{featureProfile.signature}</strong></div><ul>{featureProfile.requiredInputs.map((input) => <li key={input}>{input}</li>)}</ul><p><b>검증</b>{featureProfile.validation}</p></div>
                <button className="run-analysis" disabled={documentStatus === "uploading"} onClick={runAnalysis}><span>✦</span>{documentStatus === "uploading" ? "문서 추출·저장 중…" : `${activeService.expert} 분석 실행`}<b>→</b></button>
              </article>
              <aside className="workspace-side"><article className="card permission-summary"><div className="permission-icon"><span /></div><div><span>필요 권한 {activeService.permission}</span><strong>{approvalLevel.label}</strong><p>{approvalLevel.description}</p></div><button onClick={() => setView("permissions")}>권한 보기</button></article><article className="card data-freshness"><div className="card-topline"><span>사용 데이터</span><small>최신성</small></div><ul><li><span>금융계좌 샌드박스</span><b>오늘 16:01</b></li><li><span>사용자 목표·설정</span><b>오늘 15:58</b></li><li><span>시장·규칙 데이터</span><b>2026.07.16</b></li></ul><p><span className="live-dot" />모든 결과에 원천과 기준시각 표시</p></article><article className="card assumption-card"><span>AI 안전 원칙</span><strong>계산은 함수가, 설명은 AI가</strong><p>금액·세금·이자·수익률은 재현 가능한 엔진이 계산합니다. AI는 근거와 대안을 설명합니다.</p></article></aside>
            </div>
            <article className={`card result-card ${hasRun ? "result-ready" : ""}`}><div className="result-heading"><div><span>03</span><div><small>{selectedFeature} · {analysis.sourceTime}</small><h2>{analysis.headline}</h2><p>{analysis.summary}</p></div></div><div className="confidence"><span>AI 신뢰도</span><strong>{analysis.confidence}%</strong><small>위험 {analysis.risk}</small></div></div><div className="metric-grid">{analysis.metrics.map((metric) => <div key={metric.label} className={`metric ${metric.tone ?? "neutral"}`}><span>{metric.label}</span><strong>{metric.value}</strong>{metric.delta && <small>{metric.delta}</small>}</div>)}</div><div className="result-detail-grid"><div><span>권장 실행 순서</span><ol>{analysis.steps.map((step) => <li key={step}>{step}</li>)}</ol></div><div><span>계산 가정·제약</span><ul>{analysis.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></div></div><div className="result-source"><div><span>근거</span><strong>{analysis.source}</strong><small>{analysis.sourceTime} · 계산 버전과 입력값이 감사로그에 보존됩니다.</small></div><button onClick={() => setApprovalOpen(true)}>{activeService.action}<b>→</b></button></div></article>
          </section>
        )}

        {view === "accounts" && <section className="page-content table-page"><div className="page-heading"><div><span className="eyebrow">Financial Digital Twin</span><h1>통합 계좌와 자산 원천</h1><p>금융·실물·디지털·기업 자산을 원천과 기준시각까지 함께 관리합니다.</p></div><button className="primary-action" onClick={() => openService("assets", "모든 금융계좌 통합")}>+ 자산 연결</button></div><div className="account-summary"><div><span>총자산</span><strong>{formatKrw(totalAssets, true)}</strong></div><div><span>총부채</span><strong>{formatKrw(totalLiabilities, true)}</strong></div><div><span>순자산</span><strong>{formatKrw(netWorth, true)}</strong></div><div><span>오늘 갱신</span><strong>{assetAccounts.filter((a) => a.updatedAt.includes("오늘")).length}개</strong></div></div><div className="card data-table-wrap"><table><thead><tr><th>구분</th><th>기관·자산</th><th>현재 평가액</th><th>변동</th><th>원천</th><th>기준시각</th></tr></thead><tbody>{assetAccounts.map((account) => <tr key={account.id}><td><span className={`asset-type ${account.type}`}>{account.category}</span></td><td><strong>{account.institution}</strong><small>{account.name}</small></td><td className={account.type === "liability" ? "liability-value" : ""}>{account.type === "liability" ? "-" : ""}{formatKrw(account.value)}</td><td className={account.change >= 0 ? "up" : "down"}>{account.change > 0 ? "+" : ""}{account.change.toFixed(1)}%</td><td>{account.source}</td><td>{account.updatedAt}</td></tr>)}</tbody></table></div></section>}

        {view === "activity" && <section className="page-content table-page"><div className="page-heading"><div><span className="eyebrow">Immutable Audit Trail</span><h1>실행·승인 감사로그</h1><p>제안, 승인, 성공, 실패와 취소를 입력·권한·결과와 함께 기록합니다.</p></div><div className={`audit-health ${auditHealth}`}><span className="live-dot" />{auditHealth === "connected" ? "서버 감사로그 정상" : auditHealth === "loading" ? "감사로그 연결 중" : "서버 연결 끊김 · 데모 기록 표시"}</div></div><div className="audit-stats"><div><span>전체 기록</span><strong>{auditEntries.length}</strong></div><div><span>성공</span><strong>{auditEntries.filter((entry) => entry.status === "성공").length}</strong></div><div><span>정책 차단</span><strong>{auditEntries.filter((entry) => entry.status === "실패").length}</strong></div><div><span>승인 대기</span><strong>{auditEntries.filter((entry) => entry.status === "승인 대기").length}</strong></div></div><div className="audit-list">{auditEntries.map((entry) => <article key={entry.id} className="card audit-item"><span className={`audit-status ${entry.status}`}>{entry.status}</span><div><small>{entry.createdAt} · {entry.permission}</small><strong>{entry.serviceTitle} / {entry.feature}</strong><p>{entry.detail}</p></div><div><span>{formatKrw(entry.amount)}</span><small>{entry.action}</small></div><button onClick={() => openService(entry.serviceId as ServiceId, entry.feature)}>열기</button></article>)}</div></section>}

        {view === "permissions" && <section className="page-content permission-page"><div className="page-heading"><div><span className="eyebrow">Zero Trust Action Policy</span><h1>AI 실행 권한 센터</h1><p>FIA는 요청마다 권한·금액·대상·기관 인증을 검사하고 필요한 단계에서 멈춥니다.</p></div><div className="secure-badge">보호 중</div></div><div className="permission-ladder">{(Object.keys(permissionCopy) as PermissionLevel[]).map((level) => <article className="card" key={level}><span>{level}</span><div><strong>{permissionCopy[level].label}</strong><p>{permissionCopy[level].description}</p></div><small>{level === "L4" ? "매번 재확인" : "사용자 설정 범위"}</small></article>)}</div><div className="permission-grid"><article className="card"><span>샌드박스 실행 한도</span><strong>1회 500만원 · 일 1,000만원</strong><p>한도 초과 요청은 승인 화면에 도달하기 전에 정책 엔진이 차단합니다.</p></article><article className="card"><span>FIA가 보관하지 않는 정보</span><strong>비밀번호 · OTP · 인증서 비밀키</strong><p>기관 인증은 기관 화면과 토큰을 통해 처리하며 FIA는 인증 비밀을 저장하지 않습니다.</p></article><article className="card"><span>실행 안전장치</span><strong>중복 방지 · 취소 · 실패 보상</strong><p>요청마다 고유 키를 사용하고 결과를 대조해 중복 송금·주문을 방지합니다.</p></article></div></section>}
      </main>

      {approvalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !executing) setApprovalOpen(false); }}><section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title"><button className="modal-close" disabled={executing} onClick={() => setApprovalOpen(false)} aria-label="닫기">×</button><span className="approval-kicker">Sandbox Action Review</span><h2 id="approval-title">실행 전 마지막 확인</h2><p>FIA는 사용자의 명시적 승인 없이 금융 행동을 실행하지 않습니다.</p><div className="approval-summary"><div><span>서비스</span><strong>{activeService.title}</strong></div><div><span>기능</span><strong>{selectedFeature}</strong></div><div><span>금액·한도</span><strong>{formatKrw(amount)}</strong></div><div><span>권한</span><strong>{activeService.permission} · {approvalLevel.label}</strong></div><div><span>실행기관</span><strong>FIA Sandbox Adapter v1</strong></div><div><span>실거래 여부</span><strong className="safe-text">실거래 없음</strong></div></div>{amount > 5000000 && activeService.permission === "L4" && <div className="policy-warning"><strong>한도 초과 예상</strong><span>현재 요청은 1회 한도 500만원을 초과해 승인 후에도 정책 엔진이 차단합니다.</span></div>}<label className="approval-check"><input type="checkbox" disabled={executing} checked={approvalChecked} onChange={(event) => setApprovalChecked(event.target.checked)} /><span>입력값, 위험, 계산 가정과 샌드박스 실행임을 확인했습니다.</span></label><div className="modal-actions"><button disabled={executing} onClick={cancelApproval}>{executing ? "서버 기록 중…" : "취소하고 기록"}</button><button disabled={!approvalChecked || executing} onClick={approveAction}>{executing ? "정책 검사 중…" : "샌드박스 실행 승인"}</button></div></section></div>}
      {toast && <div className="toast" role="status" aria-live="polite"><span>✓</span>{toast}</div>}
    </div>
  );
}
