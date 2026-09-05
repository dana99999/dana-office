import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { amount_usd?: number; receipt_ref?: string; note?: string };
  if (!b.amount_usd || b.amount_usd <= 0) return NextResponse.json({ error: "금액" }, { status: 400 });
  db().prepare("INSERT INTO credits (amount_usd, receipt_ref, note) VALUES (?,?,?)").run(Number(b.amount_usd), (b.receipt_ref || "").slice(0, 80), (b.note || "").slice(0, 200));
  return NextResponse.json({ ok: true });
}
