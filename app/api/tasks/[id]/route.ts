import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorld } from "@/lib/world/engine";
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { id } = await ctx.params; const tid = Number(id);
  const b = (await req.json().catch(() => ({}))) as { status?: string; agentId?: number | null; priority?: number; title?: string; brief?: string };
  const d = db();
  if (b.status && ["queued", "doing", "review", "approved", "rejected", "blocked"].includes(b.status)) {
    d.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(b.status, tid);
    if (b.status === "approved") d.prepare("UPDATE artifacts SET status='approved', approved_by=? WHERE id = (SELECT id FROM artifacts WHERE task_id = ? ORDER BY id DESC LIMIT 1)").run(s.uid, tid);
    if (b.status === "review") d.prepare("UPDATE artifacts SET status='review', approved_by=NULL, reason=NULL WHERE id = (SELECT id FROM artifacts WHERE task_id = ? ORDER BY id DESC LIMIT 1)").run(tid);
  }
  if (b.agentId !== undefined) { d.prepare("UPDATE tasks SET assignee_agent_id = ?, updated_at = datetime('now') WHERE id = ?").run(b.agentId, tid); if (b.agentId) { const t = d.prepare("SELECT project_id FROM tasks WHERE id = ?").get(tid) as { project_id: number }; d.prepare("INSERT OR IGNORE INTO assignments (project_id, agent_id) VALUES (?,?)").run(t.project_id, b.agentId); } }
  if (b.priority) d.prepare("UPDATE tasks SET priority = ? WHERE id = ?").run(b.priority, tid);
  if (b.title) d.prepare("UPDATE tasks SET title = ? WHERE id = ?").run(b.title.slice(0, 120), tid);
  if (b.brief !== undefined) d.prepare("UPDATE tasks SET brief = ? WHERE id = ?").run(b.brief.slice(0, 4000), tid);
  getWorld().notifyTasksChanged();
  return NextResponse.json({ ok: true });
}
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { id } = await ctx.params; db().prepare("DELETE FROM tasks WHERE id = ?").run(Number(id)); getWorld().notifyTasksChanged(); return NextResponse.json({ ok: true });
}
