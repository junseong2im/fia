import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the FIA financial operating console instead of the starter", async () => {
  const [layout, page, app] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/FiaApp.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /FIA — AI 금융 운영체제/);
  assert.match(page, /<FiaApp \/>/);
  assert.match(app, /통합 순자산/);
  assert.match(app, /FIA 오늘의 브리핑/);
  assert.match(app, /17개 금융 전문가/);
  assert.match(app, /AI 실행 권한 센터/);
  assert.doesNotMatch(`${layout}\n${page}\n${app}`, /codex-preview|Your site is taking shape|SkeletonPreview/);
});

test("catalog preserves all 17 services and the full named scope", async () => {
  const catalog = await readFile(new URL("../lib/catalog.ts", import.meta.url), "utf8");
  const serviceIds = [...catalog.matchAll(/^\s{4}id:\s"([a-z0-9]+)",$/gm)].map((match) => match[1]);
  assert.equal(serviceIds.length, 17);
  assert.equal(new Set(serviceIds).size, 17);

  const requiredFeatures = [
    "모든 금융계좌 통합",
    "옵션 전략(지원 환경에서)",
    "세금 신고 지원",
    "보험금 청구 지원",
    "대환대출 추천",
    "마일리지 관리",
    "귀국 후 정산",
    "자동 구독 해지",
    "보이스피싱 위험 경고",
    "내 자산 영향 설명",
    "CFO 지원",
    "숨겨진 수수료 탐지",
    "해외송금 최적 경로",
    "음성 투자 지시",
    "대출 가능성 예측",
    "상황별 금융 계획 자동 제안",
  ];
  for (const feature of requiredFeatures) assert.ok(catalog.includes(feature), `missing: ${feature}`);
});

test("audit persistence migration is packaged", async () => {
  const migration = await readFile(
    new URL("../drizzle/0000_nebulous_grim_reaper.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /CREATE TABLE `audit_logs`/);
  assert.match(migration, /`permission` text NOT NULL/);
  assert.match(migration, /`status` text NOT NULL/);
  assert.match(migration, /`created_at` text DEFAULT CURRENT_TIMESTAMP/);
});

test("server action adapter migration and API are packaged", async () => {
  const [migration, route, adapter] = await Promise.all([
    readFile(new URL("../drizzle/0001_skinny_smasher.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/actions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/action-adapters.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /CREATE TABLE `action_requests`/);
  assert.match(migration, /UNIQUE INDEX `action_requests_idempotency_key_unique`/);
  assert.match(route, /idempotencyKey/);
  assert.match(route, /adapter\.execute/);
  assert.match(adapter, /POLICY_LIMIT_EXCEEDED/);
  assert.match(adapter, /USER_CANCELLED/);
});

test("contract documents use R2 bytes, D1 metadata and server extraction", async () => {
  const [hosting, migration, route, extraction] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0002_foamy_smasher.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/documents/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/document-extraction.ts", import.meta.url), "utf8"),
  ]);
  assert.match(hosting, /"r2": "DOCUMENTS"/);
  assert.match(migration, /CREATE TABLE `documents`/);
  assert.match(route, /DOCUMENTS/);
  assert.match(route, /await bucket\.put/);
  assert.match(extraction, /extractDocx/);
  assert.match(extraction, /extractPdf/);
});

test("writes are server-validated, owner-isolated and security headers are applied", async () => {
  const [actions, audit, schema, worker, ownerMigration] = await Promise.all([
    readFile(new URL("../app/api/actions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/audit/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_petite_whirlwind.sql", import.meta.url), "utf8"),
  ]);
  assert.match(actions, /service\.features\.includes/);
  assert.match(actions, /getRequestOwnerId/);
  assert.match(actions, /db\.batch/);
  assert.doesNotMatch(audit, /export async function POST/);
  assert.match(schema, /ownerId: text\("owner_id"\)/);
  assert.match(ownerMigration, /ADD `owner_id`/);
  assert.match(worker, /X-Content-Type-Options/);
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /Cache-Control/);
});
