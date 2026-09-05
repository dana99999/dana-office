import { NextResponse } from "next/server";
import { getSession, userById } from "@/lib/auth";
import { getWorld } from "@/lib/world/engine";
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { body } = (await req.json().catch(() => ({}))) as { body?: string };
  const text = (body || "").trim().slice(0, 500); if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const u = userById(s.uid); if (!u) return new NextResponse("no user", { status: 401 });
  const w = getWorld(); w.humanJoin(u); w.humanSay(u, text);
  return NextResponse.json({ ok: true });
}
