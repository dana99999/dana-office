import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWorld } from "@/lib/world/engine";
import { archiveExternal, startDirective } from "@/lib/world/directive";
import type { User } from "@/lib/types";
export const dynamic = "force-dynamic";
/**
 * 외부 수신 — 클로드 코드(PC·텔레그램) 등에서 토큰으로 호출.
 *   mode "archive"  : 내용을 그대로 아카이브 문서로 보관 (비용 0)
 *   mode "dispatch" : 전체 지시로 접수 → PM 무결이 담당자 배정 → 산출물 → 종합 아카이브
 * 헤더 Authorization: Bearer <INGEST_TOKEN>  (.env.local)
 */
export async function POST(req: Request) {
  const token = process.env.INGEST_TOKEN; if (!token) return NextResponse.json({ error: "INGEST_TOKEN 미설정" }, { status: 503 });
  const auth = req.headers.get("authorization") || ""; if (auth !== `Bearer ${token}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { mode?: string; title?: string; body?: string; source?: string; username?: string; client?: string };
  const mode = b.mode === "dispatch" ? "dispatch" : "archive"; const title = (b.title || "").trim(); const body = (b.body || "").trim(); const source = (b.source || "Claude Code").slice(0, 40);
  if (!title) return NextResponse.json({ error: "title 필요" }, { status: 400 });
  const u = db().prepare("SELECT * FROM users WHERE username = ?").get(b.username || "ted") as User | undefined; if (!u) return NextResponse.json({ error: "사용자 없음" }, { status: 400 });
  const w = getWorld(); w.humanJoin(u);
  if (mode === "archive") { const r = archiveExternal(w, u, { title, body: body || title, source, client: b.client }); return NextResponse.json({ ok: true, mode, ...r, url: `/artifacts/${r.artifactId}` }); }
  const dir = startDirective(w, u, title, { source, context: body || undefined, client: b.client });
  if (!dir) return NextResponse.json({ error: "배정할 담당자를 찾지 못했습니다" }, { status: 422 });
  const team = (JSON.parse(dir.member_task_ids) as number[]).map((id) => db().prepare("SELECT a.name, a.role_title, t.title FROM tasks t JOIN agents a ON a.id = t.assignee_agent_id WHERE t.id = ?").get(id));
  return NextResponse.json({ ok: true, mode, directiveId: dir.id, team, url: "/archive" });
}
