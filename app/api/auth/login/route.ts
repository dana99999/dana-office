import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { issueSession, cookieOptions } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/token";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  const { username, password } = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  if (!username || !password) return NextResponse.json({ error: "아이디와 비밀번호를 입력하세요." }, { status: 400 });
  const u = db().prepare("SELECT * FROM users WHERE username = ?").get(username.trim().toLowerCase()) as (User & { password_hash: string | null }) | undefined;
  if (!u || !u.password_hash) return NextResponse.json({ error: "계정이 없거나 아직 초대 코드로 첫 출근을 하지 않았습니다." }, { status: 401 });
  if (!verifyPassword(password, u.password_hash)) return NextResponse.json({ error: "비밀번호가 맞지 않습니다." }, { status: 401 });
  const res = NextResponse.json({ ok: true, onboarded: !!u.onboarded, role: u.role });
  res.cookies.set(SESSION_COOKIE, await issueSession(u), cookieOptions());
  return res;
}
