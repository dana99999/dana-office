import { db } from "./db";
import type { LedgerRow } from "./types";

/** Anthropic API 정가 (USD / 1M tokens, 2026-06 기준). 캐시 읽기는 입력의 1/10, 캐시 쓰기는 1.25배 */
export const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};
export interface Usage { input_tokens: number; cached_tokens: number; output_tokens: number; cache_write_tokens?: number; }
export function costOf(model: string, u: Usage): number {
  const p = PRICING[model] || PRICING["claude-sonnet-5"];
  const c = (u.input_tokens * p.input + u.cached_tokens * p.cacheRead + (u.cache_write_tokens || 0) * p.cacheWrite + u.output_tokens * p.output) / 1_000_000;
  return Math.round(c * 1_000_000) / 1_000_000;
}
export function recordUsage(row: { agent_id: number; project_id: number | null; task_id: number | null; model: string; mode: "mock" | "live"; usage: Usage }): number {
  const cost = costOf(row.model, row.usage);
  db().prepare("INSERT INTO usage_ledger (agent_id, project_id, task_id, model, mode, input_tokens, cached_tokens, output_tokens, cost_usd) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(row.agent_id, row.project_id, row.task_id, row.model, row.mode, row.usage.input_tokens, row.usage.cached_tokens, row.usage.output_tokens, cost);
  if (row.task_id) db().prepare("UPDATE tasks SET cost_usd = cost_usd + ? WHERE id = ?").run(cost, row.task_id);
  return cost;
}

const today = () => "date('now','localtime')";
const month = () => "strftime('%Y-%m','now','localtime')";
export function spentToday(agentId?: number, mode: "live" | "all" = "live"): number {
  const m = mode === "live" ? "AND mode='live'" : "";
  const r = agentId
    ? db().prepare(`SELECT COALESCE(SUM(cost_usd),0) AS c FROM usage_ledger WHERE date(ts,'localtime') = ${today()} AND agent_id = ? ${m}`).get(agentId)
    : db().prepare(`SELECT COALESCE(SUM(cost_usd),0) AS c FROM usage_ledger WHERE date(ts,'localtime') = ${today()} ${m}`).get();
  return (r as { c: number }).c;
}
export function spentMonth(mode: "live" | "all" = "live"): number {
  const m = mode === "live" ? "AND mode='live'" : "";
  return (db().prepare(`SELECT COALESCE(SUM(cost_usd),0) AS c FROM usage_ledger WHERE strftime('%Y-%m',ts,'localtime') = ${month()} ${m}`).get() as { c: number }).c;
}
export function spentProject(projectId: number): number {
  return (db().prepare("SELECT COALESCE(SUM(cost_usd),0) AS c FROM usage_ledger WHERE project_id = ? AND mode='live'").get(projectId) as { c: number }).c;
}
export function creditsTotal(): number { return (db().prepare("SELECT COALESCE(SUM(amount_usd),0) AS c FROM credits").get() as { c: number }).c; }
export function creditsRemaining(): number {
  const spent = (db().prepare("SELECT COALESCE(SUM(cost_usd),0) AS c FROM usage_ledger WHERE mode='live'").get() as { c: number }).c;
  return creditsTotal() - spent;
}
export function globalLimit(): { monthly_usd: number; alert_pct: number } {
  return (db().prepare("SELECT monthly_usd, alert_pct FROM limits WHERE scope='global' AND ref_id=0").get() as { monthly_usd: number; alert_pct: number }) || { monthly_usd: 0, alert_pct: 80 };
}

/** 한도 검사 — 순수 판단 로직은 checkLimits()에, DB 조회는 여기서 */
export interface LimitInputs { live: boolean; agentDailyCap: number; agentSpentToday: number; monthlyCap: number; monthSpent: number; projectBudget: number; projectSpent: number; creditsRemaining: number; }
export function checkLimits(i: LimitInputs): { ok: true } | { ok: false; reason: string } {
  if (!i.live) return { ok: true }; // mock 모드는 실비 0 — 한도 미적용
  if (i.creditsRemaining <= 0) return { ok: false, reason: "크레딧이 없습니다. 충전 후 재개됩니다." };
  if (i.monthlyCap > 0 && i.monthSpent >= i.monthlyCap) return { ok: false, reason: `월 지출 한도 $${i.monthlyCap} 도달` };
  if (i.projectBudget > 0 && i.projectSpent >= i.projectBudget) return { ok: false, reason: `프로젝트 예산 $${i.projectBudget} 소진` };
  if (i.agentDailyCap > 0 && i.agentSpentToday >= i.agentDailyCap) return { ok: false, reason: `에이전트 일일 한도 $${i.agentDailyCap} 도달` };
  return { ok: true };
}
export function limitInputsFor(agentId: number, agentDailyCap: number, projectId: number | null, projectBudget: number, live: boolean): LimitInputs {
  return { live, agentDailyCap, agentSpentToday: spentToday(agentId), monthlyCap: globalLimit().monthly_usd, monthSpent: spentMonth(), projectBudget, projectSpent: projectId ? spentProject(projectId) : 0, creditsRemaining: creditsRemaining() };
}
export function alert(level: "info" | "warn" | "critical", body: string) { db().prepare("INSERT INTO alerts (level, body) VALUES (?,?)").run(level, body); }

export function billingSummary() {
  const d = db();
  const rows = <T>(sql: string, ...a: unknown[]) => d.prepare(sql).all(...a) as T[];
  const daily = rows<{ day: string; cost: number; mode: string }>(`SELECT date(ts,'localtime') AS day, SUM(cost_usd) AS cost, mode FROM usage_ledger WHERE ts >= datetime('now','-30 days') GROUP BY day, mode ORDER BY day`);
  const byAgent = rows<{ agent_id: number; name: string; role_title: string; calls: number; input_tokens: number; output_tokens: number; cost: number; live_cost: number; daily_cost_cap: number }>(
    `SELECT a.id AS agent_id, a.name, a.role_title, a.daily_cost_cap,
      COALESCE(SUM(CASE WHEN date(l.ts,'localtime') = ${today()} THEN 1 END),0) AS calls,
      COALESCE(SUM(CASE WHEN date(l.ts,'localtime') = ${today()} THEN l.input_tokens+l.cached_tokens END),0) AS input_tokens,
      COALESCE(SUM(CASE WHEN date(l.ts,'localtime') = ${today()} THEN l.output_tokens END),0) AS output_tokens,
      COALESCE(SUM(CASE WHEN date(l.ts,'localtime') = ${today()} THEN l.cost_usd END),0) AS cost,
      COALESCE(SUM(CASE WHEN date(l.ts,'localtime') = ${today()} AND l.mode='live' THEN l.cost_usd END),0) AS live_cost
     FROM agents a LEFT JOIN usage_ledger l ON l.agent_id = a.id WHERE a.active = 1 GROUP BY a.id ORDER BY a.id`);
  const byZone = rows<{ zone: string; cost: number }>(`SELECT a.zone, COALESCE(SUM(l.cost_usd),0) AS cost FROM agents a LEFT JOIN usage_ledger l ON l.agent_id = a.id AND strftime('%Y-%m',l.ts,'localtime') = ${month()} GROUP BY a.zone`);
  const byProject = rows<{ id: number; name: string; budget_usd: number; cost: number }>(`SELECT p.id, p.name, p.budget_usd, COALESCE(SUM(l.cost_usd),0) AS cost FROM projects p LEFT JOIN usage_ledger l ON l.project_id = p.id WHERE p.status='active' GROUP BY p.id`);
  const recent = rows<LedgerRow & { agent_name: string }>(`SELECT l.*, a.name AS agent_name FROM usage_ledger l JOIN agents a ON a.id = l.agent_id ORDER BY l.id DESC LIMIT 12`);
  const credits = rows<{ id: number; ts: string; amount_usd: number; receipt_ref: string; note: string }>("SELECT * FROM credits ORDER BY id DESC");
  const alerts = rows<{ id: number; ts: string; level: string; body: string }>("SELECT * FROM alerts ORDER BY id DESC LIMIT 8");
  const liveMode = !!process.env.ANTHROPIC_API_KEY && !!(d.prepare("SELECT enabled FROM features WHERE key='live_llm'").get() as { enabled: number } | undefined)?.enabled;
  return { today: spentToday(undefined, "all"), todayLive: spentToday(), month: spentMonth("all"), monthLive: spentMonth(), creditsTotal: creditsTotal(), creditsRemaining: creditsRemaining(), limit: globalLimit(), daily, byAgent, byZone, byProject, recent, credits, alerts, liveMode, outputsToday: (d.prepare(`SELECT COUNT(*) AS c FROM artifacts WHERE date(created_at,'localtime') = ${today()}`).get() as { c: number }).c };
}
