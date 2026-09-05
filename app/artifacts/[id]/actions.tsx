"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ArtifactActions({ id, canApprove }: { id: number; canApprove: boolean }) {
  const r = useRouter(); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
  const act = async (action: "approve" | "reject") => { setBusy(true); const res = await fetch(`/api/artifacts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason }) }); const j = await res.json().catch(() => ({})); setBusy(false); if (!res.ok) { alert(j.error || "실패"); return; } r.push("/approvals"); r.refresh(); };
  if (!canApprove) return <div className="muted" style={{ marginTop: 12 }}>이 산출물의 1차 승인자가 아닙니다.</div>;
  return <div className="card" style={{ marginTop: 12 }}><div className="row"><button className="btn primary" disabled={busy} onClick={() => act("approve")}>승인</button><input placeholder="반려 사유 (필수) — 다음 작업 프롬프트에 주입됩니다" value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: 1, minWidth: 200, padding: "8px 10px", border: "1px solid var(--line-strong)", borderRadius: 3, background: "var(--surface)", color: "var(--ink)" }} /><button className="btn danger" disabled={busy || reason.trim().length < 2} onClick={() => act("reject")}>반려 → 재작업</button></div></div>;
}
