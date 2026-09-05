"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Feature, ProjectType } from "@/lib/types";
export function FeaturesAdmin({ features, types, agents, env }: { features: Feature[]; types: ProjectType[]; agents: { slug: string; name: string }[]; env: { apiKey: boolean; genspark: boolean; seedscope: boolean } }) {
  const r = useRouter();
  const bible = (() => { try { return JSON.parse(features.find((f) => f.key === "brand_bible")?.config_json || "{}").text || ""; } catch { return ""; } })();
  const [text, setText] = useState<string>(bible); const [newType, setNewType] = useState(""); const [teams, setTeams] = useState<Record<number, string[]>>(Object.fromEntries(types.map((t) => [t.id, JSON.parse(t.default_team_json)])));
  const toggle = async (f: Feature) => { await fetch("/api/features", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: f.key, enabled: !f.enabled }) }); r.refresh(); };
  const saveBible = async () => { await fetch("/api/features", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: "brand_bible", config: { text } }) }); r.refresh(); };
  const saveType = async (t: ProjectType) => { await fetch("/api/project-types", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: t.id, name: t.name, team: teams[t.id] }) }); r.refresh(); };
  const addType = async () => { if (!newType) return; await fetch("/api/project-types", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: newType, team: ["mugyeol"] }) }); setNewType(""); r.refresh(); };
  const note: Record<string, string> = { live_llm: env.apiKey ? "API 키 감지됨 — 켜면 실제 과금이 시작됩니다" : "ANTHROPIC_API_KEY가 없어 켜도 mock으로 동작합니다", image_genspark: env.genspark ? "GENSPARK_API_URL 설정됨 — api 모드" : "핸드오프 모드: 사람이 젠스파크에서 생성 후 업로드", seedscope: env.seedscope ? "SEEDSCOPE_URL 설정됨" : "SEEDSCOPE_URL 미설정 — 툴이 비활성" };
  return (
    <div>
      <div className="topbar"><h1>기능 · 편성표</h1><span className="sub">배포 없이 켜고 끕니다. 위험한 기능은 꺼진 채로 시작.</span></div>
      <div className="grid g2">
        <div className="card"><div className="lhead">기능 플래그</div>{features.filter((f) => f.key !== "brand_bible").map((f) => <div key={f.key} className="row" style={{ justifyContent: "space-between", padding: "7px 0", borderBottom: "1px dashed var(--line)" }}><div><b>{f.label}</b><div className="muted">{note[f.key] || f.key}</div></div><button className={`btn sm ${f.enabled ? "on" : ""}`} onClick={() => toggle(f)}>{f.enabled ? "켜짐" : "꺼짐"}</button></div>)}</div>
        <div className="card"><div className="lhead">브랜드 바이블 — 모든 AI의 시스템 프롬프트에 들어갑니다</div><textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} style={{ width: "100%", padding: 10, border: "1px solid var(--line-strong)", borderRadius: 3, background: "var(--surface)", color: "var(--ink)" }} placeholder="톤, 금지어, 과거 작업 요약, 클라이언트 목록…" /><div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}><button className="btn primary" onClick={saveBible}>저장</button></div></div>
      </div>
      <div className="card" style={{ marginTop: 14 }}><div className="lhead">프로젝트 유형 → 기본 편성표</div>
        {types.map((t) => <div key={t.id} style={{ padding: "8px 0", borderBottom: "1px dashed var(--line)" }}><div className="row" style={{ justifyContent: "space-between" }}><b>{t.name}</b><div className="row"><button className="btn sm" onClick={() => saveType(t)}>저장</button><button className="btn sm danger" onClick={async () => { if (confirm("삭제?")) { await fetch("/api/project-types", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: t.id, delete: true }) }); r.refresh(); } }}>삭제</button></div></div>
          <div className="row" style={{ marginTop: 6 }}>{agents.map((a) => { const on = (teams[t.id] || []).includes(a.slug); return <button key={a.slug} className={`btn sm ${on ? "on" : ""}`} onClick={() => setTeams({ ...teams, [t.id]: on ? teams[t.id].filter((s) => s !== a.slug) : [...(teams[t.id] || []), a.slug] })}>{a.name}</button>; })}</div></div>)}
        <div className="row" style={{ marginTop: 10 }}><input placeholder="새 유형 이름" value={newType} onChange={(e) => setNewType(e.target.value)} style={{ flex: 1, minWidth: 160, padding: "8px 10px", border: "1px solid var(--line-strong)", borderRadius: 3, background: "var(--surface)", color: "var(--ink)" }} /><button className="btn" onClick={addType} disabled={!newType}>추가</button></div>
      </div>
    </div>
  );
}
