import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setDirectiveClient, knownClients, deleteDirective } from "@/lib/world/directive";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { id } = await params; const b = (await req.json().catch(() => ({}))) as { client?: string };
  setDirectiveClient(Number(id), b.client || "");
  return NextResponse.json({ ok: true, clients: knownClients() });
}

/** 아카이브 삭제 — 지시 기록과 PM 종합 문서를 지운다. 담당자 개별 산출물은 작업 보드에 남는다 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { id } = await params; deleteDirective(Number(id));
  return NextResponse.json({ ok: true });
}
