"use client";
import { useCallback, useEffect, useState } from "react";
type Summary = {
  today: number; todayLive: number; month: number; monthLive: number; creditsTotal: number; creditsRemaining: number; limit: { monthly_usd: number; alert_pct: number }; liveMode: boolean; outputsToday: number;
  daily: { day: string; cost: number; mode: string }[]; byAgent: { agent_id: number; name: string; role_title: string; calls: number; input_tokens: number; output_tokens: number; cost: number; live_cost: number; daily_cost_cap: number }[];
  byZone: { zone: string; cost: number }[]; byProject: { id: number; name: string; budget_usd: number; cost: number }[]; recent: { id: number; ts: string; agent_name: string; model: string; mode: string; input_tokens: number; cached_tokens: number; output_tokens: number; cost_usd: number }[];
  credits: { id: number; ts: string; amount_usd: number; receipt_ref: string; note: string }[]; alerts: { id: number; ts: string; level: string; body: string }[];
};
const ZONE_NAME: Record<string, string> = { design: "디자인", growth: "그로스", sales: "세일즈", reception: "PM" };
const ZONE_COLOR: Record<string, string> = { design: "var(--s1)", growth: "var(--s3)", sales: "var(--s2)", reception: "var(--s4)" };
export function BillingClient() {
  const [d, setD] = useState<Summary | null>(null); const [amt, setAmt] = useState(""); const [ref, setRef] = useState(""); const [lim, setLim] = useState(""); const [pct, setPct] = useState("");
  const load = useCallback(() => fetch("/api/billing").then((r) => r.json()).then((j: Summary) => { setD(j); setLim(String(j.limit.monthly_usd)); setPct(String(j.limit.alert_pct)); }), []);
  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id); }, [load]);
  if (!d) return <div className="muted">불러오는 중…</div>;
  const days = lastDays(30); const byDay = new Map<string, { live: number; mock: number }>(); for (const r of d.daily) { const e = byDay.get(r.day) || { live: 0, mock: 0 }; if (r.mode === "live") e.live += r.cost; else e.mock += r.cost; byDay.set(r.day, e); }
  const series = days.map((day) => ({ day, ...(byDay.get(day) || { live: 0, mock: 0 }) })); const max = Math.max(1, ...series.map((s) => s.live + s.mock));
  const pctUsed = d.limit.monthly_usd > 0 ? Math.min(100, (d.monthLive / d.limit.monthly_usd) * 100) : 0;
  const addCredit = async () => { if (!amt) return; await fetch("/api/billing/credits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount_usd: Number(amt), receipt_ref: ref }) }); setAmt(""); setRef(""); load(); };
  const saveLimit = async () => { await fetch("/api/billing/limits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ monthly_usd: Number(lim), alert_pct: Number(pct) }) }); load(); };
  return (
    <div>
      <div className="topbar"><h1>비용 · 크레딧</h1><span className="sub">{d.liveMode ? "live 모드 — 실제 API 호출 중" : "mock 모드 — 실제 호출 없음, 아래 비용은 시뮬레이션(정가 기준 추정)"}</span></div>
      {!d.liveMode && <div className="alertbar">크레딧 세팅 전입니다. API 키를 넣고 관리자 › 기능에서 「실제 API 호출」을 켜면 live로 전환됩니다. 그때까지 모든 수치는 <b>예상치</b>이며 크레딧을 차감하지 않습니다.</div>}
      <div className="tiles">
        <div className="tile"><div className="l">잔여 크레딧</div><div className="v">${d.creditsRemaining.toFixed(2)} <small>/ ${d.creditsTotal.toFixed(0)} 충전</small></div><div className="gauge"><i className={d.creditsRemaining < 20 ? "bad" : ""} style={{ width: `${d.creditsTotal ? Math.max(0, Math.min(100, d.creditsRemaining / d.creditsTotal * 100)) : 0}%` }} /></div><div className="sub">{d.creditsTotal === 0 ? "충전 기록 없음" : d.creditsRemaining < 20 ? "충전 필요" : "정상"}</div></div>
        <div className="tile"><div className="l">오늘</div><div className="v">${d.today.toFixed(2)}</div><div className="sub">산출물 {d.outputsToday}건{!d.liveMode && " · 시뮬레이션"}</div></div>
        <div className="tile"><div className="l">이번 달</div><div className="v">${d.month.toFixed(2)} <small>/ 한도 ${d.limit.monthly_usd}</small></div><div className="gauge"><i className={pctUsed >= 100 ? "bad" : pctUsed >= d.limit.alert_pct ? "warn" : ""} style={{ width: `${pctUsed}%` }} /></div><div className="sub">실비 ${d.monthLive.toFixed(2)} · {d.limit.alert_pct}%에서 알림</div></div>
        <div className="tile"><div className="l">산출물 1건당</div><div className="v">${d.outputsToday ? (d.today / d.outputsToday).toFixed(2) : "0.00"}</div><div className="sub">오늘 평균</div></div>
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <div className="card chart"><b>일별 비용 — 최근 30일</b><div className="muted" style={{ marginBottom: 6 }}>실비(진한색)와 시뮬레이션(연한색)</div>
          <svg viewBox="0 0 560 170" role="img" aria-label="최근 30일 일별 비용 막대 차트">
            {[0, 0.5, 1].map((f) => <g key={f}><line x1={34} x2={552} y1={10 + 138 * (1 - f)} y2={10 + 138 * (1 - f)} className="grid" /><text x={28} y={13 + 138 * (1 - f)} textAnchor="end" className="ax">${(max * f).toFixed(1)}</text></g>)}
            {series.map((s, i) => { const iw = 518 / 30, x = 34 + i * iw + 1, hL = 138 * (s.live / max), hM = 138 * (s.mock / max); return <g key={s.day}><title>{s.day} · 실비 ${s.live.toFixed(2)} · 시뮬 ${s.mock.toFixed(2)}</title><rect x={x} y={148 - hL - hM} width={Math.max(2, iw - 2)} height={hM} rx={2} fill="var(--s1)" opacity={0.35} /><rect x={x} y={148 - hL} width={Math.max(2, iw - 2)} height={hL} rx={2} fill="var(--s1)" /></g>; })}
            {[0, 9, 19, 29].map((i) => <text key={i} x={34 + i * (518 / 30) + 8} y={164} textAnchor="middle" className="ax">{i === 29 ? "오늘" : `${30 - i}일 전`}</text>)}
          </svg></div>
        <div className="card chart"><b>이번 달 존별</b><div className="muted" style={{ marginBottom: 6 }}>이미지 생성은 젠스파크 핸드오프 — API 비용 0</div>
          <svg viewBox="0 0 360 130" role="img" aria-label="존별 비용 막대">
            {["design", "growth", "sales", "reception"].map((z, i) => { const v = d.byZone.find((x) => x.zone === z)?.cost || 0; const mx = Math.max(1, ...d.byZone.map((x) => x.cost)); const w = (360 - 78 - 70) * (v / mx); return <g key={z}><text x={70} y={22 + i * 26} textAnchor="end" className="lbl">{ZONE_NAME[z]}</text><rect x={78} y={11 + i * 26} width={Math.max(v > 0 ? 4 : 2, w)} height={14} rx={2} fill={v > 0 ? ZONE_COLOR[z] : "var(--line-strong)"} /><text x={78 + w + 8} y={22 + i * 26} className="lbl b">${v.toFixed(2)}</text></g>; })}
            <text x={70} y={126} textAnchor="end" className="lbl">이미지</text><rect x={78} y={115} width={2} height={14} fill="var(--line-strong)" /><text x={88} y={126} className="lbl b">$0.00</text>
          </svg></div>
      </div>
      <div className="scroll" style={{ marginTop: 14 }}>
        <table><thead><tr><th>담당자</th><th className="num">오늘 호출</th><th className="num">입력 토큰</th><th className="num">출력 토큰</th><th className="num">오늘 비용</th><th className="num">실비</th><th className="num">일일 한도</th></tr></thead>
          <tbody>{d.byAgent.map((a) => <tr key={a.agent_id} className={a.calls === 0 ? "zero" : ""}><td>{a.name} <span className="muted">{a.role_title}</span></td><td className="num">{a.calls}</td><td className="num">{a.input_tokens.toLocaleString()}</td><td className="num">{a.output_tokens.toLocaleString()}</td><td className="num">${a.cost.toFixed(2)}</td><td className="num">${a.live_cost.toFixed(2)}</td><td className="num">${a.daily_cost_cap}</td></tr>)}</tbody></table>
      </div>
      <p className="muted" style={{ marginTop: 6 }}>부재·대기 AI는 항상 0회 · $0.00 — 이 행이 0이 아니면 버그로 간주합니다.</p>
      <div className="grid g3" style={{ marginTop: 14 }}>
        <div className="card"><div className="lhead">크레딧 충전 기록</div><div className="row"><input placeholder="금액 USD" value={amt} onChange={(e) => setAmt(e.target.value)} type="number" style={inp} /><input placeholder="영수증 번호" value={ref} onChange={(e) => setRef(e.target.value)} style={inp} /><button className="btn sm primary" onClick={addCredit} disabled={!amt}>기록</button></div>
          <ul className="muted" style={{ paddingLeft: 16, marginTop: 8 }}>{d.credits.map((c) => <li key={c.id}>{c.ts.slice(0, 10)} ${c.amount_usd} {c.receipt_ref && <span className="mono">{c.receipt_ref}</span>}</li>)}{!d.credits.length && <li>Console에서 충전한 금액을 여기에 기록하면 잔여 크레딧이 계산됩니다.</li>}</ul></div>
        <div className="card"><div className="lhead">월 지출 한도</div><div className="row"><input value={lim} onChange={(e) => setLim(e.target.value)} type="number" style={inp} aria-label="월 한도 USD" /><input value={pct} onChange={(e) => setPct(e.target.value)} type="number" style={inp} aria-label="알림 퍼센트" /><button className="btn sm primary" onClick={saveLimit}>저장</button></div><p className="muted" style={{ marginTop: 8 }}>{pct}%에서 알림, 100%에서 AI 전원 대기 전환. 프로젝트 예산은 프로젝트 화면에서.</p>
          <div className="lhead" style={{ marginTop: 10 }}>프로젝트 예산</div>{d.byProject.map((p) => <div key={p.id} className="row" style={{ justifyContent: "space-between", fontSize: 12.5 }}><span>{p.name}</span><span className="mono">${p.cost.toFixed(2)} / ${p.budget_usd}</span></div>)}</div>
        <div className="card"><div className="lhead">알림</div>{d.alerts.length === 0 && <div className="muted">없음</div>}{d.alerts.map((a) => <div key={a.id} className="muted" style={{ marginBottom: 4 }}><span className={`chip ${a.level === "critical" ? "bad" : a.level === "warn" ? "idle" : "away"}`}>{a.level}</span> {a.body} <span className="mono">{a.ts.slice(5, 16)}</span></div>)}</div>
      </div>
      <div className="scroll" style={{ marginTop: 14 }}>
        <table><thead><tr><th>시각</th><th>담당자</th><th>모델</th><th>모드</th><th className="num">입력</th><th className="num">캐시</th><th className="num">출력</th><th className="num">비용</th></tr></thead>
          <tbody>{d.recent.map((r) => <tr key={r.id}><td className="mono">{r.ts.slice(5, 16)}</td><td>{r.agent_name}</td><td className="mono">{r.model}</td><td><span className={`chip ${r.mode === "live" ? "work" : "idle"}`}>{r.mode}</span></td><td className="num">{r.input_tokens.toLocaleString()}</td><td className="num">{r.cached_tokens.toLocaleString()}</td><td className="num">{r.output_tokens.toLocaleString()}</td><td className="num">${r.cost_usd.toFixed(4)}</td></tr>)}{!d.recent.length && <tr><td colSpan={8} className="muted">아직 호출 기록이 없습니다.</td></tr>}</tbody></table>
      </div>
    </div>
  );
}
const inp: React.CSSProperties = { flex: 1, minWidth: 90, padding: "6px 9px", border: "1px solid var(--line-strong)", borderRadius: 3, background: "var(--surface)", color: "var(--ink)", fontSize: 13 };
function lastDays(n: number) { const out: string[] = []; const d = new Date(); for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`); } return out; }
