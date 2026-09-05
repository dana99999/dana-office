import { test } from "node:test";
import assert from "node:assert/strict";
import { costOf, checkLimits, PRICING } from "../lib/billing";

test("Opus 5 단가: 입력 $5/M, 출력 $25/M, 캐시 읽기 1/10", () => {
  assert.equal(costOf("claude-opus-5", { input_tokens: 1_000_000, cached_tokens: 0, output_tokens: 0 }), 5);
  assert.equal(costOf("claude-opus-5", { input_tokens: 0, cached_tokens: 1_000_000, output_tokens: 0 }), 0.5);
  assert.equal(costOf("claude-opus-5", { input_tokens: 0, cached_tokens: 0, output_tokens: 1_000_000 }), 25);
});
test("표준 산출물 1건(Opus, 10K 입력·30K 캐시·6K 출력) ≈ $0.215", () => {
  const c = costOf("claude-opus-5", { input_tokens: 10_000, cached_tokens: 30_000, output_tokens: 6_000 });
  assert.ok(Math.abs(c - 0.215) < 0.001, String(c));
});
test("대화 1회(Haiku, 1K 입력·4K 캐시·300 출력) ≈ $0.003", () => {
  const c = costOf("claude-haiku-4-5", { input_tokens: 1_000, cached_tokens: 4_000, output_tokens: 300 });
  assert.ok(Math.abs(c - 0.0029) < 0.0005, String(c));
});
test("모르는 모델은 Sonnet 5 단가로 보수적 계산", () => { assert.equal(costOf("unknown", { input_tokens: 1_000_000, cached_tokens: 0, output_tokens: 0 }), PRICING["claude-sonnet-5"].input); });
test("한도 검사 우선순위: 크레딧 → 월 → 프로젝트 → 에이전트", () => {
  const b = { live: true, agentDailyCap: 5, agentSpentToday: 5, monthlyCap: 200, monthSpent: 200, projectBudget: 50, projectSpent: 50, creditsRemaining: 0 };
  assert.match((checkLimits(b) as { reason: string }).reason, /크레딧/);
  assert.match((checkLimits({ ...b, creditsRemaining: 10 }) as { reason: string }).reason, /월 지출/);
  assert.match((checkLimits({ ...b, creditsRemaining: 10, monthSpent: 0 }) as { reason: string }).reason, /프로젝트/);
  assert.match((checkLimits({ ...b, creditsRemaining: 10, monthSpent: 0, projectSpent: 0 }) as { reason: string }).reason, /일일/);
  assert.deepEqual(checkLimits({ ...b, creditsRemaining: 10, monthSpent: 0, projectSpent: 0, agentSpentToday: 0 }), { ok: true });
});
test("한도 0은 '무제한'", () => { assert.deepEqual(checkLimits({ live: true, agentDailyCap: 0, agentSpentToday: 99, monthlyCap: 0, monthSpent: 99, projectBudget: 0, projectSpent: 99, creditsRemaining: 1 }), { ok: true }); });
