import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorld } from "@/lib/world/engine";
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { id } = await ctx.params; const pid = Number(id);
  const b = (await req.json().catch(() => ({}))) as { status?: string; ai_allowed?: boolean; budget_usd?: number; brief?: string; team?: number[] };
  const d = db();
  if (b.status) d.prepare("UPDATE projects SET status = ? WHERE id = ?").run(b.status, pid);
  if (b.ai_allowed !== undefined) d.prepare("UPDATE projects SET ai_allowed = ? WHERE id = ?").run(b.ai_allowed ? 1 : 0, pid);
  if (b.budget_usd !== undefined) d.prepare("UPDATE projects SET budget_usd = ? WHERE id = ?").run(Number(b.budget_usd), pid);
  if (b.brief !== undefined) d.prepare("UPDATE projects SET brief = ? WHERE id = ?").run(b.brief.slice(0, 4000), pid);
  if (b.team) { d.prepare("DELETE FROM assignments WHERE project_id = ?").run(pid); const ins = d.prepare("INSERT INTO assignments (project_id, agent_id) VALUES (?,?)"); for (const a of b.team) ins.run(pid, a); }
  const w = getWorld(); w.notifyTasksChanged(); for (const a of w.roster()) w.clearManual(a.id);
  return NextResponse.json({ ok: true });
}

/** 프로젝트 삭제 — 작업·산출물·편성이 함께 지워진다(FK CASCADE). 관련 지시 기록은 '직접 지시' 프로젝트로 옮겨 보존 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 });
  const { id } = await ctx.params; const pid = Number(id); const d = db();
  const p = d.prepare("SELECT * FROM projects WHERE id = ?").get(pid) as { type: string; name: string } | undefined; if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (p.type === "직접 지시") return NextResponse.json({ error: "「직접 지시」 프로젝트는 채팅 지시의 기본 보관함이라 삭제할 수 없습니다" }, { status: 400 });
  let direct = d.prepare("SELECT id FROM projects WHERE type='직접 지시' LIMIT 1").get() as { id: number } | undefined;
  if (!direct) direct = { id: Number(d.prepare("INSERT INTO projects (client, name, type, brief, budget_usd) VALUES ('내부','직접 지시','직접 지시','채팅·프로필에서 바로 시킨 단건 업무',30)").run().lastInsertRowid) };
  d.transaction(() => { d.prepare("UPDATE directives SET project_id = ? WHERE project_id = ?").run(direct!.id, pid); d.prepare("DELETE FROM projects WHERE id = ?").run(pid); })();
  const w = getWorld(); w.notifyTasksChanged(); for (const a of w.roster()) w.clearManual(a.id); w.say("system", 0, "무결", `${s.name}님이 프로젝트 「${p.name}」 삭제`);
  return NextResponse.json({ ok: true });
}
