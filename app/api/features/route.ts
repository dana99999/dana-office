import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Feature } from "@/lib/types";
export async function GET() { const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 }); return NextResponse.json({ features: db().prepare("SELECT * FROM features ORDER BY rowid").all() as Feature[], live: !!process.env.ANTHROPIC_API_KEY, genspark_api: !!process.env.GENSPARK_API_URL }); }
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { key?: string; enabled?: boolean; config?: Record<string, unknown> };
  if (!b.key) return NextResponse.json({ error: "key" }, { status: 400 });
  const d = db();
  if (b.enabled !== undefined) d.prepare("UPDATE features SET enabled = ? WHERE key = ?").run(b.enabled ? 1 : 0, b.key);
  if (b.config) d.prepare("UPDATE features SET config_json = ? WHERE key = ?").run(JSON.stringify(b.config), b.key);
  return NextResponse.json({ ok: true });
}
