"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildSprite, type Pose } from "@/lib/pixel/sprite";
import { buildBackground, drawDynamic, drawLight, deskStatesFor, nightAlpha } from "@/lib/pixel/render";
import { TS, W, H, ZONE_LABELS, ENTRANCE, blocked } from "@/lib/world/map";
import type { ActorSnap, WorldSnapshot } from "@/lib/world/types";

type Me = { id: number; name: string; role: string };
type Msg = { id?: number; ts: string; kind: string; id2?: number; name: string; body: string; channel?: string };
type RosterRow = { id: number; name: string; role: string; state: string; present: boolean; queue: number; manual: string; desired: boolean; busy: boolean };
interface Anim { px: number; py: number; dir: ActorSnap["dir"]; anim: number; blink: number }
const STEP_PX_PER_S = TS / 0.42;
async function fetchRoster(set: (r: RosterRow[]) => void) { const r = await fetch("/api/office/state").then((x) => x.json()).catch(() => null); if (r) set(r.roster); }
function postMove(b: { dx?: number; dy?: number; to?: [number, number] }) { fetch("/api/office/move", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); }

export function OfficeView({ me, projects }: { me: Me; projects: { id: number; name: string }[] }) {
  const cvRef = useRef<HTMLCanvasElement>(null); const stageRef = useRef<HTMLDivElement>(null); const viewRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null); const bgHour = useRef(-1);
  const snapRef = useRef<WorldSnapshot>({ t: 0, hour: 12, actors: [] }); const animRef = useRef(new Map<string, Anim>()); const bubblesRef = useRef(new Map<string, { text: string; until: number }>());
  const [snapVer, setSnapVer] = useState(0);
  const [roster, setRoster] = useState<RosterRow[]>([]); const [msgs, setMsgs] = useState<Msg[]>([]); const [connected, setConnected] = useState(false);
  const [panel, setPanel] = useState<"team" | "chat" | "ctl">("team"); const [text, setText] = useState(""); const [sel, setSel] = useState<RosterRow | null>(null);
  const [taskTitle, setTaskTitle] = useState(""); const [taskBrief, setTaskBrief] = useState(""); const [taskProject, setTaskProject] = useState<number | "">(""); const [busy, setBusy] = useState(false);
  const [cost, setCost] = useState<{ today: number; live: boolean } | null>(null); const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [scale, setScale] = useState(1); const chatRef = useRef<HTMLDivElement>(null);

  /* SSE */
  useEffect(() => {
    let es: EventSource | null = null; let closed = false;
    const open = () => {
      es = new EventSource("/api/office/stream");
      es.addEventListener("hello", (e) => { const d = JSON.parse((e as MessageEvent).data); snapRef.current = d.snapshot; setRoster(d.roster); setMsgs(d.messages); setConnected(true); setSnapVer((v) => v + 1); });
      es.addEventListener("snapshot", (e) => { snapRef.current = JSON.parse((e as MessageEvent).data); setSnapVer((v) => v + 1); });
      es.addEventListener("say", (e) => { const d = JSON.parse((e as MessageEvent).data); setMsgs((m) => [...m.slice(-79), { ts: d.ts, kind: d.kind, id2: d.id, name: d.name, body: d.body }]); if (d.kind !== "system") bubblesRef.current.set(`${d.kind}:${d.id}`, { text: d.body, until: Date.now() + 3800 }); });
      es.addEventListener("presence", () => fetchRoster(setRoster));
      es.addEventListener("task", () => fetchRoster(setRoster));
      es.addEventListener("alert", (e) => { const d = JSON.parse((e as MessageEvent).data); setAlertMsg(d.body); setTimeout(() => setAlertMsg(null), 8000); });
      es.onerror = () => { setConnected(false); es?.close(); if (!closed) setTimeout(open, 2000); };
    };
    open(); return () => { closed = true; es?.close(); };
  }, []);
  const refreshRoster = () => fetchRoster(setRoster);
  useEffect(() => { const id = setInterval(() => fetchRoster(setRoster), 15000); return () => clearInterval(id); }, []);
  useEffect(() => { if (me.role !== "ceo") return; const f = () => fetch("/api/billing").then((r) => (r.ok ? r.json() : null)).then((j) => j && setCost({ today: j.today, live: j.liveMode })).catch(() => {}); f(); const id = setInterval(f, 30000); return () => clearInterval(id); }, [me.role]);
  useEffect(() => { chatRef.current?.scrollTo({ top: 1e9 }); }, [msgs, panel]);

  /* 정수 배율 */
  useEffect(() => { const fit = () => { const w = stageRef.current?.clientWidth || W; setScale(Math.max(1, Math.floor(w / W))); }; fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, []);

  /* 렌더 루프 */
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return; const g = cv.getContext("2d")!; let raf = 0; let last = performance.now(); const t0 = last;
    if (!bgRef.current) { bgRef.current = document.createElement("canvas"); bgRef.current.width = W; bgRef.current.height = H; }
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
      const snap = snapRef.current; const d = new Date(); const hour = d.getHours() + d.getMinutes() / 60; const simMin = d.getHours() * 60 + d.getMinutes();
      if (Math.floor(hour) !== bgHour.current) { buildBackground(bgRef.current!, Math.floor(hour)); bgHour.current = Math.floor(hour); }
      g.imageSmoothingEnabled = false; g.drawImage(bgRef.current!, 0, 0);
      // interpolate
      const anims = animRef.current; const live = new Set<string>();
      for (const a of snap.actors) {
        const k = `${a.kind}:${a.id}`; live.add(k); let an = anims.get(k);
        const tx = a.x * TS, ty = a.y * TS;
        if (!an) { an = { px: tx, py: ty, dir: a.dir, anim: 0, blink: 2 + Math.random() * 4 }; anims.set(k, an); }
        const dx = tx - an.px, dy = ty - an.py, sp = STEP_PX_PER_S * dt;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) { if (Math.abs(dx) > Math.abs(dy)) an.dir = dx > 0 ? "right" : "left"; else an.dir = dy > 0 ? "down" : "up"; an.px += Math.abs(dx) <= sp ? dx : Math.sign(dx) * sp; an.py += Math.abs(dy) <= sp ? dy : Math.sign(dy) * sp; an.anim += dt * 8; } else { an.dir = a.dir; an.anim = 0; }
        an.blink -= dt; if (an.blink < -0.15) an.blink = 2.5 + Math.random() * 4;
      }
      for (const k of [...anims.keys()]) if (!live.has(k)) anims.delete(k);
      const { desk, lamps, mons, zonesLit } = deskStatesFor(snap.actors);
      const doorOpen = snap.actors.some((a) => Math.abs(a.x - ENTRANCE[0]) + Math.abs(a.y - ENTRANCE[1]) <= 1);
      drawDynamic(g, { t, hour, night: nightAlpha(hour) > 0.1, desk, apiDown: false, doorOpen }, simMin);
      for (const a of snap.actors) { const X = a.seat[0] * TS, Y = a.seat[1] * TS; if (a.zone !== "reception") { g.fillStyle = "#262838"; g.fillRect(X + 3, Y - 3, 10, 6); g.fillStyle = "#3b3f57"; g.fillRect(X + 4, Y - 2, 8, 4); g.fillStyle = "#262838"; g.fillRect(X + 1, Y + 5, 2, 5); g.fillRect(X + 13, Y + 5, 2, 5); g.fillRect(X + 2, Y + 11, 12, 3); g.fillStyle = "#1c1e2c"; g.fillRect(X + 4, Y + 15, 8, 1); } }
      const sorted = [...snap.actors].sort((a, b) => (anims.get(`${a.kind}:${a.id}`)?.py || 0) - (anims.get(`${b.kind}:${b.id}`)?.py || 0));
      for (const a of sorted) {
        const an = anims.get(`${a.kind}:${a.id}`)!; const moving = Math.abs(an.px - a.x * TS) > 0.5 || Math.abs(an.py - a.y * TS) > 0.5;
        const atSeat = a.x === a.seat[0] && a.y === a.seat[1];
        let pose: Pose = "idle"; let fr = 0;
        if (moving) { pose = "walk"; fr = Math.floor(an.anim) % 4; }
        else if (a.kind === "agent" && a.state === "idle") { pose = Math.floor(t * 0.5) % 2 === 0 ? "coffee" : "sleep"; fr = Math.floor(t * 0.8) % 2; }
        else if (atSeat && (a.kind === "human" || (a.state === "work" && a.queue > 0))) { pose = "type"; fr = Math.floor(t * 4) % 2; }
        else if (an.blink < 0) pose = "blink";
        const px = Math.round(an.px), py = Math.round(an.py); const breathe = !moving && Math.floor(t * 1.2) % 2 === 0 ? 1 : 0;
        g.fillStyle = "rgba(10,10,20,.28)"; g.fillRect(px + 3, py + 14, 10, 2); g.fillRect(px + 4, py + 13, 8, 1);
        g.drawImage(buildSprite(a.look, moving ? an.dir : a.dir, fr, pose), px + 1, py - 7 + breathe);
        if (a.kind === "agent" && a.state === "idle" && !moving) { const zp = Math.floor(t * 1.5) % 3; g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(px + 13, py - 9 - zp * 2, 2, 1); g.fillRect(px + 13 + ((zp + 1) % 2), py - 8 - zp * 2, 1, 1); g.fillRect(px + 13, py - 7 - zp * 2, 2, 1); }
        if (a.mode === "busy") { g.fillStyle = Math.floor(t * 4) % 2 ? "#e8a33d" : "#f4f1ea"; g.fillRect(px + 6, py - 12, 4, 1); g.fillRect(px + 7, py - 13, 2, 3); }
      }
      if (hour >= 9 && hour < 17) { g.fillStyle = "rgba(255,255,255,.35)"; [1, 4, 7, 12, 16, 19].forEach((wx, i) => { for (let k = 0; k < 2; k++) g.fillRect(Math.round(wx * TS + 3 + ((t * 3 + i * 7 + k * 5) % 10)), Math.round(TS + 4 + ((t * 5 + i * 3 + k * 9) % 24)), 1, 1); }); }
      drawLight(g, hour, lamps, mons, zonesLit);
      // overlay DOM
      const layer = viewRef.current?.querySelector<HTMLDivElement>(".actors"); if (layer) {
        const nowMs = Date.now(); const parts: string[] = [];
        for (const a of snap.actors) { const an = anims.get(`${a.kind}:${a.id}`)!; const lx = (an.px + TS / 2) / W * 100, top = (an.py - 8) / H * 100; const you = a.kind === "human" && a.id === me.id; const icon = moving(an, a) ? "" : a.mode === "busy" ? "⚙️" : a.kind === "agent" && a.state === "idle" ? "💤" : "✏️";
          parts.push(`<div class="tag ${you ? "you" : a.kind === "human" ? "human" : ""}" style="left:${lx}%;top:${top}%">${esc(a.name)}<em>${icon}</em></div>`);
          const b = bubblesRef.current.get(`${a.kind}:${a.id}`); if (b && b.until > nowMs) parts.push(`<div class="bubble" style="left:${Math.min(88, Math.max(12, lx))}%;top:${(an.py - 19) / H * 100}%">${esc(b.text)}</div>`); }
        layer.innerHTML = parts.join("");
      }
      raf = requestAnimationFrame(loop);
    };
    const moving = (an: Anim, a: ActorSnap) => Math.abs(an.px - a.x * TS) > 0.5 || Math.abs(an.py - a.y * TS) > 0.5;
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [me.id]);

  /* 입력 */
  const move = postMove;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return; const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }; if (m[e.key]) { e.preventDefault(); postMove({ dx: m[e.key][0], dy: m[e.key][1] }); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  const onTap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = cvRef.current!.getBoundingClientRect(); const tx = Math.floor((e.clientX - r.left) / r.width * 22), ty = Math.floor((e.clientY - r.top) / r.height * 13);
    const hit = snapRef.current.actors.find((a) => a.kind === "agent" && Math.abs(a.x - tx) <= 0 && Math.abs(a.y - ty) <= 1);
    if (hit) { const row = roster.find((x) => x.id === hit.id); if (row) { setSel(row); return; } }
    if (!blocked(tx, ty)) move({ to: [tx, ty] });
  };
  const say = async () => { const t = text.trim(); if (!t) return; setText(""); await fetch("/api/office/say", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: t }) }); };
  const call = async (id: number, action: "call" | "dismiss" | "auto") => { const r = await fetch("/api/office/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agentId: id, action }) }).then((x) => x.json()); if (r.roster) setRoster(r.roster); };
  const assign = async () => { if (!sel || !taskTitle.trim()) return; setBusy(true); await fetch("/api/office/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agentId: sel.id, title: taskTitle.trim(), brief: taskBrief.trim(), projectId: taskProject || undefined }) }); setBusy(false); setTaskTitle(""); setTaskBrief(""); setSel(null); refreshRoster(); };

  const counts = useMemo(() => ({ work: roster.filter((r) => r.present && r.state === "work").length, idle: roster.filter((r) => !r.present || r.state === "idle").length, queue: roster.reduce((s, r) => s + r.queue, 0) }), [roster]);
  const clock = new Date().toTimeString().slice(0, 5);
  void snapVer;

  return (
    <div>
      {alertMsg && <div className="alertbar" role="status">{alertMsg}</div>}
      <div className="office">
        <div className="hud">
          <span className="clock">{clock}</span>
          <span className="stat">근무 <b>{counts.work}</b></span><span className="stat">대기 <b>{counts.idle}</b></span><span className="stat">작업 큐 <b>{counts.queue}</b></span>
          {cost && <span className="stat">오늘 비용 <b>${cost.today.toFixed(2)}</b> {!cost.live && <span className="pill" style={{ color: "var(--amber)" }}>MOCK</span>}</span>}
          <span style={{ flex: 1 }} /><span className="stat"><b style={{ color: connected ? "var(--teal)" : "var(--danger)" }}>{connected ? "● 연결됨" : "○ 재접속 중"}</b></span>
        </div>
        <div className="stage" ref={stageRef}>
          <div className="view" ref={viewRef} style={{ width: W * scale, height: H * scale }}>
            <canvas ref={cvRef} className="px" width={W} height={H} style={{ width: W * scale, height: H * scale, display: "block", cursor: "pointer" }} onClick={onTap} role="img" aria-label="다나 오피스 — 탭한 곳으로 이동, AI를 탭하면 업무 지시" />
            <div className="layer">{ZONE_LABELS.map((l) => <div key={l[0]} className="zlabel" style={{ left: `${l[1] * TS / W * 100}%`, top: `${l[2] * TS / H * 100}%` }}>{l[0]}</div>)}</div>
            <div className="layer actors" />
          </div>
        </div>
        <div className="seg"><button className={`btn sm ${panel === "team" ? "on" : ""}`} onClick={() => setPanel("team")}>팀</button><button className={`btn sm ${panel === "chat" ? "on" : ""}`} onClick={() => setPanel("chat")}>채팅</button><button className={`btn sm ${panel === "ctl" ? "on" : ""}`} onClick={() => setPanel("ctl")}>조작</button></div>
        <div className="deck">
          <div className={`pad ${panel !== "team" ? "hide-m" : ""}`}>
            <div className="lhead">Team — 탭하면 업무 지시</div>
            <div className="roster">{roster.map((r) => { const st = !r.present ? (r.desired ? ["move", "출근 중"] : ["away", "부재"]) : !r.desired ? ["move", "퇴근 중"] : r.busy ? ["work", "작업 실행 중"] : r.state === "idle" ? ["idle", "대기 · 큐 0"] : ["work", `근무 · 큐 ${r.queue}`];
              return <div className="r" key={r.id}><button className="n" style={{ all: "unset", cursor: "pointer", fontWeight: 600 }} onClick={() => setSel(r)}>{r.name}<small>{r.role}</small></button><span className={`chip ${st[0]}`}>{st[1]}</span><span className="c">{r.manual === "in" ? "수동 호출" : r.manual === "out" ? "수동 퇴근" : "편성"}</span><button className="btn sm" onClick={() => call(r.id, r.desired ? "dismiss" : "call")}>{r.desired ? "내보내기" : "호출"}</button></div>; })}</div>
          </div>
          <div className={`pad ${panel !== "chat" ? "hide-m" : ""}`}>
            <div className="lhead">Office Log</div>
            <div className="chat" ref={chatRef}>{msgs.map((m, i) => <div className="r" key={m.id ?? i}><time>{(m.ts || "").slice(11, 16)}</time><span className="who" style={{ color: m.kind === "human" ? "var(--accent-ink)" : m.kind === "system" ? "var(--amber)" : "var(--teal)" }}>{m.name}</span><span className="msg">{m.body}</span></div>)}</div>
            <form className="chatin" onSubmit={(e) => { e.preventDefault(); say(); }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="@소라 처럼 부르면 출근합니다" aria-label="채팅 입력" /><button className="btn primary">보내기</button></form>
          </div>
          <div className={`pad ${panel !== "ctl" ? "hide-m" : ""}`}>
            <div className="lhead">조작</div>
            <p className="hint">노란 이름표가 나입니다. 바닥을 탭하면 그곳으로 걸어가고, AI를 탭하면 업무를 지시할 수 있습니다. <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> 이동.</p>
            <div className="dpad"><span /><button onClick={() => move({ dx: 0, dy: -1 })} aria-label="위">▲</button><span /><button onClick={() => move({ dx: -1, dy: 0 })} aria-label="왼쪽">◀</button><button onClick={() => move({ dx: 0, dy: 1 })} aria-label="아래">▼</button><button onClick={() => move({ dx: 1, dy: 0 })} aria-label="오른쪽">▶</button></div>
            <p className="hint" style={{ marginTop: 10 }}>대기(💤)·부재 AI는 LLM을 호출하지 않습니다. 업무를 배정한 순간부터만 과금됩니다.</p>
          </div>
        </div>
      </div>
      {sel && (
        <div className="modal" onClick={() => setSel(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <div className="topbar" style={{ marginBottom: 8 }}><h1 style={{ fontSize: "1.1rem" }}>{sel.name} <span className="muted">{sel.role}</span></h1><span className="sp" /><button className="btn sm" onClick={() => setSel(null)}>닫기</button></div>
            <div className="row" style={{ marginBottom: 12 }}><span className={`chip ${sel.present ? (sel.state === "idle" ? "idle" : "work") : "away"}`}>{sel.present ? (sel.state === "idle" ? "대기 · 비용 0" : `근무 · 큐 ${sel.queue}`) : "부재 · 비용 0"}</span>
              <button className="btn sm" onClick={() => call(sel.id, sel.desired ? "dismiss" : "call")}>{sel.desired ? "내보내기" : "호출"}</button>{sel.manual && <button className="btn sm" onClick={() => call(sel.id, "auto")}>편성 기준으로</button>}</div>
            <div className="lhead">업무 지시</div>
            <div className="field"><label>제목</label><input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="예: 무드보드 방향 3안" /></div>
            <div className="field" style={{ marginTop: 8 }}><label>브리프 (선택)</label><textarea value={taskBrief} onChange={(e) => setTaskBrief(e.target.value)} placeholder="무엇을, 누구를 위해, 어떤 톤으로" /></div>
            <div className="field" style={{ marginTop: 8 }}><label>프로젝트</label><select value={taskProject} onChange={(e) => setTaskProject(e.target.value ? Number(e.target.value) : "")}><option value="">자동 (편성된 프로젝트 / 직접 지시)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}><button className="btn primary" disabled={busy || !taskTitle.trim()} onClick={assign}>{busy ? "배정 중…" : "배정하고 시작"}</button></div>
            <p className="hint" style={{ marginTop: 8 }}>부재 중이면 호출되어 정문으로 들어온 뒤 자리에서 시작합니다. 산출물은 승인 큐에 올라옵니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)); }
