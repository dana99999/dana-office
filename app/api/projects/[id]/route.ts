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
