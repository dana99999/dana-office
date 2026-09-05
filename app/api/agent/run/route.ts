import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorld } from "@/lib/world/engine";
/** 러너 깨우기 — 월드 엔진이 자동으로 돌지만, cron/수동 트리거용 */
export async function POST() { const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 }); getWorld().notifyTasksChanged(); return NextResponse.json({ ok: true, roster: getWorld().roster() }); }
