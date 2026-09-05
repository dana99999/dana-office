import { NextResponse } from "next/server";
import { getSession, issueSession, cookieOptions, userById } from "@/lib/auth";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/token";
import { getWorld } from "@/lib/world/engine";
/** 내 캐릭터 저장 (온보딩 완료) */
export async function PATCH(req: Request) {
  const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { sprite_json?: string; display_name?: string };
  const d = db();
  if (b.sprite_json) { try { JSON.parse(b.sprite_json); } catch { return NextResponse.json({ error: "sprite_json" }, { status: 400 }); } d.prepare("UPDATE users SET sprite_json = ?, onboarded = 1 WHERE id = ?").run(b.sprite_json, s.uid); }
  if (b.display_name) d.prepare("UPDATE users SET display_name = ? WHERE id = ?").run(b.display_name.slice(0, 20), s.uid);
  const u = userById(s.uid)!; getWorld().humanJoin(u);
  const res = NextResponse.json({ ok: true }); res.cookies.set(SESSION_COOKIE, await issueSession(u), cookieOptions()); return res;
}
export async function GET() { const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 }); const u = userById(s.uid); return NextResponse.json({ user: u ? { id: u.id, username: u.username, role: u.role, display_name: u.display_name, sprite_json: u.sprite_json, onboarded: u.onboarded } : null }); }
