"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/icons";
import { DEAL_STATUS, ENTRY_STATUS, KIND, KINDS, type DealStatus, type Entry, type EntryKind, type EntryStatus } from "@/lib/ledger-meta";

type DealOpt = { id: number; label: string };
type DealLite = { id: number; client: string; name: string; status: DealStatus; due_date: string | null; folder: string; memo: string; pass_through: number };

async function op(body: Record<string, unknown>) {
  const r = await fetch("/api/ledger", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "저장 실패"); return j;
}
const digits = (s: string) => s.replace(/[^\d-]/g, "");
const comma = (s: string) => { const d = digits(s); return d === "" || d === "-" ? d : Number(d).toLocaleString("ko-KR"); };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal" onClick={onClose}><div className="box" onClick={(e) => e.stopPropagation()}>
    <div className="topbar"><h1 style={{ fontSize: "1.1rem" }}>{title}</h1><span className="sp" /><button className="btn sm" onClick={onClose}>닫기</button></div>{children}
  </div></div>;
}

// ── 프로젝트 ──
type DF = { client: string; name: string; status: DealStatus; due_date: string; folder: string; memo: string; pass_through: boolean };
function DealFields({ f, setF }: { f: DF; setF: (f: DF) => void }) {
  return <>
    <div className="grid g2">
      <div className="field"><label>광고주 (돈 주는 곳)</label><input value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })} placeholder="예맛상사" /></div>
      <div className="field"><label>프로젝트명</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="다시마부각칩 북미 마케팅" /></div>
      <div className="field"><label>상태</label><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as DealStatus })}>{(Object.keys(DEAL_STATUS) as DealStatus[]).map((k) => <option key={k} value={k}>{DEAL_STATUS[k][0]}</option>)}</select></div>
      <div className="field"><label>마감 · 납품일</label><input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></div>
    </div>
    <div className="field" style={{ marginTop: 10 }}><label>작업 폴더 경로</label><input value={f.folder} onChange={(e) => setF({ ...f, folder: e.target.value })} placeholder="@업체 자료/NN.광고주/" /></div>
    <div className="field" style={{ marginTop: 10 }}><label>메모 — 계약 조건, 특이사항</label><textarea value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} /></div>
    <label className="row" style={{ marginTop: 10, fontSize: 13 }}><input type="checkbox" checked={f.pass_through} onChange={(e) => setF({ ...f, pass_through: e.target.checked })} /> 경유 자금 — 받아서 그대로 넘기고 수수료만 남는 돈 (받을 돈 · 줄 돈 합계와 따로 봄)</label>
  </>;
}

export function NewDeal() {
  const r = useRouter(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [f, setF] = useState<DF>({ client: "", name: "", status: "active", due_date: "", folder: "", memo: "", pass_through: false });
  const save = async () => { setBusy(true); setErr(""); try { const j = await op({ op: "deal", ...f, due_date: f.due_date || null }); r.push(`/ledger/${j.id}`); r.refresh(); } catch (e) { setErr((e as Error).message); setBusy(false); } };
  return <>
    <button className="btn primary" onClick={() => setOpen(true)}>+ 프로젝트</button>
    {open && <Modal title="새 프로젝트" onClose={() => setOpen(false)}><DealFields f={f} setF={setF} />{err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}><button className="btn primary" disabled={busy || !f.name.trim()} onClick={save}>{busy ? "만드는 중…" : "만들기"}</button></div></Modal>}
  </>;
}

export function DealControls({ deal }: { deal: DealLite }) {
  const r = useRouter(); const [open, setOpen] = useState(false); const [err, setErr] = useState("");
  const [f, setF] = useState<DF>({ client: deal.client, name: deal.name, status: deal.status, due_date: deal.due_date || "", folder: deal.folder, memo: deal.memo, pass_through: !!deal.pass_through });
  const run = async (body: Record<string, unknown>) => { setErr(""); try { await op(body); r.refresh(); return true; } catch (e) { setErr((e as Error).message); return false; } };
  return <span className="row" style={{ gap: 6 }}>
    <select className="tmove" aria-label="프로젝트 상태" value={deal.status} onChange={(e) => run({ op: "deal", id: deal.id, status: e.target.value })}>{(Object.keys(DEAL_STATUS) as DealStatus[]).map((k) => <option key={k} value={k}>{DEAL_STATUS[k][0]}</option>)}</select>
    <button className="btn sm" onClick={() => setOpen(true)}>수정</button>
    <button className="btn sm ghost danger" onClick={async () => { if (!confirm(`「${deal.name}」 프로젝트와 기록을 모두 지울까요?`)) return; await op({ op: "deal_delete", id: deal.id }); r.push("/ledger"); r.refresh(); }}>삭제</button>
    {open && <Modal title="프로젝트 수정" onClose={() => setOpen(false)}><DealFields f={f} setF={setF} />{err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}><button className="btn primary" disabled={!f.name.trim()} onClick={async () => { if (await run({ op: "deal", id: deal.id, ...f, due_date: f.due_date || null })) setOpen(false); }}>저장</button></div></Modal>}
  </span>;
}

// ── 기록 ──
type EF = { deal_id: number; kind: EntryKind; status: EntryStatus; date: string; due_date: string; party: string; title: string; amount: string; vat: string; memo: string };
const fromEntry = (e: Entry): EF => ({ deal_id: e.deal_id, kind: e.kind, status: e.status, date: e.date || "", due_date: e.due_date || "", party: e.party, title: e.title, amount: e.amount ? e.amount.toLocaleString("ko-KR") : "", vat: e.vat ? e.vat.toLocaleString("ko-KR") : "", memo: e.memo });

export function EntryButton({ dealId, deals, entry, label, primary }: { dealId: number; deals: DealOpt[]; entry?: Entry; label: string; primary?: boolean }) {
  const r = useRouter(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const blank: EF = { deal_id: dealId, kind: "in", status: "plan", date: "", due_date: "", party: "", title: "", amount: "", vat: "", memo: "" };
  const [f, setF] = useState<EF>(entry ? fromEntry(entry) : blank);
  const save = async () => {
    setBusy(true); setErr("");
    const body = { ...f, amount: Number(digits(f.amount) || 0), vat: Number(digits(f.vat) || 0), date: f.date || null, due_date: f.due_date || null };
    try { await op(entry ? { op: "update", id: entry.id, ...body } : { op: "entry", ...body }); setOpen(false); if (!entry) setF(blank); r.refresh(); } catch (e) { setErr((e as Error).message); } setBusy(false);
  };
  return <>
    <button className={`btn sm ${primary ? "primary" : ""}`} onClick={() => { setF(entry ? fromEntry(entry) : blank); setOpen(true); }}>{label}</button>
    {open && <Modal title={entry ? "기록 수정" : "기록 추가"} onClose={() => setOpen(false)}>
      <div className="lhead">구분</div>
      <div className="segs" style={{ marginBottom: 10 }}>{KINDS.map((k) => <button key={k} type="button" className={f.kind === k ? "on" : ""} onClick={() => setF({ ...f, kind: k })}>{KIND[k].label}</button>)}</div>
      <div className="lhead">상태</div>
      <div className="segs" style={{ marginBottom: 12 }}>{(Object.keys(ENTRY_STATUS) as EntryStatus[]).map((s) => <button key={s} type="button" className={f.status === s ? "on" : ""} onClick={() => setF({ ...f, status: s })}>{s === "plan" ? KIND[f.kind].plan : s === "done" ? KIND[f.kind].done : "취소"}</button>)}</div>
      <div className="grid g2">
        <div className="field"><label>{f.status === "plan" ? "기한" : "날짜"}</label><input type="date" value={f.status === "plan" ? f.due_date : f.date} onChange={(e) => setF(f.status === "plan" ? { ...f, due_date: e.target.value } : { ...f, date: e.target.value })} /></div>
        <div className="field"><label>상대방 (사람 · 회사)</label><input value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })} placeholder="스트라트텐" /></div>
      </div>
      <div className="field" style={{ marginTop: 10 }}><label>내용</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="잔금 · 선금 50% · 공장영상 잔금" /></div>
      <div className="grid g2" style={{ marginTop: 10 }}>
        <div className="field"><label>금액 (실제로 오가는 돈, 부가세 포함)</label><input inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: comma(e.target.value) })} /></div>
        <div className="field"><label>그중 부가세</label><div className="row" style={{ flexWrap: "nowrap" }}><input style={{ flex: 1, minWidth: 0 }} inputMode="numeric" value={f.vat} onChange={(e) => setF({ ...f, vat: comma(e.target.value) })} /><button type="button" className="btn sm" onClick={() => setF({ ...f, vat: Math.round(Number(digits(f.amount) || 0) / 11).toLocaleString("ko-KR") })}>10% 포함</button></div></div>
      </div>
      <div className="field" style={{ marginTop: 10 }}><label>메모</label><textarea value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} style={{ minHeight: 70 }} /></div>
      {entry && <div className="field" style={{ marginTop: 10 }}><label>프로젝트 옮기기</label><select value={f.deal_id} onChange={(e) => setF({ ...f, deal_id: Number(e.target.value) })}>{deals.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>}
      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}><button className="btn primary" disabled={busy} onClick={save}>{busy ? "저장 중…" : "저장"}</button></div>
    </Modal>}
  </>;
}

export function EntryActions({ entry, deals }: { entry: Entry; deals: DealOpt[] }) {
  const r = useRouter();
  return <span className="row" style={{ gap: 4, flexWrap: "nowrap", justifyContent: "flex-end" }}>
    {entry.status === "plan" && entry.kind !== "note" && <button className="btn sm" title="오늘 날짜로 완료 처리" onClick={async () => { await op({ op: "update", id: entry.id, status: "done" }); r.refresh(); }}>완료</button>}
    <EntryButton dealId={entry.deal_id} deals={deals} entry={entry} label="수정" />
    <button className="btn sm ghost xdel" aria-label="기록 삭제" title="삭제" onClick={async () => { if (!confirm(`「${entry.title || KIND[entry.kind].label}」 기록을 지울까요?`)) return; await op({ op: "delete", id: entry.id }); r.refresh(); }}><I.x size={14} /></button>
  </span>;
}
