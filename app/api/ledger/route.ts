import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ledgerOp, LedgerError } from "@/lib/ledger";
export const dynamic = "force-dynamic";
/** 화면용 — 대표 세션만. body: { op: list|deal|deal_delete|entry|update|delete|batch, ... } (lib/ledger.ts) */
export async function GET() { const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 }); return NextResponse.json(ledgerOp({ op: "list" }, "manual")); }
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try { return NextResponse.json({ ok: true, ...(ledgerOp(b, "manual") as object) }); }
  catch (e) { if (e instanceof LedgerError) return NextResponse.json({ error: e.message }, { status: 400 }); throw e; }
}
