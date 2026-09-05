import { db } from "../db";
import type { Agent, Look, PresenceState, User } from "../types";
import { ENTRANCE, findPath, pick, WANDER, type Tile, TS } from "./map";
import type { ActorSnap, WorldEvent, WorldSnapshot } from "./types";
import { runQueuedTask } from "../agent/invoke";

interface Actor extends ActorSnap {
  path: Tile[]; stepT: number; wait: number; lastSeen: number; busy: boolean; manual: "in" | "out" | "";
}
type Sub = (ev: WorldEvent) => void;

const TICK = 250, STEP_MS = 420, RUN_INTERVAL_MS = Number(process.env.RUN_INTERVAL_MS || 12000), HUMAN_TIMEOUT = 20000;

export class World {
  actors = new Map<string, Actor>();
  subs = new Set<Sub>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRun = 0; private lastSync = 0; private dirty = true; private lastBeat = 0;

  constructor() { this.syncAgents(); this.timer = setInterval(() => this.tick(), TICK); }
  key(kind: "agent" | "human", id: number) { return `${kind}:${id}`; }

  /** DB의 에이전트 목록을 메모리에 반영 (추가·삭제·외형 변경) */
  syncAgents() {
    const d = db();
    const agents = d.prepare("SELECT * FROM agents WHERE active = 1").all() as Agent[];
    const seen = new Set<string>();
    for (const a of agents) {
      const k = this.key("agent", a.id); seen.add(k);
      const pres = d.prepare("SELECT state, x, y, manual FROM presence WHERE agent_id = ?").get(a.id) as { state: PresenceState; x: number; y: number; manual: string } | undefined;
      let act = this.actors.get(k);
      if (!act) {
        const present = !!pres && pres.state !== "away";
        act = { kind: "agent", id: a.id, name: a.name, role: a.role_title, look: JSON.parse(a.sprite_json), zone: a.zone, seat: [a.desk_x, a.desk_y], x: present ? pres!.x : ENTRANCE[0], y: present ? pres!.y : ENTRANCE[1], px: 0, py: 0, dir: "down", moving: false,
          state: pres ? pres.state : "away", mode: "work", queue: 0, screen: a.screen, present, path: [], stepT: 0, wait: 1, lastSeen: 0, busy: false, manual: (pres?.manual as Actor["manual"]) || "" };
        if (act.state === "leaving" || act.state === "arriving") { act.state = present ? "work" : "away"; }
        this.actors.set(k, act);
      } else { act.name = a.name; act.role = a.role_title; act.look = JSON.parse(a.sprite_json); act.zone = a.zone; act.seat = [a.desk_x, a.desk_y]; act.screen = a.screen; }
    }
    for (const [k, a] of this.actors) if (a.kind === "agent" && !seen.has(k)) this.actors.delete(k);
    this.refreshQueues();
    this.dirty = true;
  }
  refreshQueues() {
    const rows = db().prepare("SELECT assignee_agent_id AS id, COUNT(*) AS c FROM tasks WHERE status IN ('queued','doing') AND assignee_agent_id IS NOT NULL GROUP BY assignee_agent_id").all() as { id: number; c: number }[];
    const m = new Map(rows.map((r) => [r.id, r.c]));
    for (const a of this.actors.values()) if (a.kind === "agent") a.queue = m.get(a.id) || 0;
  }
  desired(a: Actor): boolean {
    if (a.manual === "in") return true; if (a.manual === "out") return false;
    const r = db().prepare("SELECT 1 FROM assignments s JOIN projects p ON p.id = s.project_id WHERE s.agent_id = ? AND p.status = 'active' LIMIT 1").get(a.id);
    return !!r;
  }
  private persist(a: Actor) { db().prepare("INSERT INTO presence (agent_id, state, x, y, manual, since) VALUES (?,?,?,?,?,datetime('now')) ON CONFLICT(agent_id) DO UPDATE SET state=excluded.state, x=excluded.x, y=excluded.y, manual=excluded.manual, since=excluded.since").run(a.id, a.state, a.x, a.y, a.manual); }
  private setState(a: Actor, s: PresenceState) { if (a.state === s) return; a.state = s; this.persist(a); this.emit({ type: "presence", data: { agentId: a.id, state: s, name: a.name } }); }

  /** 다른 액터가 서 있거나 향하고 있는 타일은 피한다 (라운지에서 겹침 방지) */
  private freeSpot(cands: Tile[], self: Actor): Tile {
    const taken = new Set<string>();
    for (const o of this.actors.values()) { if (o === self || !o.present) continue; const end = o.path.length ? o.path[o.path.length - 1] : [o.x, o.y]; taken.add(`${end[0]},${end[1]}`); taken.add(`${o.x},${o.y}`); }
    const free = cands.filter((t) => !taken.has(`${t[0]},${t[1]}`));
    return pick(free.length ? free : cands);
  }
  /* ── 상태 머신 ─────────────────────────────────────── */
  private decide(a: Actor) {
    if (a.kind !== "agent") return;
    const want = this.desired(a);
    if (!a.present) {
      if (want) { a.present = true; a.x = ENTRANCE[0]; a.y = ENTRANCE[1]; a.path = findPath([a.x, a.y], a.seat); this.setState(a, "arriving"); this.say("system", 0, "무결", `${a.name} 호출 — 정문 통과`, "office"); }
      a.wait = 2; return;
    }
    if (!want) { if (a.state !== "leaving") { a.path = findPath([a.x, a.y], ENTRANCE); this.setState(a, "leaving"); } a.wait = 2; return; }
    if (a.busy) { a.wait = 1; return; }
    if (a.queue <= 0) {
      if (a.state !== "idle") { this.setState(a, "idle"); a.mode = "idle"; a.path = findPath([a.x, a.y], this.freeSpot(WANDER.lounge, a)); }
      else if (Math.random() < 0.25) a.path = findPath([a.x, a.y], this.freeSpot(WANDER.lounge, a));
      a.wait = 8 + Math.random() * 8; return;
    }
    if (a.state !== "work" || a.x !== a.seat[0] || a.y !== a.seat[1]) { this.setState(a, "work"); a.mode = "work"; a.path = findPath([a.x, a.y], a.seat); }
    a.wait = 10 + Math.random() * 10;
  }

  private tick() {
    const now = Date.now(); let moved = false;
    for (const [k, a] of this.actors) {
      if (a.kind === "human" && now - a.lastSeen > HUMAN_TIMEOUT) { this.actors.delete(k); this.dirty = true; continue; }
      if (a.path.length) {
        a.stepT += TICK;
        if (a.stepT >= STEP_MS) {
          a.stepT = 0; const n = a.path.shift()!; a.dir = n[0] > a.x ? "right" : n[0] < a.x ? "left" : n[1] > a.y ? "down" : "up"; a.x = n[0]; a.y = n[1]; moved = true;
          if (!a.path.length) {
            if (a.kind === "agent") {
              if (a.state === "leaving") { a.present = false; this.setState(a, "away"); this.say("system", 0, "무결", `${a.name} 퇴근 — 편성 없음, 비용 0`, "office"); }
              else if (a.state === "arriving") { this.setState(a, "work"); a.mode = "work"; a.dir = "down"; a.wait = 1; }
              else if (a.state === "work" || a.state === "idle") a.dir = "down";
              this.persist(a);
            }
          }
        }
        a.moving = true;
      } else { a.moving = false; if (a.kind === "agent") { a.wait -= TICK / 1000; if (a.wait <= 0) this.decide(a); } }
    }
    if (now - this.lastSync > 30000) { this.lastSync = now; this.syncAgents(); }
    if (now - this.lastRun > RUN_INTERVAL_MS) { this.lastRun = now; void this.runOne(); }
    if (moved || this.dirty || now - this.lastBeat > 2000) { this.lastBeat = now; this.dirty = false; this.emit({ type: "snapshot", data: this.snapshot() }); }
  }

  /** 작업 러너 — 근무 상태이고 자리에 있는 에이전트의 큐에서 하나 실행 */
  private async runOne() {
    const d = db();
    const candidates = [...this.actors.values()].filter((a) => a.kind === "agent" && a.present && a.state === "work" && !a.busy && a.queue > 0 && !a.path.length);
    for (const a of candidates) {
      const t = d.prepare("SELECT id FROM tasks WHERE assignee_agent_id = ? AND status = 'queued' ORDER BY priority, id LIMIT 1").get(a.id) as { id: number } | undefined;
      if (!t) continue;
      a.busy = true; a.mode = "busy"; this.dirty = true;
      try {
        const r = await runQueuedTask(a.id, t.id, { presenceState: a.state });
        if (r.ok) { this.say("agent", a.id, a.name, r.message || "산출물을 승인 큐에 올렸습니다.", "office"); this.emit({ type: "task", data: { taskId: t.id, status: "review", agentId: a.id, title: r.title || "" } }); }
        else { this.emit({ type: "alert", data: { level: "warn", body: `${a.name}: ${r.reason}` } }); }
      } catch (e) { this.emit({ type: "alert", data: { level: "critical", body: `${a.name} 실행 오류: ${(e as Error).message}` } }); }
      a.busy = false; a.mode = "work"; this.refreshQueues(); this.dirty = true;
      break; // 한 tick에 하나만
    }
  }

  /* ── 외부 API ─────────────────────────────────────── */
  snapshot(): WorldSnapshot {
    const h = new Date(); const hour = h.getHours() + h.getMinutes() / 60;
    return { t: Date.now(), hour, actors: [...this.actors.values()].filter((a) => a.present).map((a) => ({ kind: a.kind, id: a.id, name: a.name, role: a.role, look: a.look, zone: a.zone, seat: a.seat, x: a.x, y: a.y, px: a.x * TS, py: a.y * TS, dir: a.dir, moving: a.moving, state: a.state, mode: a.mode, queue: a.queue, screen: a.screen, present: a.present })) };
  }
  roster() { return [...this.actors.values()].filter((a) => a.kind === "agent").map((a) => ({ id: a.id, name: a.name, role: a.role, state: a.state, present: a.present, queue: a.queue, manual: a.manual, desired: this.desired(a), busy: a.busy })); }
  subscribe(fn: Sub) { this.subs.add(fn); return () => { this.subs.delete(fn); }; }
  private emit(ev: WorldEvent) { for (const s of this.subs) { try { s(ev); } catch { /* dropped */ } } }

  humanJoin(u: User) {
    const k = this.key("human", u.id); let a = this.actors.get(k);
    if (!a) { a = { kind: "human", id: u.id, name: u.display_name, role: u.role === "ceo" ? "대표이사" : "직원", look: u.sprite_json ? (JSON.parse(u.sprite_json) as Look) : defaultLook(), zone: "", seat: [u.seat_x, u.seat_y], x: u.seat_x, y: u.seat_y, px: 0, py: 0, dir: "down", moving: false, state: "online", mode: "work", queue: 0, screen: "doc", present: true, path: [], stepT: 0, wait: 0, lastSeen: Date.now(), busy: false, manual: "" }; this.actors.set(k, a); this.dirty = true; }
    a.lastSeen = Date.now(); if (u.sprite_json) a.look = JSON.parse(u.sprite_json); return a;
  }
  humanPing(uid: number) { const a = this.actors.get(this.key("human", uid)); if (a) a.lastSeen = Date.now(); }
  humanMove(uid: number, to: Tile): boolean { const a = this.actors.get(this.key("human", uid)); if (!a) return false; const p = findPath([a.x, a.y], to); if (!p.length) return false; a.path = p; a.stepT = STEP_MS; return true; }
  humanStep(uid: number, dx: number, dy: number): boolean { const a = this.actors.get(this.key("human", uid)); if (!a) return false; if (a.path.length) return false; a.dir = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up"; return this.humanMove(uid, [a.x + dx, a.y + dy]); }
  say(kind: "agent" | "human" | "system", id: number, name: string, body: string, channel = "office") {
    const r = db().prepare("INSERT INTO messages (channel, sender_kind, sender_id, sender_name, body) VALUES (?,?,?,?,?)").run(channel, kind, id, name, body);
    const ts = (db().prepare("SELECT ts FROM messages WHERE id = ?").get(Number(r.lastInsertRowid)) as { ts: string }).ts;
    this.emit({ type: "say", data: { kind, id, name, body, ts, channel } });
  }
  /** 사람 발화 처리 — @멘션이면 호출·응답(저장 문장, LLM 없음) */
  humanSay(u: User, body: string) {
    this.say("human", u.id, u.display_name, body);
    const m = body.match(/@([^\s@]+)/g) || [];
    for (const tag of m) {
      const name = tag.slice(1);
      const a = [...this.actors.values()].find((x) => x.kind === "agent" && x.name === name);
      if (!a) continue;
      if (!a.present) { a.manual = "in"; this.persist(a); a.wait = 0; setTimeout(() => this.say("agent", a.id, a.name, `${u.display_name}님, 부르셔서 출근합니다. 자리에 앉으면 시작할게요.`), 800); }
      else if (a.queue > 0) setTimeout(() => this.say("agent", a.id, a.name, `지금 배정된 작업을 처리 중입니다. 곧 승인 큐에 올라가요.`), 700);
      else setTimeout(() => this.say("agent", a.id, a.name, `지금 배정된 일이 없어요. 업무를 주시면 바로 시작할게요. (대기 중 — 비용 0)`), 700);
    }
  }
  callAgent(agentId: number, byName: string) { const a = this.actors.get(this.key("agent", agentId)); if (!a) return false; a.manual = "in"; this.persist(a); a.wait = 0; this.say("system", 0, "무결", `${byName}님이 ${a.name}을(를) 호출했습니다.`); return true; }
  dismissAgent(agentId: number, byName: string) { const a = this.actors.get(this.key("agent", agentId)); if (!a) return false; a.manual = "out"; this.persist(a); a.wait = 0; this.say("system", 0, "무결", `${byName}님이 ${a.name}을(를) 내보냈습니다. 진행 중 작업은 저장됩니다.`); return true; }
  clearManual(agentId: number) { const a = this.actors.get(this.key("agent", agentId)); if (a) { a.manual = ""; this.persist(a); a.wait = 0; } }
  notifyTasksChanged() { this.refreshQueues(); this.dirty = true; for (const a of this.actors.values()) if (a.kind === "agent") a.wait = Math.min(a.wait, 1); }
  stop() { if (this.timer) clearInterval(this.timer); }
}

export function defaultLook(): Look { return { hair: "short", hair_c: ["#2b2118", "#4a3a2c"], skin: ["#eabf99", "#c99268"], outfit: "tee", top: ["#2f7d6f", "#215a50"], accent: "#e8f3ef", bottom: ["#26283a", "#1b1c2a"], shoe: ["#1a1a22", "#3a3a48"] }; }

const g = globalThis as unknown as { __danaWorld?: World };
export function getWorld(): World { if (!g.__danaWorld) g.__danaWorld = new World(); return g.__danaWorld; }
