/**
 * 단일 진입점 — 서버 전체에서 Anthropic SDK를 호출하는 경로는 이 파일의 runQueuedTask 하나뿐이다.
 * 네 겹의 잠금(gate)을 통과하지 못하면 호출 자체가 일어나지 않는다. (과금 0 보장)
 */
import { db } from "../db";
import type { Agent, Project, Task, PresenceState } from "../types";
import { checkLimits, limitInputsFor, recordUsage, alert, spentMonth, globalLimit, creditsRemaining, type LimitInputs } from "../billing";
import { mockRun } from "./mock";
import { liveRun } from "./live";
import { createImageRequest } from "../image/genspark";
import type { AgentOutput } from "./schema";

export interface GateInput { agentActive: boolean; presenceState: PresenceState | "online"; taskStatus: string; taskAssignee: number | null; agentId: number; projectStatus: string; aiAllowed: boolean; limits: LimitInputs; }
export function gate(i: GateInput): { ok: true } | { ok: false; reason: string } {
  if (!i.agentActive) return { ok: false, reason: "비활성 에이전트" };
  if (i.presenceState !== "work") return { ok: false, reason: `근무 상태가 아님 (${i.presenceState}) — 호출 없음` };
  if (i.taskAssignee !== i.agentId) return { ok: false, reason: "이 에이전트에게 배정된 작업이 아님" };
  if (i.taskStatus !== "queued" && i.taskStatus !== "doing") return { ok: false, reason: `작업 상태 ${i.taskStatus} — 실행 대상 아님` };
  if (i.projectStatus !== "active") return { ok: false, reason: "프로젝트가 진행 중이 아님" };
  if (!i.aiAllowed) return { ok: false, reason: "클라이언트가 AI 사용을 허용하지 않은 프로젝트 (ai_allowed=false)" };
  const l = checkLimits(i.limits); if (!l.ok) return l;
  return { ok: true };
}
export function isLiveMode(): boolean {
  const f = db().prepare("SELECT enabled FROM features WHERE key='live_llm'").get() as { enabled: number } | undefined;
  return !!process.env.ANTHROPIC_API_KEY && !!f?.enabled;
}
export interface RunResult { ok: boolean; reason?: string; message?: string; title?: string; artifactId?: number; mode: "mock" | "live"; cost: number; }

export async function runQueuedTask(agentId: number, taskId: number, ctx: { presenceState: PresenceState | "online" }): Promise<RunResult> {
  const d = db();
  const agent = d.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as Agent | undefined;
  const task = d.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Task | undefined;
  if (!agent || !task) return { ok: false, reason: "에이전트 또는 작업 없음", mode: "mock", cost: 0 };
  const project = d.prepare("SELECT * FROM projects WHERE id = ?").get(task.project_id) as Project | undefined;
  if (!project) return { ok: false, reason: "프로젝트 없음", mode: "mock", cost: 0 };
  const live = isLiveMode();
  const g = gate({ agentActive: !!agent.active, presenceState: ctx.presenceState, taskStatus: task.status, taskAssignee: task.assignee_agent_id, agentId, projectStatus: project.status, aiAllowed: !!project.ai_allowed, limits: limitInputsFor(agentId, agent.daily_cost_cap, project.id, project.budget_usd, live) });
  if (!g.ok) {
    if (/한도|크레딧|예산/.test(g.reason)) { d.prepare("UPDATE tasks SET status='blocked', updated_at=datetime('now') WHERE id = ?").run(taskId); alert("warn", `${agent.name} 「${task.title}」 보류: ${g.reason}`); }
    return { ok: false, reason: g.reason, mode: live ? "live" : "mock", cost: 0 };
  }
  d.prepare("UPDATE tasks SET status='doing', updated_at=datetime('now') WHERE id = ?").run(taskId);
  d.prepare("INSERT INTO office_events (actor_kind, actor_id, type, payload_json) VALUES ('agent',?,?,?)").run(agentId, "task_start", JSON.stringify({ taskId, mode: live ? "live" : "mock" }));
  const tools: string[] = JSON.parse(agent.tools_json || "[]");
  let out: AgentOutput, usage: { input_tokens: number; cached_tokens: number; output_tokens: number; cache_write_tokens?: number };
  try {
    if (live) { const r = await liveRun(agent, task, project, tools); out = r.out; usage = r.usage; }
    else { const r = mockRun(agent, task, project); out = r.out; usage = r.usage; }
  } catch (e) {
    const msg = (e as Error).message;
    d.prepare("UPDATE tasks SET status='blocked', updated_at=datetime('now') WHERE id = ?").run(taskId);
    alert("critical", `${agent.name} 「${task.title}」 실행 실패: ${msg}`);
    return { ok: false, reason: msg, mode: live ? "live" : "mock", cost: 0 };
  }
  const cost = recordUsage({ agent_id: agentId, project_id: project.id, task_id: taskId, model: agent.model, mode: live ? "live" : "mock", usage });
  const art = d.prepare("INSERT INTO artifacts (task_id, agent_id, kind, title, body_md, status) VALUES (?,?,?,?,?,'review')").run(taskId, agentId, out.kind, out.title.slice(0, 80), out.body_md);
  const artifactId = Number(art.lastInsertRowid);
  const imgFeature = d.prepare("SELECT enabled FROM features WHERE key='image_genspark'").get() as { enabled: number } | undefined;
  if (out.image_request && tools.includes("request_image") && imgFeature?.enabled) {
    await createImageRequest({ task_id: taskId, artifact_id: artifactId, agent_id: agentId, prompt: out.image_request.prompt, style: out.image_request.style, size: out.image_request.size });
  }
  d.prepare("UPDATE tasks SET status='review', updated_at=datetime('now') WHERE id = ?").run(taskId);
  d.prepare("INSERT INTO office_events (actor_kind, actor_id, type, payload_json) VALUES ('agent',?,?,?)").run(agentId, "task_done", JSON.stringify({ taskId, artifactId, cost }));
  if (live) checkAlerts();
  return { ok: true, message: out.message, title: out.title, artifactId, mode: live ? "live" : "mock", cost };
}

function checkAlerts() {
  const lim = globalLimit(); const m = spentMonth();
  if (lim.monthly_usd > 0 && m >= lim.monthly_usd * (lim.alert_pct / 100)) alert("warn", `이번 달 지출 $${m.toFixed(2)} — 월 한도의 ${lim.alert_pct}% 도달`);
  if (creditsRemaining() <= 20) alert("warn", `잔여 크레딧 $${creditsRemaining().toFixed(2)} — 충전이 필요합니다`);
}
