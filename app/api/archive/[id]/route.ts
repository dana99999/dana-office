import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setDirectiveClient, knownClients } from "@/lib/world/directive";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { id } = await params; const b = (await req.json().catch(() => ({}))) as { client?: string };
  setDirectiveClient(Number(id), b.client || "");
  return NextResponse.json({ ok: true, clients: knownClients() });
}
