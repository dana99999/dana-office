"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ArtifactRow } from "@/lib/queries";
import type { ImageRequest } from "@/lib/types";
type Img = ImageRequest & { agent_name: string; task_title: string };
export function ApprovalsClient({ items, images, me, genspark }: { items: ArtifactRow[]; images: Img[]; me: { id: number; role: string }; genspark: { url: string; mode: string } }) {
  const r = useRouter(); const [reason, setReason] = useState<Record<number, string>>({}); const [busy, setBusy] = useState<number | null>(null);
  const act = async (id: number, action: "approve" | "reject") => { setBusy(id); const res = await fetch(`/api/artifacts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason: reason[id] }) }); const j = await res.json().catch(() => ({})); setBusy(null); if (!res.ok) alert(j.error || "실패"); r.refresh(); };
  return (
    <div>
      <div className="topbar"><h1>승인 큐</h1><span className="sub">반려 사유는 필수이며 다음 작업 프롬프트에 그대로 들어갑니다.</span></div>
      {images.length > 0 && (<div className="card" style={{ marginBottom: 14 }}>
        <div className="lhead">이미지 생성 요청 — 젠스파크 {genspark.mode === "api" ? "(API 연결됨)" : "(핸드오프)"}</div>
        <p className="muted">AI가 만든 프롬프트를 복사해 <a href={genspark.url} target="_blank" rel="noreferrer">젠스파크</a>에서 생성한 뒤 결과 이미지를 올리면 산출물에 붙습니다.</p>
        {images.map((im) => <ImageCard key={im.id} im={im} onDone={() => r.refresh()} />)}
      </div>)}
      {items.length === 0 && <div className="card muted">검토 대기 산출물이 없습니다.</div>}
      <div className="grid">
        {items.map((a) => (
          <div className="card" key={a.id}>
            <div className="row" style={{ justifyContent: "space-between" }}><div><b>{a.title}</b><div className="muted">{a.agent_name} · {a.project_name} · {a.task_title} · {a.created_at.slice(0, 16)}</div></div><Link className="btn sm" href={`/artifacts/${a.id}`}>전체 보기</Link></div>
            <pre className="muted" style={{ whiteSpace: "pre-wrap", maxHeight: 140, overflow: "hidden", fontFamily: "inherit", margin: "8px 0", fontSize: 12.5 }}>{a.body_md.slice(0, 600)}{a.body_md.length > 600 ? "…" : ""}</pre>
            {a.image_request_id && <div className="muted">🖼️ 이미지 요청 {a.image_status === "done" ? "완료" : "대기 (젠스파크)"}</div>}
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" disabled={busy === a.id} onClick={() => act(a.id, "approve")}>승인</button>
              <input placeholder="반려 사유 (필수)" value={reason[a.id] || ""} onChange={(e) => setReason({ ...reason, [a.id]: e.target.value })} style={{ flex: 1, minWidth: 160, padding: "7px 10px", border: "1px solid var(--line-strong)", borderRadius: 3, background: "var(--surface)", color: "var(--ink)" }} />
              <button className="btn danger" disabled={busy === a.id || !(reason[a.id] || "").trim()} onClick={() => act(a.id, "reject")}>반려 → 재작업</button>
            </div>
            {me.role !== "ceo" && a.approver_user_id && a.approver_user_id !== me.id && <div className="muted" style={{ marginTop: 6 }}>1차 승인자가 아닙니다 — 대표만 승인 가능</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
export function ImageCard({ im, onDone }: { im: Img; onDone: () => void }) {
  const [busy, setBusy] = useState(false); const [url, setUrl] = useState("");
  const upload = async (f: File) => { setBusy(true); const fd = new FormData(); fd.append("file", f); await fetch(`/api/images/${im.id}`, { method: "POST", body: fd }); setBusy(false); onDone(); };
  const byUrl = async () => { if (!url) return; setBusy(true); await fetch(`/api/images/${im.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image_url: url }) }); setBusy(false); onDone(); };
  return (
    <div className="imgreq">
      <b>{im.agent_name}</b> · {im.task_title} · {im.size}{im.style ? ` · ${im.style}` : ""}
      <pre>{im.prompt}</pre>
      <div className="row">
        <button className="btn sm" onClick={() => navigator.clipboard?.writeText(im.prompt)}>프롬프트 복사</button>
        <label className="btn sm" style={{ cursor: "pointer" }}>{busy ? "업로드 중…" : "결과 이미지 업로드"}<input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
        <input placeholder="또는 이미지 URL" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1, minWidth: 140, padding: "5px 8px", border: "1px solid var(--line-strong)", borderRadius: 3, background: "var(--surface)", color: "var(--ink)", fontSize: 12 }} /><button className="btn sm" onClick={byUrl} disabled={busy || !url}>붙이기</button>
        <button className="btn sm" onClick={async () => { await fetch(`/api/images/${im.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "skipped" }) }); onDone(); }}>건너뛰기</button>
      </div>
    </div>
  );
}
