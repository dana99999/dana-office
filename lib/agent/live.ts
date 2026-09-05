import Anthropic from "@anthropic-ai/sdk";
import type { Agent, Project, Task } from "../types";
import { db } from "../db";
import { OUTPUT_SCHEMA, type AgentOutput } from "./schema";
import { toolById } from "./tools";

let client: Anthropic | null = null;
function getClient() { if (!client) client = new Anthropic(); return client; }

function brandBible(): string {
  const f = db().prepare("SELECT config_json FROM features WHERE key='brand_bible'").get() as { config_json: string } | undefined;
  try { return (JSON.parse(f?.config_json || "{}").text as string) || ""; } catch { return ""; }
}
function approverName(agent: Agent): string {
  if (!agent.approver_user_id) return "대표";
  const u = db().prepare("SELECT display_name FROM users WHERE id = ?").get(agent.approver_user_id) as { display_name: string } | undefined;
  return u?.display_name || "대표";
}
function recentContext(task: Task): string {
  const rows = db().prepare("SELECT a.title, a.status, a.reason FROM artifacts a JOIN tasks t ON t.id = a.task_id WHERE t.project_id = ? ORDER BY a.id DESC LIMIT 6").all(task.project_id) as { title: string; status: string; reason: string | null }[];
  if (!rows.length) return "(이 프로젝트의 이전 산출물 없음)";
  return rows.map((r) => `- ${r.title} [${r.status}]${r.reason ? ` — 반려 사유: ${r.reason}` : ""}`).join("\n");
}

export async function liveRun(agent: Agent, task: Task, project: Project, tools: string[]): Promise<{ out: AgentOutput; usage: { input_tokens: number; cached_tokens: number; output_tokens: number; cache_write_tokens: number } }> {
  const toolLines = tools.map((t) => toolById(t)).filter(Boolean).map((t) => `- ${t!.id}: ${t!.desc}`).join("\n");
  const system = [
    `당신은 다나나인(디자인·브랜딩 회사)의 AI 담당자 「${agent.name}」, 직무는 ${agent.role_title}입니다.`,
    `페르소나: ${agent.persona}`,
    `회사 규칙: 과장·최상급 표현 금지. 확인되지 않은 수치는 '추정' 표시. 외부 발송·게시는 절대 하지 않고 초안만 만든다. 모든 산출물은 ${approverName(agent)}의 승인을 거친다.`,
    brandBible() ? `브랜드 바이블:\n${brandBible()}` : "",
    `사용 가능한 툴:\n${toolLines || "- (없음)"}`,
    `출력은 반드시 JSON 스키마를 따른다. body_md는 승인자가 바로 읽을 수 있게 제목·표·목록으로 구조화한 한국어 마크다운. image_request는 request_image 툴이 있고 이미지가 꼭 필요할 때만 채우고, 아니면 null.`,
  ].filter(Boolean).join("\n\n");
  const user = `프로젝트: ${project.name} (${project.client}) · 유형 ${project.type}\n프로젝트 브리프: ${project.brief || "(없음)"}\n\n이전 산출물과 승인/반려 이력:\n${recentContext(task)}\n\n이번 작업: ${task.title}\n작업 브리프: ${task.brief || "(없음)"}\n\n위 작업의 산출물을 만들어 JSON으로 답하세요.`;
  const model = agent.model || "claude-sonnet-5";
  const isHaiku = /haiku/.test(model);
  const useSearch = tools.includes("search_web") && !isHaiku;
  const res = await getClient().messages.create({
    model,
    max_tokens: 12000,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
    ...(isHaiku ? {} : { thinking: { type: "adaptive" as const } }),
    output_config: { ...(isHaiku ? {} : { effort: (agent.effort as "low" | "medium" | "high") || "medium" }), format: { type: "json_schema", schema: OUTPUT_SCHEMA as unknown as Record<string, unknown> } },
    ...(useSearch ? { tools: [{ type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 3 }] } : {}),
  });
  if (res.stop_reason === "refusal") throw new Error(`모델이 요청을 거절했습니다${res.stop_details && "explanation" in res.stop_details ? `: ${(res.stop_details as { explanation?: string }).explanation || ""}` : ""}`);
  const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
  let out: AgentOutput;
  try { out = JSON.parse(text) as AgentOutput; } catch { throw new Error("모델 출력이 JSON이 아닙니다"); }
  if (!out.title || !out.body_md) throw new Error("모델 출력에 제목/본문이 없습니다");
  return { out, usage: { input_tokens: res.usage.input_tokens, cached_tokens: res.usage.cache_read_input_tokens || 0, cache_write_tokens: res.usage.cache_creation_input_tokens || 0, output_tokens: res.usage.output_tokens } };
}
