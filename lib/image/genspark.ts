import { db } from "../db";

/**
 * 이미지 생성 — 젠스파크.
 * handoff 모드(기본): AI가 프롬프트를 만들면 요청 카드가 생기고, 사람이 젠스파크에서 생성해 업로드한다.
 * api 모드: GENSPARK_API_URL/KEY가 설정되면 아래 generic 계약으로 호출을 시도하고, 실패하면 handoff로 남긴다.
 *   POST {url} { prompt, style, size } → { image_url }
 */
export function imageMode(): "handoff" | "api" { return process.env.GENSPARK_API_URL && process.env.GENSPARK_API_KEY ? "api" : "handoff"; }
export function gensparkUrl(): string {
  const f = db().prepare("SELECT config_json FROM features WHERE key='image_genspark'").get() as { config_json: string } | undefined;
  try { return (JSON.parse(f?.config_json || "{}").url as string) || "https://www.genspark.ai/"; } catch { return "https://www.genspark.ai/"; }
}
export async function createImageRequest(r: { task_id: number; artifact_id: number | null; agent_id: number; prompt: string; style?: string; size?: string }): Promise<number> {
  const d = db();
  const res = d.prepare("INSERT INTO image_requests (task_id, artifact_id, agent_id, prompt, style, size, provider) VALUES (?,?,?,?,?,?,'genspark')")
    .run(r.task_id, r.artifact_id, r.agent_id, r.prompt, r.style || "", r.size || "1024x1024");
  const id = Number(res.lastInsertRowid);
  if (imageMode() === "api") {
    try {
      const resp = await fetch(process.env.GENSPARK_API_URL!, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GENSPARK_API_KEY}` }, body: JSON.stringify({ prompt: r.prompt, style: r.style, size: r.size }) });
      if (resp.ok) { const j = (await resp.json()) as { image_url?: string }; if (j.image_url) resolveImageRequest(id, j.image_url); }
    } catch { /* handoff로 남김 */ }
  }
  return id;
}
export function resolveImageRequest(id: number, imageUrl: string) {
  const d = db();
  const req = d.prepare("SELECT * FROM image_requests WHERE id = ?").get(id) as { artifact_id: number | null } | undefined;
  if (!req) return;
  d.prepare("UPDATE image_requests SET status='done', image_url=? WHERE id=?").run(imageUrl, id);
  if (req.artifact_id) d.prepare("UPDATE artifacts SET image_url=? WHERE id=?").run(imageUrl, req.artifact_id);
}
