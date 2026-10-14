import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dealViews, totalsOf } from "@/lib/ledger";
import { DEAL_STATUS, KIND, isLate, kindLabel, man, md, today, won, type DealStatus, type DealView, type Entry } from "@/lib/ledger-meta";
import { NewDeal } from "./client";
export const dynamic = "force-dynamic";

type Row = { e: Entry; d: DealView };
const byDue = (a: Row, b: Row) => (a.e.due_date || "9999").localeCompare(b.e.due_date || "9999");

function PlanCard({ title, rows, tone, td, empty }: { title: string; rows: Row[]; tone: string; td: string; empty: string }) {
  const total = rows.reduce((s, r) => s + r.e.amount, 0);
  return <div className="card plan-card">
    <div className="pc-h"><div className="lhead" style={{ margin: 0 }}>{title} <b>{rows.length}</b></div><b className={`mono ${tone}`}>{won(total)}</b></div>
    {rows.length === 0 ? <div className="muted" style={{ padding: "4px 18px 14px" }}>{empty}</div> :
    <table><tbody>{rows.map(({ e, d }) => <tr key={e.id}>
      <td><b>{e.party || d.client || "상대 미지정"}</b><span className="sub">{e.title || kindLabel(e)}</span><Link href={`/ledger/${d.id}`} className="sub dl">{d.client && d.client !== e.party ? `${d.client} · ` : ""}{d.name}</Link></td>
      <td className="num">{won(e.amount)}<span className="sub">{isLate(e, td) ? <span className="chip bad">기한 지남 {md(e.due_date)}</span> : e.due_date ? `${md(e.due_date)}까지` : "기한 미정"}</span></td>
    </tr>)}</tbody></table>}
  </div>;
}

export default async function Ledger({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const s = await getSession(); if (!s) redirect("/login"); if (s.role !== "ceo") redirect("/office");
  const { status } = await searchParams; const td = today();
  const all = dealViews(); const t = totalsOf(all);
  const plans: Row[] = all.flatMap((d) => d.entries.filter((e) => e.status === "plan").map((e) => ({ e, d })));
  const ins = plans.filter((r) => r.e.kind === "in").sort(byDue), outs = plans.filter((r) => r.e.kind === "out").sort(byDue);
  const invs = plans.filter((r) => r.e.kind === "inv_out" || r.e.kind === "inv_in").sort(byDue);
  const counts = new Map<string, number>(); for (const d of all) counts.set(d.status, (counts.get(d.status) || 0) + 1);
  const open = (d: DealView) => d.status !== "settled" && d.status !== "lost";
  const deals = status === "all" ? all : status ? all.filter((d) => d.status === status) : all.filter(open);
  const lateIn = ins.filter((r) => isLate(r.e, td));
  return (<div style={{ maxWidth: 1100 }}>
    <div className="topbar"><h1>정산 · 계약</h1><span className="sub">프로젝트별 계약 · 입금 · 지급 · 세금계산서. 대화에서 말하면 클로드가 여기에 기록합니다.</span><span className="sp" /><NewDeal /></div>
    <div className="tiles" style={{ marginBottom: 14 }}>
      <div className="tile"><div className="l">받을 돈</div><div className="v money-in"><span className="money">{man(t.receivable)}<em>{won(t.receivable)} · {t.inCount}건</em></span></div></div>
      <div className="tile"><div className="l">줄 돈</div><div className="v money-out"><span className="money">{man(t.payable)}<em>{won(t.payable)} · {t.outCount}건</em></span></div></div>
      <div className="tile"><div className="l">차액</div><div className="v"><span className="money">{man(t.net)}<em>{won(t.net)}</em></span></div></div>
      <div className="tile"><div className="l">부가세 빼고 남는 돈</div><div className="v"><span className="money">≈ {man(t.netExVat)}<em>받을 돈 속 부가세 {won(t.receivableVat)} 제외</em></span></div></div>
    </div>
    {lateIn.length > 0 && <div className="alertbar">기한 지난 받을 돈 {lateIn.length}건 · {won(lateIn.reduce((x, r) => x + r.e.amount, 0))} — {lateIn.map((r) => r.e.party || r.d.client).join(", ")}</div>}
    <div className="grid g2" style={{ marginBottom: 14, alignItems: "start" }}>
      <PlanCard title="받을 돈" rows={ins} tone="money-in" td={td} empty="받을 돈이 없습니다." />
      <PlanCard title="줄 돈" rows={outs} tone="money-out" td={td} empty="줄 돈이 없습니다." />
    </div>
    {invs.length > 0 && <div className="card plan-card" style={{ marginBottom: 18 }}>
      <div className="pc-h"><div className="lhead" style={{ margin: 0 }}>세금계산서 할 일 <b>{invs.length}</b></div></div>
      <table><tbody>{invs.map(({ e, d }) => <tr key={e.id}>
        <td style={{ width: 1 }}><span className={`chip ${KIND[e.kind].chip}`}>{e.kind === "inv_out" ? "발행" : "받기"}</span></td>
        <td><b>{e.party || d.client}</b><span className="sub">{e.title}</span><Link href={`/ledger/${d.id}`} className="sub dl">{d.name}</Link></td>
        <td className="num">{won(e.amount)}<span className="sub">{isLate(e, td) ? <span className="chip bad">기한 지남 {md(e.due_date)}</span> : e.due_date ? `${md(e.due_date)}까지` : ""}</span></td>
      </tr>)}</tbody></table>
    </div>}
    <div className="row filters" style={{ marginBottom: 12 }}>
      <Link href="/ledger" className={`chip filter ${!status ? "on" : ""}`}>정산 전 <b>{all.filter(open).length}</b></Link>
      {(Object.keys(DEAL_STATUS) as DealStatus[]).filter((k) => counts.get(k)).map((k) => <Link key={k} href={`/ledger?status=${k}`} className={`chip filter ${status === k ? "on" : ""}`}>{DEAL_STATUS[k][0]} <b>{counts.get(k)}</b></Link>)}
      <Link href="/ledger?status=all" className={`chip filter ${status === "all" ? "on" : ""}`}>전체 <b>{all.length}</b></Link>
    </div>
    {deals.length === 0 && <div className="card muted">{all.length === 0 ? "아직 기록된 프로젝트가 없습니다. 클로드 코드에게 「예맛 잔금 들어왔어」, 「OO랑 계약서 썼어」처럼 말하면 프로젝트별로 여기에 쌓입니다." : "이 상태의 프로젝트가 없습니다."}</div>}
    <div className="grid g2">{deals.map((d) => { const due = d.sum.received + d.sum.receivable; const n = d.sum.next; return (
      <Link href={`/ledger/${d.id}`} className="card deal" key={d.id}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}><b style={{ fontSize: 15 }}>{d.name}</b><div className="muted">{d.client || "광고주 미지정"}{d.due_date ? ` · 마감 ${md(d.due_date)}` : ""}</div></div>
          <span className="row" style={{ gap: 6, flex: "none" }}>{d.sum.overdue > 0 && <span className="chip bad">기한 지남 {d.sum.overdue}</span>}<span className={`chip ${DEAL_STATUS[d.status][1]}`}>{DEAL_STATUS[d.status][0]}</span></span>
        </div>
        <div className="kv">
          <div><span>{d.sum.contract || !d.sum.quote ? "계약" : "견적"}</span><b>{d.sum.contract || d.sum.quote ? man(d.sum.contract || d.sum.quote) : "—"}</b></div>
          <div><span>받은 돈</span><b>{d.sum.received ? man(d.sum.received) : "—"}</b></div>
          <div><span>받을 돈</span><b className="money-in">{d.sum.receivable ? man(d.sum.receivable) : "—"}</b></div>
          <div><span>줄 돈</span><b className="money-out">{d.sum.payable ? man(d.sum.payable) : "—"}</b></div>
        </div>
        {due > 0 && <div className="gauge" title={`받을 돈 중 ${Math.round((d.sum.received / due) * 100)}% 입금`}><i style={{ width: `${Math.round((d.sum.received / due) * 100)}%` }} /></div>}
        {n && <div className="next">다음 · {kindLabel(n)} {n.party ? `${n.party} ` : ""}{n.amount ? won(n.amount) : n.title}{n.due_date ? ` · ${md(n.due_date)}까지` : ""}</div>}
      </Link>); })}</div>
  </div>);
}
