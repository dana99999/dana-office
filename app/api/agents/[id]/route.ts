import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorld } from "@/lib/world/engine";
const COLS = ["name", "role_title", "zone", "desk_x", "desk_y", "persona", "sprite_json", "model", "effort", "tools_json", "daily_cost_cap", "approver_user_id", "screen", "active"] as const;
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 });
  const { id } = await ctx.params; const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (Array.isArray(b.tools)) b.tools_json = JSON.stringify(b.tools);
  const sets: string[] = []; const vals: unknown[] = [];
  for (const c of COLS) if (b[c] !== undefined) { sets.push(`${c} = ?`); vals.push(typeof b[c] === "boolean" ? (b[c] ? 1 : 0) : b[c]); }
  if (sets.length) db().prepare(`UPDATE agents SET ${sets.join(", ")} WHERE id = ?`).run(...vals, Number(id));
  getWorld().syncAgents();
  return NextResponse.json({ ok: true });
}
