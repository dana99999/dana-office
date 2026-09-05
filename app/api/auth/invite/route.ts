import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { issueSession, cookieOptions } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/token";
import type { User } from "@/lib/types";

/** 초대 코드로 첫 출근: 비밀번호 설정 → 세션 발급 → /onboarding */
export async function POST(req: Request) {
  const { code, password } = (await req.json().catch(() => ({}))) as { code?: string; password?: string };
  if (!code || !password) return NextResponse.json({ error: "초대 코드와 비밀번호를 입력하세요." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  const d = db();
  const u = d.prepare("SELECT * FROM users WHERE invite_code = ? AND password_hash IS NULL").get(code.trim().toUpperCase()) as User | undefined;
  if (!u) return NextResponse.json({ error: "유효하지 않거나 이미 사용된 초대 코드입니다." }, { status: 404 });
  d.prepare("UPDATE users SET password_hash = ?, invite_code = NULL WHERE id = ?").run(hashPassword(password), u.id);
  const res = NextResponse.json({ ok: true, username: u.username });
  res.cookies.set(SESSION_COOKIE, await issueSession({ ...u, invite_code: null }), cookieOptions());
  return res;
}
