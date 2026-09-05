import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 });
  const { current, next } = (await req.json().catch(() => ({}))) as { current?: string; next?: string };
  if (!next || next.length < 8) return NextResponse.json({ error: "새 비밀번호는 8자 이상" }, { status: 400 });
  const row = db().prepare("SELECT password_hash FROM users WHERE id = ?").get(s.uid) as { password_hash: string | null };
  if (!verifyPassword(current || "", row.password_hash)) return NextResponse.json({ error: "현재 비밀번호가 맞지 않습니다." }, { status: 401 });
  db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), s.uid);
  return NextResponse.json({ ok: true });
}
