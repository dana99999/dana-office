import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listImageRequests } from "@/lib/queries";
import { imageMode, gensparkUrl } from "@/lib/image/genspark";
export async function GET() { const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 }); return NextResponse.json({ requests: listImageRequests(), mode: imageMode(), gensparkUrl: gensparkUrl() }); }
