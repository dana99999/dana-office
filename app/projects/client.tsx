"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectType } from "@/lib/types";
type P = Project & { team: number[]; tasks: { status: string; c: number }[] };
type A = { id: number; name: string; role: string; slug: string };
export function ProjectsClient({ projects, types, agents }: { projects: P[]; types: ProjectType[]; agents: A[] }) {
  const r = useRouter(); const [open, setOpen] = useState(false); const [f, setF] = useState({ client: "", name: "", type: types[0]?.name || "", brief: "", budget_usd: 50, ai_allowed: true }); const [team, setTeam] = useState<number[]>(defaultTeam(types[0]?.name)); const [busy, setBusy] = useState(false);
  function defaultTeam(t?: string) { const ty = types.find((x) => x.name === t); if (!ty) return []; const slugs: string[] = JSON.parse(ty.default_team_json); return agents.filter((a) => slugs.includes(a.slug)).map((a) => a.id); }
  const create = async () => { setBusy(true); await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, team }) }); setBusy(false); setOpen(false); r.refresh(); };
  const patch = async (id: number, body: Record<string, unknown>) => { await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); r.refresh(); };
  const cnt = (p: P, s: string) => p.tasks.find((t) => t.status === s)?.c || 0;
  return (
    <div>
      <div className="topbar"><h1>프로젝트</h1><span className="sub">프로젝트를 만들면 편성표대로 AI가 호출됩니다. 종료하면 자동 퇴근.</span><span className="sp" /><button className="btn primary" onClick={() => setOpen(true)}>+ 새 프로젝트</button></div>
      <div className="grid g2">
        {projects.map((p) => (
          <div className="card" key={p.id}>
            <div className="row" style={{ justifyContent: "space-between" }}><b>{p.name}</b><span className={`chip ${p.status === "active" ? "work" : "away"}`}>{p.status === "active" ? "진행" : p.status === "paused" ? "일시정지" : "종료"}</span></div>
            <div className="muted">{p.client} · {p.type} · 예산 ${p.budget_usd}{p.ai_allowed ? "" : " · AI 사용 금지"}</div>
            <p className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{p.brief}</p>
            <div className="row" style={{ margin: "8px 0" }}>{p.team.map((id) => { const a = agents.find((x) => x.id === id); return a ? <span key={id} className="chip work">{a.name}</span> : null; })}{p.team.length === 0 && <span className="muted">편성 없음</span>}</div>
            <div className="muted mono">큐 {cnt(p, "queued")} · 진행 {cnt(p, "doing")} · 검토 {cnt(p, "review")} · 승인 {cnt(p, "approved")}</div>
            <div className="row" style={{ marginTop: 10 }}>
              {p.status === "active" ? <><button className="btn sm" onClick={() => patch(p.id, { status: "paused" })}>일시정지</button><button className="btn sm danger" onClick={() => { if (confirm("종료하면 편성된 AI가 퇴근합니다. 종료할까요?")) patch(p.id, { status: "done" }); }}>종료</button></> : <button className="btn sm" onClick={() => patch(p.id, { status: "active" })}>재개</button>}
              <button className="btn sm" onClick={() => patch(p.id, { ai_allowed: !p.ai_allowed })}>{p.ai_allowed ? "AI 사용 금지로" : "AI 사용 허용으로"}</button>
              <TeamEditor p={p} agents={agents} onSave={(t) => patch(p.id, { team: t })} />
              {p.type !== "직접 지시" && <button className="btn sm ghost danger" onClick={async () => { if (!confirm(`프로젝트 「${p.name}」을(를) 삭제할까요? 작업·산출물이 함께 지워지고 아카이브 기록은 「직접 지시」로 옮겨집니다.`)) return; const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" }); if (!res.ok) alert((await res.json()).error || "삭제 실패"); r.refresh(); }}>삭제</button>}
            </div>
          </div>
        ))}
      </div>
      {open && (
        <div className="modal" onClick={() => setOpen(false)}><div className="box" onClick={(e) => e.stopPropagation()}>
          <div className="topbar"><h1 style={{ fontSize: "1.1rem" }}>새 프로젝트</h1><span className="sp" /><button className="btn sm" onClick={() => setOpen(false)}>닫기</button></div>
          <div className="grid g2">
            <div className="field"><label>클라이언트</label><input value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })} /></div>
            <div className="field"><label>프로젝트명</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="field"><label>유형 (기본 편성표)</label><select value={f.type} onChange={(e) => { setF({ ...f, type: e.target.value }); setTeam(defaultTeam(e.target.value)); }}>{types.map((t) => <option key={t.id}>{t.name}</option>)}</select></div>
            <div className="field"><label>예산 상한 (USD)</label><input type="number" value={f.budget_usd} onChange={(e) => setF({ ...f, budget_usd: Number(e.target.value) })} /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>브리프 — AI가 읽는 문장</label><textarea value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })} placeholder="타깃, 톤, 핵심 메시지, 하지 말 것" /></div>
          <label className="row" style={{ marginTop: 10, fontSize: 13 }}><input type="checkbox" checked={f.ai_allowed} onChange={(e) => setF({ ...f, ai_allowed: e.target.checked })} /> 클라이언트가 AI 사용을 허용함 (꺼지면 이 프로젝트 자료는 어떤 AI에게도 전달되지 않음)</label>
          <div className="lhead" style={{ marginTop: 12 }}>편성 — 호출될 AI</div>
          <div className="row">{agents.map((a) => <button key={a.id} type="button" className={`btn sm ${team.includes(a.id) ? "on" : ""}`} onClick={() => setTeam(team.includes(a.id) ? team.filter((x) => x !== a.id) : [...team, a.id])}>{a.name} · {a.role}</button>)}</div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}><button className="btn primary" disabled={busy || !f.name} onClick={create}>{busy ? "생성 중…" : `만들고 ${team.length}명 호출`}</button></div>
        </div></div>
      )}
    </div>
  );
}
function TeamEditor({ p, agents, onSave }: { p: P; agents: A[]; onSave: (t: number[]) => void }) {
  const [open, setOpen] = useState(false); const [t, setT] = useState<number[]>(p.team);
  if (!open) return <button className="btn sm" onClick={() => setOpen(true)}>편성 수정</button>;
  return <div style={{ width: "100%", marginTop: 6 }}><div className="row">{agents.map((a) => <button key={a.id} type="button" className={`btn sm ${t.includes(a.id) ? "on" : ""}`} onClick={() => setT(t.includes(a.id) ? t.filter((x) => x !== a.id) : [...t, a.id])}>{a.name}</button>)}</div><div className="row" style={{ marginTop: 6 }}><button className="btn sm primary" onClick={() => { onSave(t); setOpen(false); }}>저장</button><button className="btn sm" onClick={() => setOpen(false)}>취소</button></div></div>;
}
