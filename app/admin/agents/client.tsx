"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Agent, Look } from "@/lib/types";
import { TOOLS } from "@/lib/agent/tools";
import { CharacterMaker } from "@/components/character-maker";
import { SpriteView } from "@/components/sprite-view";
import { randomLook } from "@/lib/pixel/sprite";
const ZONES = [["design", "디자인 스튜디오"], ["growth", "그로스"], ["sales", "세일즈"], ["reception", "리셉션"]];
const DESKS: [number, number, string][] = [[4, 3, "대표실 프리 데스크"], [16, 9, "회의실 옆 프리 데스크"], [20, 5, "복도 끝"], [2, 4, "대표실 창가"], [8, 1, "디자인 D-1"], [12, 1, "디자인 D-2"], [8, 3, "디자인 D-3"], [12, 3, "디자인 D-4"], [18, 1, "세일즈 S-1"], [18, 3, "세일즈 S-2"], [8, 7, "그로스 G-1"], [12, 7, "그로스 G-2"], [8, 9, "그로스 G-3"], [12, 9, "그로스 G-4"], [10, 5, "리셉션"]];
const MODELS = [["claude-opus-5", "Claude Opus 5 — 컨셉·제안서·네이밍"], ["claude-sonnet-5", "Claude Sonnet 5 — 카피·리스트·브리프"], ["claude-haiku-4-5", "Claude Haiku 4.5 — 단순 정리"]];
type F = { name: string; role_title: string; zone: string; desk: string; persona: string; model: string; effort: string; tools: string[]; daily_cost_cap: number; approver_user_id: number | null; screen: string; look: Look };
const empty = (): F => ({ name: "", role_title: "", zone: "design", desk: "4,3", persona: "", model: "claude-sonnet-5", effort: "medium", tools: ["create_artifact", "post_message"], daily_cost_cap: 5, approver_user_id: null, screen: "doc", look: randomLook() });
export function AgentsAdmin({ agents, users }: { agents: Agent[]; users: { id: number; name: string }[] }) {
  const r = useRouter(); const [edit, setEdit] = useState<{ id: number | null; f: F } | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const openNew = () => setEdit({ id: null, f: empty() });
  const openEdit = (a: Agent) => setEdit({ id: a.id, f: { name: a.name, role_title: a.role_title, zone: a.zone, desk: `${a.desk_x},${a.desk_y}`, persona: a.persona, model: a.model, effort: a.effort, tools: JSON.parse(a.tools_json), daily_cost_cap: a.daily_cost_cap, approver_user_id: a.approver_user_id, screen: a.screen, look: JSON.parse(a.sprite_json) } });
  const save = async () => { if (!edit) return; setBusy(true); setErr(""); const [dx, dy] = edit.f.desk.split(",").map(Number); const body = { ...edit.f, desk_x: dx, desk_y: dy, sprite_json: JSON.stringify(edit.f.look) };
    const res = edit.id ? await fetch(`/api/agents/${edit.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) : await fetch("/api/agents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({})); setBusy(false); if (!res.ok) { setErr(j.error || "저장 실패"); return; } setEdit(null); r.refresh(); };
  const toggleActive = async (a: Agent) => { await fetch(`/api/agents/${a.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !a.active }) }); r.refresh(); };
  return (
    <div>
      <div className="topbar"><h1>AI 담당자</h1><span className="sub">코드 없이 추가·편집. 저장하면 다음 tick에 월드에 반영됩니다.</span><span className="sp" /><button className="btn primary" onClick={openNew}>+ AI 담당자 추가</button></div>
      <div className="grid g2">{agents.map((a) => (
        <div className="card" key={a.id} style={{ display: "flex", gap: 12, opacity: a.active ? 1 : 0.5 }}>
          <SpriteView look={JSON.parse(a.sprite_json)} scale={3} />
          <div style={{ flex: 1, minWidth: 0 }}><b>{a.name}</b> <span className="muted">{a.role_title} · {ZONES.find((z) => z[0] === a.zone)?.[1]}</span><div className="muted mono">{a.model} · {a.effort} · 일일 ${a.daily_cost_cap}</div><div className="muted" style={{ whiteSpace: "pre-wrap", maxHeight: 44, overflow: "hidden", marginTop: 4 }}>{a.persona}</div>
            <div className="row" style={{ marginTop: 8 }}><button className="btn sm" onClick={() => openEdit(a)}>편집</button><button className="btn sm" onClick={() => toggleActive(a)}>{a.active ? "비활성화(퇴사)" : "다시 활성화"}</button></div></div>
        </div>))}</div>
      {edit && (<div className="modal" onClick={() => setEdit(null)}><div className="box" style={{ maxWidth: 860 }} onClick={(e) => e.stopPropagation()}>
        <div className="topbar"><h1 style={{ fontSize: "1.1rem" }}>{edit.id ? "편집" : "새 AI 담당자"}</h1><span className="sp" /><button className="btn sm" onClick={() => setEdit(null)}>닫기</button></div>
        <div className="grid g2">
          <div className="field"><label>이름</label><input value={edit.f.name} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, name: e.target.value } })} /></div>
          <div className="field"><label>직무</label><input value={edit.f.role_title} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, role_title: e.target.value } })} placeholder="예: 영상 편집" /></div>
          <div className="field"><label>존</label><select value={edit.f.zone} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, zone: e.target.value } })}>{ZONES.map((z) => <option key={z[0]} value={z[0]}>{z[1]}</option>)}</select></div>
          <div className="field"><label>좌석</label><select value={edit.f.desk} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, desk: e.target.value } })}>{DESKS.map((d) => <option key={d.join()} value={`${d[0]},${d[1]}`}>{d[2]} ({d[0]},{d[1]})</option>)}</select></div>
          <div className="field"><label>모델</label><select value={edit.f.model} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, model: e.target.value } })}>{MODELS.map((m) => <option key={m[0]} value={m[0]}>{m[1]}</option>)}</select></div>
          <div className="field"><label>effort</label><select value={edit.f.effort} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, effort: e.target.value } })}><option>low</option><option>medium</option><option>high</option></select></div>
          <div className="field"><label>일일 비용 한도 (USD)</label><input type="number" value={edit.f.daily_cost_cap} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, daily_cost_cap: Number(e.target.value) } })} /></div>
          <div className="field"><label>1차 승인자</label><select value={edit.f.approver_user_id ?? ""} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, approver_user_id: e.target.value ? Number(e.target.value) : null } })}><option value="">대표</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="field"><label>모니터 화면</label><select value={edit.f.screen} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, screen: e.target.value } })}><option value="doc">문서</option><option value="design">색견본</option><option value="growth">그래프</option><option value="list">리스트</option><option value="grid">그리드</option></select></div>
        </div>
        <div className="field" style={{ marginTop: 10 }}><label>페르소나 — 무엇을 만들고 / 무엇을 만들면 안 되고 / 누구에게 승인받는가 (세 가지가 빠지면 저장되지 않음)</label><textarea value={edit.f.persona} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, persona: e.target.value } })} rows={4} placeholder="숏폼 영상 편집 계획서와 컷 리스트, 자막 초안을 만든다. 완성 영상 파일은 만들지 않는다. 모든 산출물은 김정기에게 승인받는다." /></div>
        <div className="lhead" style={{ marginTop: 12 }}>사용 가능 툴</div>
        <div className="row">{TOOLS.map((t) => <label key={t.id} className="btn sm" style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={edit.f.tools.includes(t.id)} onChange={(e) => setEdit({ ...edit, f: { ...edit.f, tools: e.target.checked ? [...edit.f.tools, t.id] : edit.f.tools.filter((x) => x !== t.id) } })} />{t.label}</label>)}</div>
        <div className="lhead" style={{ marginTop: 12 }}>외형</div>
        <CharacterMaker key={edit.id ?? "new"} initial={edit.f.look} name={edit.f.name || "이름"} onChange={(l) => setEdit((s) => (s ? { ...s, f: { ...s.f, look: l } } : s))} />
        {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}><button className="btn primary" disabled={busy} onClick={save}>{busy ? "저장 중…" : edit.id ? "저장" : "저장하고 출근시키기"}</button></div>
      </div></div>)}
    </div>
  );
}
