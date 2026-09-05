"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { drawCharacter, type Pose } from "@/lib/hd/chars";
import { buildBackground, drawDynamic, drawLight, deskStatesFor, nightAlpha, drawChair } from "@/lib/hd/world";
import { TS, W, H, ZONE_LABELS, ENTRANCE, blocked, COLS, ROWS } from "@/lib/world/map";
import type { ActorSnap, WorldSnapshot } from "@/lib/world/types";
import { SpriteView } from "./sprite-view";
import type { Look } from "@/lib/types";

type Me = { id: number; name: string; role: string };
type Msg = { id?: number; ts: string; kind: string; id2?: number; name: string; body: string; channel?: string };
type RosterRow = { id: number; name: string; role: string; state: string; present: boolean; queue: number; manual: string; desired: boolean; busy: boolean };
interface Anim { px: number; py: number; dir: ActorSnap["dir"]; anim: number; blink: number }
const STEP_PX_PER_S = TS / 0.42;
async function fetchRoster(set: (r: RosterRow[]) => void) { const r = await fetch("/api/office/state").then((x) => x.json()).catch(() => null); if (r) set(r.roster); }
function postMove(b: { dx?: number; dy?: number; to?: [number, number] }) { fetch("/api/office/move", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); }
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export function OfficeView({ me, projects }: { me: Me; projects: { id: number; name: string }[] }) {
  const cvRef = useRef<HTMLCanvasElement>(null); const stageRef = useRef<HTMLDivElement>(null); const viewRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null); const bgHour = useRef(-1);
  const snapRef = useRef<WorldSnapshot>({ t: 0, hour: 12, actors: [] }); const animRef = useRef(new Map<string, Anim>()); const bubblesRef = useRef(new Map<string, { text: string; until: number }>());
  const [looks, setLooks] = useState<Map<number, Look>>(new Map());
  const [roster, setRoster] = useState<RosterRow[]>([]); const [msgs, setMsgs] = useState<Msg[]>([]); const [connected, setConnected] = useState(false);
  const [panel, setPanel] = useState<"team" | "chat" | "ctl">("team"); const [text, setText] = useState(""); const [sel, setSel] = useState<RosterRow | null>(null);
  const [taskTitle, setTaskTitle] = useState(""); const [taskBrief, setTaskBrief] = useState(""); const [taskProject, setTaskProject] = useState<number | "">(""); const [busy, setBusy] = useState(false);
  const [cost, setCost] = useState<{ today: number; live: boolean } | null>(null); const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [view, setView] = useState({ scale: 1, vw: W }); const chatRef = useRef<HTMLDivElement>(null);
  const camRef = useRef({ x: 0, manual: 0 }); const meIdRef = useRef(me.id); const viewRefState = useRef(view);
  const [clock, setClock] = useState("--:--");
  useEffect(() => { viewRefState.current = view; }, [view]);
  const absorbLooks = (actors: ActorSnap[]) => setLooks((prev) => { let changed = false; const next = new Map(prev); for (const a of actors) if (a.kind === "agent" && !next.has(a.id)) { next.set(a.id, a.look); changed = true; } return changed ? next : prev; });

  /* SSE */
  useEffect(() => {
    let es: EventSource | null = null; let closed = false;
    const open = () => {
      es = new EventSource("/api/office/stream");
      es.addEventListener("hello", (e) => { const d = JSON.parse((e as MessageEvent).data); snapRef.current = d.snapshot; absorbLooks(d.snapshot.actors); setRoster(d.roster); setMsgs(d.messages); setConnected(true); });
      es.addEventListener("snapshot", (e) => { snapRef.current = JSON.parse((e as MessageEvent).data); absorbLooks(snapRef.current.actors); });
      es.addEventListener("say", (e) => { const d = JSON.parse((e as MessageEvent).data); setMsgs((m) => [...m.slice(-79), { ts: d.ts, kind: d.kind, id2: d.id, name: d.name, body: d.body }]); if (d.kind !== "system") bubblesRef.current.set(`${d.kind}:${d.id}`, { text: d.body, until: Date.now() + 3800 }); });
      es.addEventListener("presence", () => fetchRoster(setRoster)); es.addEventListener("task", () => fetchRoster(setRoster));
      es.addEventListener("alert", (e) => { const d = JSON.parse((e as MessageEvent).data); setAlertMsg(d.body); setTimeout(() => setAlertMsg(null), 8000); });
      es.onerror = () => { setConnected(false); es?.close(); if (!closed) setTimeout(open, 2000); };
    };
    open(); return () => { closed = true; es?.close(); };
  }, []);
  useEffect(() => { const id = setInterval(() => fetchRoster(setRoster), 15000); return () => clearInterval(id); }, []);
  useEffect(() => { if (me.role !== "ceo") return; const f = () => fetch("/api/billing").then((r) => (r.ok ? r.json() : null)).then((j) => j && setCost({ today: j.today, live: j.liveMode })).catch(() => {}); f(); const id = setInterval(f, 30000); return () => clearInterval(id); }, [me.role]);
  useEffect(() => { chatRef.current?.scrollTo({ top: 1e9 }); }, [msgs, panel]);
  useEffect(() => { const tick = () => setClock(new Date().toTimeString().slice(0, 5)); tick(); const id = setInterval(tick, 10000); return () => clearInterval(id); }, []);
  /* 배율: 컨테이너 폭에 맞춤 (0.7 ~ 1.3), 지도가 넓으면 카메라 팔로우 */
  useEffect(() => { const fit = () => { const cw = (stageRef.current?.clientWidth || W) - 0; const sc = Math.min(1.3, Math.max(0.7, cw / W)); setView({ scale: sc, vw: Math.min(cw, Math.round(W * sc)) }); }; fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, []);

  /* 렌더 루프 */
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return; const g = cv.getContext("2d")!; let raf = 0; let last = performance.now(); const t0 = last;
    if (!bgRef.current) bgRef.current = document.createElement("canvas");
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000; const { scale, vw } = viewRefState.current; const dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(vw * dpr) || cv.height !== Math.round(H * scale * dpr)) { cv.width = Math.round(vw * dpr); cv.height = Math.round(H * scale * dpr); }
      const snap = snapRef.current; const d = new Date(); const hour = d.getHours() + d.getMinutes() / 60; const simMin = d.getHours() * 60 + d.getMinutes();
      if (Math.floor(hour) !== bgHour.current) { buildBackground(bgRef.current!, Math.floor(hour)); bgHour.current = Math.floor(hour); }
      const anims = animRef.current; const live = new Set<string>();
      for (const a of snap.actors) {
        const k = `${a.kind}:${a.id}`; live.add(k); let an = anims.get(k); const tx = a.x * TS, ty = a.y * TS;
        if (!an) { an = { px: tx, py: ty, dir: a.dir, anim: 0, blink: 2 + Math.random() * 4 }; anims.set(k, an); }
        const dx = tx - an.px, dy = ty - an.py, sp = STEP_PX_PER_S * dt;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) { if (Math.abs(dx) > Math.abs(dy)) an.dir = dx > 0 ? "right" : "left"; else an.dir = dy > 0 ? "down" : "up"; an.px += Math.abs(dx) <= sp ? dx : Math.sign(dx) * sp; an.py += Math.abs(dy) <= sp ? dy : Math.sign(dy) * sp; an.anim += dt * 2.4; } else { an.dir = a.dir; }
        an.blink -= dt; if (an.blink < -0.15) an.blink = 2.5 + Math.random() * 4;
      }
      for (const k of [...anims.keys()]) if (!live.has(k)) anims.delete(k);
      const cam = camRef.current; const vwWorld = vw / scale;
      if (vwWorld < W) { const meAn = anims.get(`human:${meIdRef.current}`); if (cam.manual > 0) cam.manual -= dt; else if (meAn) { const target = Math.max(0, Math.min(W - vwWorld, meAn.px + TS / 2 - vwWorld / 2)); cam.x += (target - cam.x) * Math.min(1, dt * 4); } } else cam.x = 0;
      cam.x = Math.max(0, Math.min(Math.max(0, W - vwWorld), cam.x)); const camX = cam.x;
      g.setTransform(scale * dpr, 0, 0, scale * dpr, -camX * scale * dpr, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
      g.fillStyle = "#0b0c14"; g.fillRect(camX, 0, vwWorld, H); g.drawImage(bgRef.current!, 0, 0, W, H);
      const { desk, lamps, mons, zonesLit } = deskStatesFor(snap.actors);
      const doorOpen = snap.actors.some((a) => Math.abs(a.x - ENTRANCE[0]) + Math.abs(a.y - ENTRANCE[1]) <= 1);
      drawDynamic(g, { t, hour, night: nightAlpha(hour) > 0.1, desk, apiDown: false, doorOpen }, simMin);
      for (const a of snap.actors) if (a.zone !== "reception") drawChair(g, a.seat[0], a.seat[1]);
      const sorted = [...snap.actors].sort((a, b) => (anims.get(`${a.kind}:${a.id}`)?.py || 0) - (anims.get(`${b.kind}:${b.id}`)?.py || 0));
      for (const a of sorted) {
        const an = anims.get(`${a.kind}:${a.id}`)!; const mv = Math.abs(an.px - a.x * TS) > 0.5 || Math.abs(an.py - a.y * TS) > 0.5;
        const atSeat = a.x === a.seat[0] && a.y === a.seat[1]; const talking = (bubblesRef.current.get(`${a.kind}:${a.id}`)?.until || 0) > Date.now();
        let pose: Pose = "idle"; let phase = (t * 0.5) % 1;
        if (mv) { pose = "walk"; phase = an.anim % 1; }
        else if (a.kind === "agent" && a.state === "idle") { pose = Math.floor(t * 0.25) % 2 === 0 ? "coffee" : "sleep"; phase = (t * 0.5) % 1; }
        else if (talking) pose = "talk";
        else if (atSeat && (a.kind === "human" || (a.state === "work" && a.queue > 0))) { pose = "type"; phase = (t * 1.2) % 1; }
        else if (an.blink < 0) pose = "blink";
        drawCharacter(g, a.look, an.px + TS / 2, an.py + TS - 3, { dir: mv ? an.dir : a.dir, pose, phase, size: TS });
        if (a.kind === "agent" && a.state === "idle" && !mv) { g.save(); g.font = "800 11px Nunito, sans-serif"; g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 2; i++) { const p = ((t * 0.7 + i * 0.5) % 1); g.globalAlpha = 1 - p; g.fillText("z", an.px + TS - 8 + i * 6 + p * 6, an.py - 14 - p * 14 - i * 4); } g.restore(); }
        if (a.mode === "busy") { g.save(); g.translate(an.px + TS / 2, an.py - 20); g.rotate(t * 3); g.strokeStyle = "#ffc060"; g.lineWidth = 2.2; g.lineCap = "round"; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 1.4); g.stroke(); g.restore(); }
      }
      drawLight(g, hour, lamps, mons, zonesLit);
      g.setTransform(1, 0, 0, 1, 0, 0);
      const layer = viewRef.current?.querySelector<HTMLDivElement>(".actors"); if (layer) {
        const nowMs = Date.now(); const parts: string[] = [];
        for (const l of ZONE_LABELS) { const lx = (l[1] * TS - camX) * scale; if (lx > -60 && lx < vw + 60) parts.push(`<div class="zlabel" style="left:${lx}px;top:${l[2] * TS * scale}px">${l[0]}</div>`); }
        for (const a of snap.actors) { const an = anims.get(`${a.kind}:${a.id}`)!; const lx = (an.px + TS / 2 - camX) * scale, top = (an.py - 20) * scale; if (lx < -80 || lx > vw + 80) continue; const you = a.kind === "human" && a.id === me.id; const mv = Math.abs(an.px - a.x * TS) > 0.5 || Math.abs(an.py - a.y * TS) > 0.5; const st = mv ? "" : a.mode === "busy" ? "⚙️" : a.kind === "agent" && a.state === "idle" ? "💤" : "✏️";
          parts.push(`<div class="tag ${you ? "you" : a.kind === "human" ? "human" : ""}" style="left:${lx}px;top:${top}px"><i class="dot ${a.kind === "agent" ? (a.state === "idle" ? "idle" : "work") : "human"}"></i>${esc(a.name)}<em>${st}</em></div>`);
          const b = bubblesRef.current.get(`${a.kind}:${a.id}`); if (b && b.until > nowMs) parts.push(`<div class="bubble" style="left:${Math.min(vw - 90, Math.max(90, lx))}px;top:${(an.py - 44) * scale}px">${esc(b.text)}</div>`); }
        layer.innerHTML = parts.join("");
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [me.id]);

  /* 입력 */
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return; const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }; if (m[e.key]) { e.preventDefault(); postMove({ dx: m[e.key][0], dy: m[e.key][1] }); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  const drag = useRef<{ x: number; cam: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => { drag.current = { x: e.clientX, cam: camRef.current.x, moved: false }; };
  const onMoveP = (e: React.PointerEvent<HTMLCanvasElement>) => { const dg = drag.current; if (!dg) return; const { scale, vw } = viewRefState.current; if (vw / scale >= W) return; const dxW = (e.clientX - dg.x) / scale; if (Math.abs(dxW) > 4) { dg.moved = true; camRef.current.x = Math.max(0, Math.min(W - vw / scale, dg.cam - dxW)); camRef.current.manual = 4; } };
  const onTap = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drag.current?.moved) { drag.current = null; return; } drag.current = null;
    const r = cvRef.current!.getBoundingClientRect(); const { scale } = viewRefState.current; const wx = (e.clientX - r.left) / scale + camRef.current.x, wy = (e.clientY - r.top) / scale; const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return;
    const hit = snapRef.current.actors.find((a) => a.kind === "agent" && a.x === tx && (a.y === ty || a.y === ty + 1));
    if (hit) { const row = roster.find((x) => x.id === hit.id); if (row) { setSel(row); return; } }
    if (!blocked(tx, ty)) postMove({ to: [tx, ty] });
  };
  const say = async () => { const t = text.trim(); if (!t) return; setText(""); await fetch("/api/office/say", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: t }) }); };
  const call = async (id: number, action: "call" | "dismiss" | "auto") => { const r = await fetch("/api/office/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agentId: id, action }) }).then((x) => x.json()); if (r.roster) setRoster(r.roster); };
  const assign = async () => { if (!sel || !taskTitle.trim()) return; setBusy(true); await fetch("/api/office/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agentId: sel.id, title: taskTitle.trim(), brief: taskBrief.trim(), projectId: taskProject || undefined }) }); setBusy(false); setTaskTitle(""); setTaskBrief(""); setSel(null); fetchRoster(setRoster); };
  const counts = useMemo(() => ({ work: roster.filter((r) => r.present && r.state === "work").length, idle: roster.filter((r) => !r.present || r.state === "idle").length, queue: roster.reduce((s, r) => s + r.queue, 0) }), [roster]);
  const stChip = (r: RosterRow) => !r.present ? (r.desired ? ["move", "출근 중"] : ["away", "부재"]) : !r.desired ? ["move", "퇴근 중"] : r.busy ? ["work", "실행 중"] : r.state === "idle" ? ["idle", "대기 · 큐 0"] : ["work", `근무 · 큐 ${r.queue}`];
  const ringOf = (r: RosterRow) => !r.present ? "var(--line-strong)" : r.state === "idle" ? "var(--amber)" : "var(--teal)";

  return (
    <div className="game">
      {alertMsg && <div className="toast" role="status">{alertMsg}</div>}
      <div className="stage" ref={stageRef}>
        <div className="view" ref={viewRef} style={{ width: view.vw, height: Math.round(H * view.scale) }}>
          <canvas ref={cvRef} style={{ width: view.vw, height: Math.round(H * view.scale), display: "block", cursor: "pointer", touchAction: "pan-y" }} onPointerDown={onDown} onPointerMove={onMoveP} onClick={onTap} role="img" aria-label="다나 오피스 — 탭한 곳으로 이동, AI를 탭하면 업무 지시, 좌우 드래그로 둘러보기" />
          <div className="layer actors" />
        </div>
        <div className="hud-l"><span className="clock">{clock}</span><span className="sep" /><span className="st"><b>{counts.work}</b> 근무</span><span className="st"><b>{counts.idle}</b> 대기</span><span className="st"><b>{counts.queue}</b> 큐</span></div>
        <div className="hud-r">{cost && <span className="st cost">${cost.today.toFixed(2)}{!cost.live && <em>MOCK</em>}</span>}<span className={`live ${connected ? "on" : ""}`}>{connected ? "LIVE" : "재접속"}</span></div>
      </div>
      <div className="dock">
        <div className="segpill"><button className={panel === "team" ? "on" : ""} onClick={() => setPanel("team")}>팀</button><button className={panel === "chat" ? "on" : ""} onClick={() => setPanel("chat")}>채팅</button><button className={panel === "ctl" ? "on" : ""} onClick={() => setPanel("ctl")}>조작</button></div>
        <div className="deck">
          <section className={`pane ${panel !== "team" ? "hide-m" : ""}`}>
            <h3>팀 <span className="sub">탭하면 업무 지시</span></h3>
            <div className="team">{roster.map((r) => { const s = stChip(r); const look = looks.get(r.id); return (
              <div className="member" key={r.id}>
                <button className="av" onClick={() => setSel(r)} aria-label={`${r.name} 업무 지시`}>{look ? <SpriteView look={look} size={30} ring={ringOf(r)} /> : <span className="avph" />}</button>
                <div className="mi"><button className="nm" onClick={() => setSel(r)}>{r.name}</button><div className="rl">{r.role}</div></div>
                <span className={`chip ${s[0]}`}>{s[1]}</span>
                <button className="btn sm ghost" onClick={() => call(r.id, r.desired ? "dismiss" : "call")}>{r.desired ? "내보내기" : "호출"}</button>
              </div>); })}</div>
          </section>
          <section className={`pane ${panel !== "chat" ? "hide-m" : ""}`}>
            <h3>오피스 로그</h3>
            <div className="chat" ref={chatRef}>{msgs.map((m, i) => <div className={`m ${m.kind}`} key={m.id ?? i}><span className="who">{m.name}</span><span className="body">{m.body}</span><time>{(m.ts || "").slice(11, 16)}</time></div>)}</div>
            <form className="chatin" onSubmit={(e) => { e.preventDefault(); say(); }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="@소라 처럼 부르면 출근합니다" aria-label="채팅 입력" /><button className="btn primary">보내기</button></form>
          </section>
          <section className={`pane ${panel !== "ctl" ? "hide-m" : ""}`}>
            <h3>조작</h3>
            <p className="hint">바닥을 탭하면 그곳으로 걸어가고, AI를 탭하면 업무를 지시합니다. 화면이 좁으면 카메라가 나를 따라오고 좌우 드래그로 둘러볼 수 있습니다. <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></p>
            <div className="dpad"><span /><button onClick={() => postMove({ dx: 0, dy: -1 })} aria-label="위">▲</button><span /><button onClick={() => postMove({ dx: -1, dy: 0 })} aria-label="왼쪽">◀</button><button onClick={() => postMove({ dx: 0, dy: 1 })} aria-label="아래">▼</button><button onClick={() => postMove({ dx: 1, dy: 0 })} aria-label="오른쪽">▶</button></div>
            <p className="hint">대기(💤)·부재 AI는 LLM을 호출하지 않습니다. 업무를 배정한 순간부터만 과금됩니다.</p>
          </section>
        </div>
      </div>
      {sel && (
        <div className="modal" onClick={() => setSel(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-h">{looks.get(sel.id) && <SpriteView look={looks.get(sel.id)!} size={44} ring={ringOf(sel)} />}<div><h2>{sel.name}</h2><div className="muted">{sel.role}</div></div><span className="sp" /><button className="btn sm ghost" onClick={() => setSel(null)}>닫기</button></div>
            <div className="row" style={{ marginBottom: 12 }}><span className={`chip ${sel.present ? (sel.state === "idle" ? "idle" : "work") : "away"}`}>{sel.present ? (sel.state === "idle" ? "대기 · 비용 0" : `근무 · 큐 ${sel.queue}`) : "부재 · 비용 0"}</span>
              <button className="btn sm" onClick={() => call(sel.id, sel.desired ? "dismiss" : "call")}>{sel.desired ? "내보내기" : "호출"}</button>{sel.manual && <button className="btn sm ghost" onClick={() => call(sel.id, "auto")}>편성 기준으로</button>}</div>
            <div className="lhead">업무 지시</div>
            <div className="field"><label>제목</label><input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="예: 무드보드 방향 3안" /></div>
            <div className="field" style={{ marginTop: 8 }}><label>브리프 (선택)</label><textarea value={taskBrief} onChange={(e) => setTaskBrief(e.target.value)} placeholder="무엇을, 누구를 위해, 어떤 톤으로" /></div>
            <div className="field" style={{ marginTop: 8 }}><label>프로젝트</label><select value={taskProject} onChange={(e) => setTaskProject(e.target.value ? Number(e.target.value) : "")}><option value="">자동 (편성된 프로젝트 / 직접 지시)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}><button className="btn primary" disabled={busy || !taskTitle.trim()} onClick={assign}>{busy ? "배정 중…" : "배정하고 시작"}</button></div>
            <p className="hint" style={{ marginTop: 8 }}>부재 중이면 호출되어 정문으로 들어온 뒤 자리에서 시작합니다. 산출물은 승인 큐에 올라옵니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
