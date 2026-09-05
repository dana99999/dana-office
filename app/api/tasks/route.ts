import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorld } from "@/lib/world/engine";
import { listTasks } from "@/lib/queries";
export async function GET() { const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 }); return NextResponse.json({ tasks: listTasks() }); }
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { projectId?: number; title?: string; brief?: string; agentId?: number | null; priority?: number; due?: string };
  if (!b.projectId || !b.title) return NextResponse.json({ error: "projectId, title 필요" }, { status: 400 });
  const d = db();
  if (b.agentId) d.prepare("INSERT OR IGNORE INTO assignments (project_id, agent_id) VALUES (?,?)").run(b.projectId, b.agentId);
  const r = d.prepare("INSERT INTO tasks (project_id, title, brief, requester_id, assignee_agent_id, priority, due) VALUES (?,?,?,?,?,?,?)").run(b.projectId, b.title.slice(0, 120), (b.brief || "").slice(0, 4000), s.uid, b.agentId || null, b.priority || 2, b.due || null);
  getWorld().notifyTasksChanged();
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
