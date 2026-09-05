"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TaskRow } from "@/lib/queries";
type A = { id: number; name: string; role: string }; type P = { id: number; name: string };
const COLS: [string, string[]][] = [["큐 · 대기", ["queued", "blocked"]], ["진행 중", ["doing"]], ["검토 대기", ["review"]], ["완료", ["approved", "rejected"]]];
export function TasksClient({ tasks, projects, agents }: { tasks: TaskRow[]; projects: P[]; agents: A[] }) {
  const r = useRouter(); const [open, setOpen] = useState(false); const [f, setF] = useState({ projectId: projects[0]?.id || 0, title: "", brief: "", agentId: agents[0]?.id || 0, priority: 2 }); const [busy, setBusy] = useState(false);
  const create = async () => { setBusy(true); await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }); setBusy(false); setOpen(false); r.refresh(); };
  const patch = async (id: number, body: Record<string, unknown>) => { await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); r.refresh(); };
  return (
    <div>
      <div className="topbar"><h1>작업 보드</h1><span className="sub">담당자를 지정하면 그 AI가 호출됩니다. 산출물은 검토 대기로 올라옵니다.</span><span className="sp" /><button className="btn primary" onClick={() => setOpen(true)} disabled={!projects.length}>+ 작업</button></div>
      <div className="kanban">
        {COLS.map(([title, sts]) => { const items = tasks.filter((t) => sts.includes(t.status)); return (
          <div className="col" key={title}><h4>{title}<span>{items.length}</span></h4>
            {items.map((t) => (
              <div className="tcard" key={t.id}>
                <b>{t.title}</b>
                <div className="m"><span>{t.project_name}</span><span>{t.agent_name || "미배정"}</span><span className={`chip ${t.status === "blocked" ? "bad" : t.status === "review" ? "idle" : t.status === "doing" ? "work" : "away"}`}>{label(t.status)}</span>{t.cost_usd > 0 && <span className="mono">${t.cost_usd.toFixed(3)}</span>}</div>
                {t.brief && <div className="muted" style={{ marginTop: 4, whiteSpace: "pre-wrap", maxHeight: 60, overflow: "hidden" }}>{t.brief}</div>}
                <div className="row" style={{ marginTop: 6 }}>
                  {t.status === "review" && t.artifact_id && <Link className="btn sm primary" href={`/artifacts/${t.artifact_id}`}>검토</Link>}
                  {t.status === "approved" && t.artifact_id && <Link className="btn sm" href={`/artifacts/${t.artifact_id}`}>보기</Link>}
                  {(t.status === "blocked" || t.status === "rejected") && <button className="btn sm" onClick={() => patch(t.id, { status: "queued" })}>다시 큐로</button>}
                  {t.status === "queued" && <select className="btn sm" value={t.assignee_agent_id || ""} onChange={(e) => patch(t.id, { agentId: e.target.value ? Number(e.target.value) : null })}><option value="">담당 지정…</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
                  {["queued", "blocked", "rejected"].includes(t.status) && <button className="btn sm danger" onClick={() => { if (confirm("삭제할까요?")) fetch(`/api/tasks/${t.id}`, { method: "DELETE" }).then(() => r.refresh()); }}>삭제</button>}
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
