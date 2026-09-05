import { getSession, userById } from "@/lib/auth";
import { getWorld } from "@/lib/world/engine";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession(); if (!s) return new Response("unauthorized", { status: 401 });
  const u = userById(s.uid); if (!u) return new Response("no user", { status: 401 });
  const world = getWorld();
  const enc = new TextEncoder();
  let unsub = () => {}; let hb: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream({
    start(controller) {
      const send = (ev: string, data: unknown) => { try { controller.enqueue(enc.encode(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { /* closed */ } };
      if (u.role !== "viewer") world.humanJoin(u);
      const msgs = db().prepare("SELECT id, ts, channel, sender_kind AS kind, sender_id AS id2, sender_name AS name, body FROM messages ORDER BY id DESC LIMIT 40").all();
      send("hello", { me: { id: u.id, name: u.display_name, role: u.role }, snapshot: world.snapshot(), roster: world.roster(), messages: (msgs as unknown[]).reverse() });
      unsub = world.subscribe((ev) => send(ev.type, ev.data));
      hb = setInterval(() => { world.humanPing(u.id); send("ping", { t: Date.now() }); }, 8000);
    },
    cancel() { unsub(); if (hb) clearInterval(hb); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
