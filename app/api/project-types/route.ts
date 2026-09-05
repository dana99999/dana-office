import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProjectTypes } from "@/lib/queries";
export async function GET() { const s = await getSession(); if (!s) return new NextResponse("unauthorized", { status: 401 }); return NextResponse.json({ types: listProjectTypes() }); }
export async function POST(req: Request) {
  const s = await getSession(); if (!s || s.role !== "ceo") return new NextResponse("forbidden", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { id?: number; name?: string; team?: string[]; delete?: boolean };
  const d = db();
  if (b.delete && b.id) { d.prepare("DELETE FROM project_types WHERE id = ?").run(b.id); return NextResponse.json({ ok: true }); }
  if (!b.name) return NextResponse.json({ error: "name" }, { status: 400 });
  if (b.id) d.prepare("UPDATE project_types SET name = ?, default_team_json = ? WHERE id = ?").run(b.name, JSON.stringify(b.team || []), b.id);
  else d.prepare("INSERT INTO project_types (name, default_team_json) VALUES (?,?)").run(b.name, JSON.stringify(b.team || []));
  return NextResponse.json({ ok: true });
}
