import { test } from "node:test";
import assert from "node:assert/strict";
import { gate } from "../lib/agent/invoke";
import type { LimitInputs } from "../lib/billing";

const okLimits: LimitInputs = { live: true, agentDailyCap: 5, agentSpentToday: 1, monthlyCap: 200, monthSpent: 10, projectBudget: 50, projectSpent: 5, creditsRemaining: 80 };
const base = { agentActive: true, presenceState: "work" as const, taskStatus: "queued", taskAssignee: 3, agentId: 3, projectStatus: "active", aiAllowed: true, limits: okLimits };

test("근무 중 + 배정 + 허용 + 한도 이내 → 호출 허용", () => { assert.deepEqual(gate(base), { ok: true }); });
test("대기(idle) 상태 → 호출 없음 (과금 0 보장 1)", () => { const r = gate({ ...base, presenceState: "idle" }); assert.equal(r.ok, false); });
test("부재(away) 상태 → 호출 없음", () => { assert.equal(gate({ ...base, presenceState: "away" }).ok, false); });
test("이동 중(arriving) → 호출 없음", () => { assert.equal(gate({ ...base, presenceState: "arriving" }).ok, false); });
test("다른 에이전트의 작업 → 거부", () => { assert.equal(gate({ ...base, taskAssignee: 9 }).ok, false); });
test("이미 검토 중인 작업 → 거부", () => { assert.equal(gate({ ...base, taskStatus: "review" }).ok, false); });
test("클라이언트 AI 금지 프로젝트 → 거부", () => { const r = gate({ ...base, aiAllowed: false }); assert.equal(r.ok, false); assert.match((r as { reason: string }).reason, /ai_allowed/); });
test("종료된 프로젝트 → 거부", () => { assert.equal(gate({ ...base, projectStatus: "done" }).ok, false); });
test("비활성 에이전트 → 거부", () => { assert.equal(gate({ ...base, agentActive: false }).ok, false); });
test("크레딧 0 → 거부", () => { const r = gate({ ...base, limits: { ...okLimits, creditsRemaining: 0 } }); assert.equal(r.ok, false); assert.match((r as { reason: string }).reason, /크레딧/); });
test("월 한도 도달 → 거부", () => { assert.equal(gate({ ...base, limits: { ...okLimits, monthSpent: 200 } }).ok, false); });
test("프로젝트 예산 소진 → 거부", () => { assert.equal(gate({ ...base, limits: { ...okLimits, projectSpent: 50 } }).ok, false); });
test("에이전트 일일 한도 → 거부", () => { assert.equal(gate({ ...base, limits: { ...okLimits, agentSpentToday: 5 } }).ok, false); });
test("mock 모드는 한도 미적용(실비 0)이지만 상태 잠금은 유지", () => {
  assert.equal(gate({ ...base, limits: { ...okLimits, live: false, creditsRemaining: 0 } }).ok, true);
  assert.equal(gate({ ...base, presenceState: "idle", limits: { ...okLimits, live: false } }).ok, false);
});
