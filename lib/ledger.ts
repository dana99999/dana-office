/**
 * 정산 · 계약 장부 — 프로젝트(deals)별 계약·견적·입금·지급·세금계산서 기록(deal_entries).
 * 화면(/api/ledger, 대표 세션)과 클로드 코드(/api/ledger/ingest, Bearer 토큰)가 같은 ledgerOp를 쓴다.
 * 돈 정보라 오피스 채팅·직원 화면에는 아무것도 흘리지 않는다.
 */
import { db } from "./db";
import { DEAL_ORDER, DEAL_STATUS, KIND, ENTRY_STATUS, today, type Deal, type DealStatus, type DealSum, type DealView, type Entry, type EntryKind, type EntryStatus } from "./ledger-meta";

export class LedgerError extends Error {}

export function listDeals(): Deal[] { return db().prepare("SELECT * FROM deals").all() as Deal[]; }
export function getDeal(id: number): Deal | undefined { return db().prepare("SELECT * FROM deals WHERE id = ?").get(id) as Deal | undefined; }
export function entriesOf(dealId: number): Entry[] { return sortEntries(db().prepare("SELECT * FROM deal_entries WHERE deal_id = ?").all(dealId) as Entry[]); }

/** 완료·취소 먼저(날짜 없는 계약·견적이 맨 위, 이후 날짜순) → 예정(기한순, 기한 없으면 뒤) */
export function sortEntries(es: Entry[]): Entry[] {
  const key = (e: Entry) => e.status === "plan" ? `1${e.due_date || e.date || "9999-99-99"}` : `0${e.date || e.due_date || "0000-00-00"}`;
  return [...es].sort((a, b) => key(a).localeCompare(key(b)) || a.id - b.id);
}

export function summarize(es: Entry[], td = today()): DealSum {
  const s: DealSum = { contract: 0, quote: 0, received: 0, receivable: 0, receivableVat: 0, paid: 0, payable: 0, margin: 0, openMargin: 0, invOut: 0, invOutPlan: 0, invInPlan: 0, overdue: 0, next: null };
  for (const e of es) {
    if (e.status === "cancel") continue;
    const plan = e.status === "plan";
    if (e.kind === "contract" && !plan) s.contract += e.amount;
    else if (e.kind === "quote") s.quote = e.amount;
    else if (e.kind === "in") { if (plan) { s.receivable += e.amount; s.receivableVat += e.vat; s.openMargin += e.amount - e.vat; } else s.received += e.amount; s.margin += e.amount - e.vat; }
    else if (e.kind === "out") { if (plan) { s.payable += e.amount; s.openMargin -= e.amount - e.vat; } else s.paid += e.amount; s.margin -= e.amount - e.vat; }
    else if (e.kind === "inv_out") { if (plan) s.invOutPlan += e.amount; else s.invOut += e.amount; }
    else if (e.kind === "inv_in" && plan) s.invInPlan += e.amount;
    if (plan && e.kind !== "note" && e.kind !== "quote") {
      if (e.due_date && e.due_date < td) s.overdue++;
      if (!s.next || (e.due_date || "9999") < (s.next.due_date || "9999")) s.next = e;
    }
  }
  return s;
}

export function dealViews(): DealView[] {
  const all = db().prepare("SELECT * FROM deal_entries").all() as Entry[]; const by = new Map<number, Entry[]>();
  for (const e of all) { const a = by.get(e.deal_id) || []; a.push(e); by.set(e.deal_id, a); }
  return listDeals().map((d) => { const es = sortEntries(by.get(d.id) || []); return { ...d, entries: es, sum: summarize(es) }; })
    .sort((a, b) => DEAL_ORDER.indexOf(a.status) - DEAL_ORDER.indexOf(b.status) || b.updated_at.localeCompare(a.updated_at));
}
export function dealView(id: number): DealView | undefined { const d = getDeal(id); if (!d) return; const es = entriesOf(id); return { ...d, entries: es, sum: summarize(es) }; }

/**
 * 회사 전체 — 받을 돈·줄 돈·받을 돈에 든 부가세(나중에 세금으로 나감) → 남는 돈.
 * 경유 자금(pass_through)은 받을 돈·줄 돈에서 빼고 따로 집계, 남는 돈에는 수수료(부가세 제외 차액)만 더한다.
 */
export function totalsOf(vs: DealView[]) {
  const t = { receivable: 0, receivableVat: 0, payable: 0, inCount: 0, outCount: 0, invTodo: 0, overdue: 0, ptIn: 0, ptOut: 0, ptFee: 0 };
  for (const v of vs) {
    t.overdue += v.sum.overdue;
    for (const e of v.entries) if (e.status === "plan" && (e.kind === "inv_out" || e.kind === "inv_in")) t.invTodo++;
    if (v.pass_through) { t.ptIn += v.sum.receivable; t.ptOut += v.sum.payable; t.ptFee += v.sum.openMargin; continue; }
    t.receivable += v.sum.receivable; t.receivableVat += v.sum.receivableVat; t.payable += v.sum.payable;
    for (const e of v.entries) if (e.status === "plan") { if (e.kind === "in") t.inCount++; else if (e.kind === "out") t.outCount++; }
  }
  return { ...t, net: t.receivable - t.payable + t.ptIn - t.ptOut, netExVat: t.receivable - t.payable - t.receivableVat + t.ptFee };
}

// ── 변경 ──
type B = Record<string, unknown>;
const str = (v: unknown, max = 200) => (v === undefined || v === null ? undefined : String(v).trim().slice(0, max));
const dateOf = (v: unknown, field: string): string | null | undefined => {
  if (v === undefined) return undefined; if (v === null || v === "") return null;
  const s = String(v).trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new LedgerError(`${field}는 YYYY-MM-DD 형식이어야 합니다: ${s}`); return s;
};
const intOf = (v: unknown, field: string): number | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).replace(/[,\s원]/g, "")); if (!Number.isFinite(n)) throw new LedgerError(`${field}가 숫자가 아닙니다: ${v}`); return Math.round(n);
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], field: string): T | undefined => {
  if (v === undefined || v === null || v === "") return undefined; const s = String(v) as T; if (!allowed.includes(s)) throw new LedgerError(`${field}는 ${allowed.join("|")} 중 하나: ${s}`); return s;
};
const DEAL_STATUSES = Object.keys(DEAL_STATUS) as DealStatus[];
const KINDS = Object.keys(KIND) as EntryKind[];
const ENTRY_STATUSES = Object.keys(ENTRY_STATUS) as EntryStatus[];

function touch(dealId: number) { db().prepare("UPDATE deals SET updated_at = datetime('now') WHERE id = ?").run(dealId); }

/** id가 있으면 그 프로젝트, 없으면 광고주+프로젝트명이 같은 것 → 없으면 새로 만든다 */
function upsertDeal(b: B): { id: number; created: boolean } {
  const d = db(); const id = intOf(b.id, "id");
  const client = str(b.client, 60); const name = str(b.name, 120); const status = oneOf(b.status, DEAL_STATUSES, "status");
  const folder = str(b.folder, 400); const memo = str(b.memo, 4000); const due = dateOf(b.due_date, "due_date");
  const pt = b.pass_through === undefined || b.pass_through === null ? undefined : b.pass_through === true || b.pass_through === 1 || b.pass_through === "1" || b.pass_through === "true" ? 1 : 0;
  const cur: Deal | undefined = id ? getDeal(id) : name ? (d.prepare("SELECT * FROM deals WHERE client = ? AND name = ?").get(client || "", name) as Deal | undefined) : undefined;
  if (id && !cur) throw new LedgerError(`프로젝트 #${id} 없음`);
  if (!cur) {
    if (!name) throw new LedgerError("새 프로젝트에는 name(프로젝트명)이 필요합니다");
    const r = d.prepare("INSERT INTO deals (client, name, status, folder, memo, due_date, pass_through) VALUES (?,?,?,?,?,?,?)").run(client || "", name, status || "active", folder || "", memo || "", due ?? null, pt ?? 0);
    return { id: Number(r.lastInsertRowid), created: true };
  }
  const sets: string[] = []; const vals: unknown[] = [];
  const put = (col: string, v: unknown) => { if (v !== undefined) { sets.push(`${col} = ?`); vals.push(v); } };
  if (id) { put("client", client); put("name", name); } put("status", status); put("folder", folder); put("memo", memo); put("due_date", due); put("pass_through", pt);
  if (sets.length) d.prepare(`UPDATE deals SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...vals, cur.id);
  return { id: cur.id, created: false };
}

function resolveDealId(b: B): number {
  const id = intOf(b.deal_id, "deal_id"); if (id) { if (!getDeal(id)) throw new LedgerError(`프로젝트 #${id} 없음`); return id; }
  if (!str(b.name)) throw new LedgerError("deal_id 또는 client+name(프로젝트) 필요");
  return upsertDeal({ client: b.client, name: b.name, status: b.deal_status }).id;
}

function addEntry(b: B, source: string): { id: number; deal_id: number } {
  const kind = oneOf(b.kind, KINDS, "kind"); if (!kind) throw new LedgerError(`kind 필요 (${KINDS.join("|")})`);
  const status = oneOf(b.status, ENTRY_STATUSES, "status") || "done";
  const amount = intOf(b.amount, "amount") ?? 0; const vat = intOf(b.vat, "vat") ?? 0;
  const date = dateOf(b.date, "date") ?? null, due = dateOf(b.due_date, "due_date") ?? null;
  const dealId = resolveDealId(b); // 값 검증이 끝난 뒤에 프로젝트를 만든다(잘못된 요청으로 빈 프로젝트가 생기지 않게)
  const r = db().prepare("INSERT INTO deal_entries (deal_id, kind, status, date, due_date, party, title, amount, vat, memo, source) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(dealId, kind, status, date, due, str(b.party, 80) || "", str(b.title, 200) || "", amount, vat, str(b.memo, 4000) || "", source.slice(0, 40));
  touch(dealId); return { id: Number(r.lastInsertRowid), deal_id: dealId };
}

function updateEntry(b: B): { id: number } {
  const id = intOf(b.id, "id"); const cur = id ? (db().prepare("SELECT * FROM deal_entries WHERE id = ?").get(id) as Entry | undefined) : undefined;
  if (!cur) throw new LedgerError(`기록 #${b.id} 없음`);
  const sets: string[] = []; const vals: unknown[] = [];
  const put = (col: string, v: unknown) => { if (v !== undefined) { sets.push(`${col} = ?`); vals.push(v); } };
  const dealId = intOf(b.deal_id, "deal_id"); if (dealId && !getDeal(dealId)) throw new LedgerError(`프로젝트 #${dealId} 없음`);
  const status = oneOf(b.status, ENTRY_STATUSES, "status");
  put("deal_id", dealId); put("kind", oneOf(b.kind, KINDS, "kind")); put("status", status);
  const date = dateOf(b.date, "date");
  put("date", date !== undefined ? date : status === "done" && !cur.date ? today() : undefined); // 완료 처리인데 날짜가 없으면 오늘
  put("due_date", dateOf(b.due_date, "due_date")); put("party", str(b.party, 80)); put("title", str(b.title, 200));
  put("amount", intOf(b.amount, "amount")); put("vat", intOf(b.vat, "vat")); put("memo", str(b.memo, 4000));
  if (sets.length) db().prepare(`UPDATE deal_entries SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(...vals, cur.id);
  touch(cur.deal_id); if (dealId && dealId !== cur.deal_id) touch(dealId);
  return { id: cur.id };
}

export function ledgerOp(b: B, source: string): unknown {
  const op = String(b.op || "");
  switch (op) {
    case "list": { const vs = dealViews(); return { totals: totalsOf(vs), deals: vs }; }
    case "deal": return upsertDeal(b);
    case "deal_delete": { const id = intOf(b.id, "id"); if (!id || !getDeal(id)) throw new LedgerError(`프로젝트 #${b.id} 없음`); db().prepare("DELETE FROM deals WHERE id = ?").run(id); return { id, deleted: true }; }
    case "entry": return addEntry(b, source);
    case "update": return updateEntry(b);
    case "delete": { const id = intOf(b.id, "id"); const r = db().prepare("SELECT deal_id FROM deal_entries WHERE id = ?").get(id ?? 0) as { deal_id: number } | undefined; if (!r) throw new LedgerError(`기록 #${b.id} 없음`); db().prepare("DELETE FROM deal_entries WHERE id = ?").run(id); touch(r.deal_id); return { id, deleted: true }; }
    case "batch": {
      const items = Array.isArray(b.items) ? (b.items as B[]) : []; if (!items.length) throw new LedgerError("items 비어 있음");
      return { results: db().transaction(() => items.map((it, i) => { if (it.op === "batch" || it.op === "list") throw new LedgerError(`items[${i}]: ${it.op}는 batch 안에서 못 씀`); try { return ledgerOp(it, source); } catch (e) { throw e instanceof LedgerError ? new LedgerError(`items[${i}]: ${e.message}`) : e; } }))() };
    }
    default: throw new LedgerError("op는 list|deal|deal_delete|entry|update|delete|batch 중 하나");
  }
}
