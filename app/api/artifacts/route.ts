import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listArtifacts } from "@/lib/queries";
export async function GET(req: Request) {
  const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 });
  const status = new URL(req.url).searchParams.get("status");
  return NextResponse.json({ artifacts: status ? listArtifacts("ar.status = ?", status) : listArtifacts() });
}
