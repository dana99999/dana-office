import { NextResponse } from "next/server";
import { getSession, userById } from "@/lib/auth";
import { getWorld } from "@/lib/world/engine";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 });
  const u = userById(s.uid); const world = getWorld(); if (u && u.role !== "viewer") world.humanPing(u.id);
  const msgs = (db().prepare("SELECT id, ts, channel, sender_kind AS kind, sender_id AS id2, sender_name AS name, body FROM messages ORDER BY id DESC LIMIT 40").all() as unknown[]).reverse();
  return NextResponse.json({ snapshot: world.snapshot(), roster: world.roster(), messages: msgs });
}
