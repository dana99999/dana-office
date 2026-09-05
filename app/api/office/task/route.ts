import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorld } from "@/lib/world/engine";
import { db } from "@/lib/db";
/** 업무 지시: 에이전트에게 작업 1건 배정 (프로젝트 미지정 시 '직접 지시' 프로젝트) */
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { agentId?: number; title?: string; brief?: string; projectId?: number; priority?: number };
  if (!b.agentId || !b.title) return NextResponse.json({ error: "agentId, title 필요" }, { status: 400 });
  const d = db();
  let pid = b.projectId;
  if (!pid) {
    const assigned = d.prepare("SELECT p.id FROM projects p JOIN assignments a ON a.project_id = p.id WHERE a.agent_id = ? AND p.status='active' ORDER BY p.id DESC LIMIT 1").get(b.agentId) as { id: number } | undefined;
    if (assigned) pid = assigned.id;
    else {
      const direct = d.prepare("SELECT id FROM projects WHERE type='직접 지시' AND status='active' LIMIT 1").get() as { id: number } | undefined;
      pid = direct ? direct.id : Number(d.prepare("INSERT INTO projects (client, name, type, brief, budget_usd) VALUES ('내부','직접 지시','직접 지시','채팅·프로필에서 바로 시킨 단건 업무',30)").run().lastInsertRowid);
      d.prepare("INSERT OR IGNORE INTO assignments (project_id, agent_id) VALUES (?,?)").run(pid, b.agentId);
    }
  }
  const r = d.prepare("INSERT INTO tasks (project_id, title, brief, requester_id, assignee_agent_id, priority) VALUES (?,?,?,?,?,?)").run(pid, b.title.slice(0, 120), (b.brief || "").slice(0, 4000), s.uid, b.agentId, b.priority || 2);
  const w = getWorld(); w.notifyTasksChanged();
  const a = w.roster().find((x) => x.id === b.agentId);
  w.say("system", 0, "무결", `${s.name}님이 ${a?.name || "AI"}에게 「${b.title}」 배정`);
  return NextResponse.json({ ok: true, taskId: Number(r.lastInsertRowid), projectId: pid });
}
