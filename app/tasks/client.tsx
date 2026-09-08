"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TaskRow } from "@/lib/queries";
type A = { id: number; name: string; role: string }; type P = { id: number; name: string };
/** 열 순서: 내가 봐야 할 것(검토) → 돌아가는 것(진행) → 끝난 것(완료). 드롭하면 해당 상태로 바뀐다 */
const COLS: { key: string; title: string; sub: string; sts: string[]; drop: string }[] = [
  { key: "review", title: "검토", sub: "산출물 승인 대기", sts: ["review"], drop: "review" },
  { key: "doing", title: "진행", sub: "큐 · 작업 중 · 보류", sts: ["queued", "doing", "blocked"], drop: "queued" },
  { key: "done", title: "완료", sub: "승인 · 반려", sts: ["approved", "rejected"], drop: "approved" },
];
export function TasksClient({ tasks, projects, agents }: { tasks: TaskRow[]; projects: P[]; agents: A[] }) {
  const r = useRouter(); const [open, setOpen] = useState(false); const [drag, setDrag] = useState<number | null>(null); const [over, setOver] = useState<string | null>(null); const [mcol, setMcol] = useState("review"); const [f, setF] = useState({ projectId: projects[0]?.id || 0, title: "", brief: "", agentId: agents[0]?.id || 0, priority: 2 }); const [busy, setBusy] = useState(false);
  const create = async () => { setBusy(true); await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }); setBusy(false); setOpen(false); r.refresh(); };
  const patch = async (id: number, body: Record<string, unknown>) => { await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); r.refresh(); };
  return (
    <div>
      <div className="topbar"><h1>작업 보드</h1><span className="sub">카드를 끌어 옮기면 상태가 바뀝니다. 진행으로 놓으면 다시 큐에 들어가고, 완료로 놓으면 승인됩니다.</span><span className="sp" /><button className="btn primary" onClick={() => setOpen(true)} disabled={!projects.length}>+ 작업</button></div>
      <div className="segpill" role="tablist" aria-label="열 선택">{COLS.map((c) => <button key={c.key} role="tab" aria-selected={mcol === c.key} className={mcol === c.key ? "on" : ""} onClick={() => setMcol(c.key)}>{c.title} <b style={{ opacity: .6, marginLeft: 4 }}>{tasks.filter((t) => c.sts.includes(t.status)).length}</b></button>)}</div>
      <div className="kanban">
        {COLS.map((c) => { const items = tasks.filter((t) => c.sts.includes(t.status)); return (
          <div className={`col ${over === c.key ? "over" : ""} ${mcol !== c.key ? "hide-m" : ""}`} key={c.key}
            onDragOver={(e) => { e.preventDefault(); if (over !== c.key) setOver(c.key); }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = Number(e.dataTransfer.getData("text/task") || drag); setDrag(null); const t = tasks.find((x) => x.id === id); if (!t || c.sts.includes(t.status)) return; if (c.drop === "review" && !t.artifact_id) { alert("산출물이 없는 작업은 검토로 옮길 수 없습니다. 진행에서 담당자가 산출물을 만들면 자동으로 올라옵니다."); return; } patch(id, { status: c.drop }); }}>
            <h4><span>{c.title} <small style={{ fontWeight: 500, letterSpacing: 0, textTransform: "none", marginLeft: 6 }}>{c.sub}</small></span><span>{items.length}</span></h4>
            {items.map((t) => (
              <div className={`tcard ${drag === t.id ? "dragging" : ""}`} key={t.id} draggable onDragStart={(e) => { setDrag(t.id); e.dataTransfer.setData("text/task", String(t.id)); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDrag(null); setOver(null); }}>
                <b>{t.title}</b>
                <div className="m"><span>{t.project_name}</span><span>{t.agent_name || "미배정"}</span><span className={`chip ${t.status === "blocked" ? "bad" : t.status === "review" ? "idle" : t.status === "doing" ? "work" : "away"}`}>{label(t.status)}</span>{t.cost_usd > 0 && <span className="mono">${t.cost_usd.toFixed(3)}</span>}</div>
                {t.brief && <div className="muted" style={{ marginTop: 4, whiteSpace: "pre-wrap", maxHeight: 60, overflow: "hidden" }}>{t.brief}</div>}
                <div className="row" style={{ marginTop: 6 }}>
                  {t.status === "review" && t.artifact_id && <Link className="btn sm primary" href={`/artifacts/${t.artifact_id}`}>검토</Link>}
                  {t.status === "approved" && t.artifact_id && <Link className="btn sm" href={`/artifacts/${t.artifact_id}`}>보기</Link>}
                  {(t.status === "blocked" || t.status === "rejected") && <button className="btn sm" onClick={() => patch(t.id, { status: "queued" })}>다시 큐로</button>}
                  {t.status === "queued" && <select className="btn sm" value={t.assignee_agent_id || ""} onChange={(e) => patch(t.id, { agentId: e.target.value ? Number(e.target.value) : null })}><option value="">담당 지정…</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
                  <select className="tmove" value="" aria-label="다른 열로 이동" onChange={(e) => { const to = e.target.value; if (!to) return; if (to === "review" && !t.artifact_id) { alert("산출물이 없는 작업은 검토로 옮길 수 없습니다."); return; } patch(t.id, { status: to }); }}>
                    <option value="">이동…</option>{COLS.filter((c) => !c.sts.includes(t.status)).map((c) => <option key={c.key} value={c.drop}>{c.title}으로</option>)}
                  </select>
                  {["queued", "blocked", "rejected", "approved"].includes(t.status) && <button className="btn sm danger" onClick={() => { if (confirm("삭제할까요?")) fetch(`/api/tasks/${t.id}`, { method: "DELETE" }).then(() => r.refresh()); }}>삭제</button>}
                </div>
              </div>))}
          </div>); })}
      </div>
      {open && (<div className="modal" onClick={() => setOpen(false)}><div className="box" onClick={(e) => e.stopPropagation()}>
        <div className="topbar"><h1 style={{ fontSize: "1.1rem" }}>새 작업</h1><span className="sp" /><button className="btn sm" onClick={() => setOpen(false)}>닫기</button></div>
        <div className="grid g2">
          <div className="field"><label>프로젝트</label><select value={f.projectId} onChange={(e) => setF({ ...f, projectId: Number(e.target.value) })}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="field"><label>담당 AI</label><select value={f.agentId} onChange={(e) => setF({ ...f, agentId: Number(e.target.value) })}>{agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.role}</option>)}</select></div>
        </div>
        <div className="field" style={{ marginTop: 10 }}><label>제목</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="field" style={{ marginTop: 10 }}><label>브리프</label><textarea value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })} /></div>
        <div className="field" style={{ marginTop: 10, maxWidth: 160 }}><label>우선순위 (1 높음)</label><select value={f.priority} onChange={(e) => setF({ ...f, priority: Number(e.target.value) })}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></div>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}><button className="btn primary" disabled={busy || !f.title} onClick={create}>{busy ? "…" : "배정"}</button></div>
      </div></div>)}
    </div>
  );
}
function label(s: string) { return ({ queued: "큐", doing: "진행", review: "검토", approved: "승인", rejected: "반려", blocked: "보류" } as Record<string, string>)[s] || s; }
