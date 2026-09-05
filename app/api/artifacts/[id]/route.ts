import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorld } from "@/lib/world/engine";
/** 승인 / 반려 — 반려 사유는 필수이며 다음 프롬프트에 주입된다 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { id } = await ctx.params; const aid = Number(id);
  const b = (await req.json().catch(() => ({}))) as { action?: "approve" | "reject"; reason?: string; retry?: boolean };
  const d = db();
  const art = d.prepare("SELECT ar.*, ag.approver_user_id, ag.name AS agent_name, t.title AS task_title FROM artifacts ar JOIN agents ag ON ag.id = ar.agent_id JOIN tasks t ON t.id = ar.task_id WHERE ar.id = ?").get(aid) as { task_id: number; approver_user_id: number | null; agent_name: string; task_title: string } | undefined;
  if (!art) return NextResponse.json({ error: "not found" }, { status: 404 });
  const canApprove = s.role === "ceo" || (art.approver_user_id === s.uid);
  if (!canApprove) return NextResponse.json({ error: "이 산출물의 1차 승인자가 아닙니다" }, { status: 403 });
  if (b.action === "approve") {
    d.prepare("UPDATE artifacts SET status='approved', approved_by=?, reason=NULL WHERE id=?").run(s.uid, aid);
    d.prepare("UPDATE tasks SET status='approved', updated_at=datetime('now') WHERE id=?").run(art.task_id);
    getWorld().say("system", 0, "무결", `${s.name}님이 ${art.agent_name}의 「${art.task_title}」 승인`);
  } else if (b.action === "reject") {
    if (!b.reason || b.reason.trim().length < 2) return NextResponse.json({ error: "반려 사유는 필수입니다" }, { status: 400 });
    d.prepare("UPDATE artifacts SET status='rejected', approved_by=?, reason=? WHERE id=?").run(s.uid, b.reason.trim().slice(0, 1000), aid);
    // 재작업: 반려 사유를 브리프에 덧붙여 큐로 되돌림 (retry=false면 종료)
    if (b.retry !== false) d.prepare("UPDATE tasks SET status='queued', brief = brief || char(10) || '[반려 사유] ' || ?, updated_at=datetime('now') WHERE id=?").run(b.reason.trim(), art.task_id);
    else d.prepare("UPDATE tasks SET status='rejected', updated_at=datetime('now') WHERE id=?").run(art.task_id);
    getWorld().say("system", 0, "무결", `${s.name}님이 「${art.task_title}」 반려 — ${b.reason.trim().slice(0, 40)}`);
  } else return NextResponse.json({ error: "action" }, { status: 400 });
  getWorld().notifyTasksChanged();
  return NextResponse.json({ ok: true });
}
