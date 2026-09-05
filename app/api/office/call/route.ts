import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorld } from "@/lib/world/engine";
/** 호출 / 내보내기 / 자동(편성 기준) */
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { agentId, action } = (await req.json().catch(() => ({}))) as { agentId?: number; action?: "call" | "dismiss" | "auto" };
  if (!agentId) return NextResponse.json({ error: "agentId" }, { status: 400 });
  const w = getWorld();
  if (action === "dismiss") w.dismissAgent(agentId, s.name); else if (action === "auto") w.clearManual(agentId); else w.callAgent(agentId, s.name);
  return NextResponse.json({ ok: true, roster: w.roster() });
}
