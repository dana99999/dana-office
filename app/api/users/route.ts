import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, newInviteCode } from "@/lib/db";
import { listUsers } from "@/lib/queries";
import { FREE_SEATS } from "@/lib/world/map";
export async function GET() { const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 }); return NextResponse.json({ users: listUsers() }); }
/** 관리자 — 직원 초대 (초대 코드 발급) */
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { username?: string; display_name?: string; role?: "staff" | "ceo" | "viewer" };
  if (!b.username || !b.display_name) return NextResponse.json({ error: "아이디·이름 필요" }, { status: 400 });
  const d = db(); const used = (d.prepare("SELECT seat_x, seat_y FROM users").all() as { seat_x: number; seat_y: number }[]).map((r) => `${r.seat_x},${r.seat_y}`);
  const seat = FREE_SEATS.find((t) => !used.includes(t.join(","))) || FREE_SEATS[0];
  try {
    const r = d.prepare("INSERT INTO users (username, role, display_name, invite_code, seat_x, seat_y) VALUES (?,?,?,?,?,?)").run(b.username.trim().toLowerCase(), b.role || "staff", b.display_name.slice(0, 20), newInviteCode(), seat[0], seat[1]);
    return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
  } catch { return NextResponse.json({ error: "이미 있는 아이디" }, { status: 409 }); }
}
