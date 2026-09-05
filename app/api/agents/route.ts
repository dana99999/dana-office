import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorld } from "@/lib/world/engine";
import { listAgents } from "@/lib/queries";
export async function GET() { const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 }); return NextResponse.json({ agents: listAgents(), roster: getWorld().roster() }); }
/** 관리자 — AI 담당자 추가 (코드 없이). 저장 즉시 월드에 반영, 편성되면 다음 tick에 정문 등장 */
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Partial<{ slug: string; name: string; role_title: string; zone: string; desk_x: number; desk_y: number; persona: string; sprite_json: string; model: string; effort: string; tools: string[]; daily_cost_cap: number; approver_user_id: number | null; screen: string }>;
  if (!b.name || !b.role_title || !b.persona) return NextResponse.json({ error: "이름·직무·페르소나 필요" }, { status: 400 });
  const need = ["만들", "승인"]; if (!need.every((k) => b.persona!.includes(k))) return NextResponse.json({ error: "페르소나에 '무엇을 만들고 / 무엇을 만들면 안 되고 / 누구에게 승인받는가'가 있어야 합니다" }, { status: 400 });
  const slug = (b.slug || `agent-${Date.now().toString(36)}`).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const r = db().prepare("INSERT INTO agents (slug,name,role_title,zone,desk_x,desk_y,persona,sprite_json,model,effort,tools_json,daily_cost_cap,approver_user_id,screen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(slug, b.name.slice(0, 20), b.role_title.slice(0, 40), b.zone || "design", Number(b.desk_x ?? 4), Number(b.desk_y ?? 3), b.persona.slice(0, 4000), b.sprite_json || JSON.stringify({ hair: "short", hair_c: ["#2b2118", "#4a3a2c"], skin: ["#eabf99", "#c99268"], outfit: "tee", top: ["#2f7d6f", "#215a50"], accent: "#e8f3ef", bottom: ["#26283a", "#1b1c2a"], shoe: ["#1a1a22", "#3a3a48"] }), b.model || "claude-sonnet-5", b.effort || "medium", JSON.stringify(b.tools || ["create_artifact", "post_message"]), Number(b.daily_cost_cap ?? 5), b.approver_user_id ?? null, b.screen || "doc");
  getWorld().syncAgents();
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
