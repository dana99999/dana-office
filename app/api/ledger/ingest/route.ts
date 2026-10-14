import { NextResponse } from "next/server";
import { ledgerOp, LedgerError } from "@/lib/ledger";
export const dynamic = "force-dynamic";
/**
 * 외부 수신 — 클로드 코드가 계약·입금·지급·계산서를 프로젝트별로 기록.
 * 헤더 Authorization: Bearer <INGEST_TOKEN> (.env.local). body는 /api/ledger 와 같은 op 형식.
 */
export async function POST(req: Request) {
  const token = process.env.INGEST_TOKEN; if (!token) return NextResponse.json({ error: "INGEST_TOKEN 미설정" }, { status: 503 });
  if ((req.headers.get("authorization") || "") !== `Bearer ${token}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try { return NextResponse.json({ ok: true, ...(ledgerOp(b, String(b.source || "Claude Code")) as object) }); }
  catch (e) { if (e instanceof LedgerError) return NextResponse.json({ error: e.message }, { status: 400 }); throw e; }
}
