import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getSession } from "@/lib/auth";
import { db, dataDir } from "@/lib/db";
import { resolveImageRequest } from "@/lib/image/genspark";
/** 젠스파크에서 생성한 이미지 업로드 (multipart file 또는 JSON {image_url}) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { id } = await ctx.params; const rid = Number(id);
  const ct = req.headers.get("content-type") || "";
  let url: string | null = null;
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData(); const f = form.get("file");
    if (!(f instanceof File)) return NextResponse.json({ error: "file" }, { status: 400 });
    if (f.size > 15 * 1024 * 1024) return NextResponse.json({ error: "15MB 이하" }, { status: 400 });
    const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    if (!["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return NextResponse.json({ error: "이미지 파일만" }, { status: 400 });
    const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(dataDir(), "uploads", name), Buffer.from(await f.arrayBuffer()));
    url = `/api/files/${name}`;
  } else { const b = (await req.json().catch(() => ({}))) as { image_url?: string }; if (b.image_url && /^https?:\/\//.test(b.image_url)) url = b.image_url; }
  if (!url) return NextResponse.json({ error: "파일 또는 image_url 필요" }, { status: 400 });
  resolveImageRequest(rid, url);
  db().prepare("INSERT INTO office_events (actor_kind, actor_id, type, payload_json) VALUES ('human',?,?,?)").run(s.uid, "image_uploaded", JSON.stringify({ requestId: rid, url }));
  return NextResponse.json({ ok: true, url });
}
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s || s.role === "viewer") return new NextResponse("forbidden", { status: 403 });
  const { id } = await ctx.params; const b = (await req.json().catch(() => ({}))) as { status?: "skipped" | "pending" };
  db().prepare("UPDATE image_requests SET status = ? WHERE id = ?").run(b.status || "skipped", Number(id)); return NextResponse.json({ ok: true });
}
