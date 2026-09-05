import { NextResponse } from "next/server";
import { getSession, userById } from "@/lib/auth";
import { getWorld } from "@/lib/world/engine";
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { to?: [number, number]; dx?: number; dy?: number };
  const w = getWorld(); const u = userById(s.uid); if (u) w.humanJoin(u);
  const ok = b.to ? w.humanMove(s.uid, [Number(b.to[0]), Number(b.to[1])]) : w.humanStep(s.uid, Number(b.dx || 0), Number(b.dy || 0));
  return NextResponse.json({ ok });
}
