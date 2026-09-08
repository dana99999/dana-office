"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
/** 광고주 태그 — 클릭하면 기존 광고주 선택 또는 새 이름 입력 */
export function ClientTag({ id, client, options }: { id: number; client: string; options: string[] }) {
  const [edit, setEdit] = useState(false); const [val, setVal] = useState(client); const [busy, setBusy] = useState(false); const router = useRouter();
  const save = async (v: string) => { setBusy(true); await fetch(`/api/archive/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ client: v }) }); setBusy(false); setEdit(false); router.refresh(); };
  if (!edit) return <button type="button" className={`chip ${client ? "client" : "away"} tagbtn`} onClick={() => { setVal(client); setEdit(true); }} title="광고주 태그 변경">{client || "광고주 미지정"}</button>;
  return (
    <span className="row" style={{ gap: 6 }}>
      <input list={`clients-${id}`} value={val} onChange={(e) => setVal(e.target.value)} placeholder="광고주명" style={{ padding: "4px 9px", border: "1px solid var(--line-strong)", borderRadius: 999, fontSize: 12, minHeight: 28, width: 140, background: "var(--surface)", color: "var(--ink)" }} autoFocus onKeyDown={(e) => { if (e.key === "Enter") save(val); if (e.key === "Escape") setEdit(false); }} />
      <datalist id={`clients-${id}`}>{options.map((o) => <option key={o} value={o} />)}</datalist>
      <button type="button" className="btn sm primary" disabled={busy} onClick={() => save(val)}>저장</button>
      {client && <button type="button" className="btn sm ghost" disabled={busy} onClick={() => save("")}>해제</button>}
      <button type="button" className="btn sm ghost" onClick={() => setEdit(false)}>취소</button>
    </span>
  );
}
