import fs from "node:fs";
import path from "node:path";
import { dataDir } from "@/lib/db";
const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!/^[a-z0-9.-]+$/i.test(name)) return new Response("bad name", { status: 400 });
  const p = path.join(dataDir(), "uploads", name);
  if (!fs.existsSync(p)) return new Response("not found", { status: 404 });
  const ext = name.split(".").pop()!.toLowerCase();
  return new Response(fs.readFileSync(p), { headers: { "content-type": MIME[ext] || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" } });
}
