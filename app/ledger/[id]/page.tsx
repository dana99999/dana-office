import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { dealView, listDeals } from "@/lib/ledger";
import { DEAL_STATUS, KIND, isLate, kindLabel, man, md, today, won } from "@/lib/ledger-meta";
import { DealControls, EntryActions, EntryButton } from "../client";
export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s) redirect("/login"); if (s.role !== "ceo") redirect("/office");
  const { id } = await params; const v = dealView(Number(id)); if (!v) notFound();
  const deals = listDeals().map((d) => ({ id: d.id, label: `${d.client ? `${d.client} · ` : ""}${d.name}` }));
  const td = today(); const m = v.sum;
  const left = m.received + m.receivable - m.paid - m.payable;
  const tile = (l: string, n: number, tone = "", sub?: string) => <div className="tile"><div className="l">{l}</div><div className={`v ${tone}`}><span className="money">{n ? man(n) : "—"}<em>{sub ?? (n ? won(n) : " ")}</em></span></div></div>;
  return (<div style={{ maxWidth: 1040 }}>
    <Link href="/ledger" className="muted">← 정산 · 계약</Link>
    <div className="topbar" style={{ marginTop: 6 }}>
      <h1>{v.name}</h1><span className="sub">{v.client || "광고주 미지정"}{v.due_date ? ` · 마감 ${md(v.due_date)}` : ""}</span><span className={`chip ${DEAL_STATUS[v.status][1]}`}>{DEAL_STATUS[v.status][0]}</span>
      <span className="sp" /><DealControls deal={v} /><EntryButton dealId={v.id} deals={deals} label="+ 기록 추가" primary />
    </div>
    <div className="tiles t6" style={{ marginBottom: 14 }}>
      {tile(m.contract || !m.quote ? "계약" : "견적", m.contract || m.quote)}
      {tile("받은 돈", m.received, "money-in")}
      {tile("받을 돈", m.receivable, "money-in")}
      {tile("준 돈", m.paid, "money-out")}
      {tile("줄 돈", m.payable, "money-out")}
      {tile("남는 돈 (예상)", left, "", left ? `${won(left)} · 부가세 포함` : " ")}
    </div>
    {(m.invOutPlan > 0 || m.invInPlan > 0) && <div className="alertbar">세금계산서 할 일 — {[m.invOutPlan ? `발행 ${won(m.invOutPlan)}` : "", m.invInPlan ? `받기 ${won(m.invInPlan)}` : ""].filter(Boolean).join(" · ")}</div>}
    {(v.memo || v.folder) && <div className="card" style={{ marginBottom: 14 }}>
      {v.memo && <><div className="lhead">메모</div><div style={{ whiteSpace: "pre-wrap", fontSize: 13.5 }}>{v.memo}</div></>}
      {v.folder && <div className="muted mono" style={{ marginTop: v.memo ? 10 : 0 }}>{v.folder}</div>}
    </div>}
    {v.entries.length === 0 ? <div className="card muted">아직 기록이 없습니다. 「+ 기록 추가」로 계약·견적·입금·지급·계산서를 남기세요.</div> :
    <div className="scroll"><table className="ltable"><thead><tr><th>날짜</th><th>구분</th><th>내용</th><th className="num">금액</th><th /></tr></thead><tbody>
      {v.entries.map((e) => <tr key={e.id} className={e.status}>
        <td className="mono" style={{ whiteSpace: "nowrap" }}>{e.status === "plan" ? (e.due_date ? `${md(e.due_date)}까지` : e.date ? md(e.date) : "미정") : md(e.date)}</td>
        <td style={{ whiteSpace: "nowrap" }}><span className={`chip ${KIND[e.kind].chip}`}>{kindLabel(e)}</span>{isLate(e, td) && <span className="chip bad" style={{ marginLeft: 4 }}>기한 지남</span>}{e.status === "cancel" && <span className="chip away" style={{ marginLeft: 4 }}>취소</span>}</td>
        <td><b>{e.title || KIND[e.kind].label}</b>{e.party && <span className="sub">{e.party}</span>}{e.memo && <span className="sub memo">{e.memo}</span>}{e.source !== "manual" && <span className="sub src">{e.source} 기록</span>}</td>
        <td className="num">{e.amount ? won(e.amount) : "—"}{e.vat ? <span className="sub">부가세 {won(e.vat)}</span> : null}</td>
        <td><EntryActions entry={e} deals={deals} /></td>
      </tr>)}
    </tbody></table></div>}
  </div>);
}
