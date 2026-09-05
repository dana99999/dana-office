import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorld } from "@/lib/world/engine";
import { listProjects, assignmentsOf } from "@/lib/queries";
export async function GET() { const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 }); return NextResponse.json({ projects: listProjects().map((p) => ({ ...p, team: assignmentsOf(p.id) })) }); }
/** 프로젝트 생성 — 유형의 기본 편성표대로 assignments 생성 → 다음 tick에 호출됨 */
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { client?: string; name?: string; type?: string; brief?: string; budget_usd?: number; ai_allowed?: boolean; team?: number[] };
  if (!b.name || !b.type) return NextResponse.json({ error: "이름과 유형 필요" }, { status: 400 });
  const d = db();
  const r = d.prepare("INSERT INTO projects (client, name, type, brief, budget_usd, ai_allowed) VALUES (?,?,?,?,?,?)").run((b.client || "").slice(0, 60), b.name.slice(0, 80), b.type, (b.brief || "").slice(0, 4000), Number(b.budget_usd ?? 50), b.ai_allowed === false ? 0 : 1);
  const pid = Number(r.lastInsertRowid);
  let team = b.team;
  if (!team) { const t = d.prepare("SELECT default_team_json FROM project_types WHERE name = ?").get(b.type) as { default_team_json: string } | undefined; const slugs: string[] = t ? JSON.parse(t.default_team_json) : []; team = (d.prepare(`SELECT id FROM agents WHERE slug IN (${slugs.map(() => "?").join(",") || "''"})`).all(...slugs) as { id: number }[]).map((x) => x.id); }
  const ins = d.prepare("INSERT OR IGNORE INTO assignments (project_id, agent_id) VALUES (?,?)"); for (const id of team) ins.run(pid, id);
  const w = getWorld(); w.notifyTasksChanged(); w.say("system", 0, "무결", `「${b.name}」 편성 완료 — ${team.length}명 호출`);
  return NextResponse.json({ ok: true, id: pid });
}
