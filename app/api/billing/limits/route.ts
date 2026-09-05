import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { monthly_usd?: number; alert_pct?: number };
  db().prepare("INSERT INTO limits (scope, ref_id, monthly_usd, alert_pct) VALUES ('global',0,?,?) ON CONFLICT(scope, ref_id) DO UPDATE SET monthly_usd=excluded.monthly_usd, alert_pct=excluded.alert_pct").run(Number(b.monthly_usd ?? 200), Number(b.alert_pct ?? 80));
  return NextResponse.json({ ok: true });
}
