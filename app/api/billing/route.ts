import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { billingSummary } from "@/lib/billing";
export const dynamic = "force-dynamic";
export async function GET() { const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 }); return NextResponse.json(billingSummary()); }
