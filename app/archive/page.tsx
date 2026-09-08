import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listDirectives } from "@/lib/world/directive";
export const dynamic = "force-dynamic";
const ST: Record<string, [string, string]> = { open: ["idle", "진행 중"], summarizing: ["move", "PM 종합 중"], archived: ["work", "아카이브 완료"] };
const TS: Record<string, string> = { queued: "대기", doing: "작업 중", review: "검토 대기", approved: "승인", rejected: "반려", blocked: "보류" };
export default async function Archive() {
  const s = await getSession(); if (!s) redirect("/login");
  const items = listDirectives();
  const bySrc = items.filter((d) => d.source !== "office").length;
  return (<div style={{ maxWidth: 920 }}><div className="topbar"><h1>아카이브</h1><span className="sub">전체 지시 {items.length}건{bySrc ? ` · 외부 기록 ${bySrc}건` : ""} · 담당자 산출물을 PM이 종합해 보관</span></div>
    {items.length === 0 && <div className="card muted">아직 전체 지시가 없습니다. 오피스 채팅에서 담당자를 부르지 않고 업무를 말하면(예: 「@전체 신제품 런칭 캠페인 준비해줘」) 관련 담당자들이 역할을 나눠 시작하고, 끝나면 PM 무결이 여기에 종합 정리를 남깁니다.</div>}
    <div className="grid">{items.map((d) => { const st = ST[d.status] || ST.open; return (
      <div className="card" key={d.id}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}><div><b style={{ fontSize: 15 }}>#{d.id} {d.body}</b><div className="muted">{d.requester_name} · {d.project_name} · {d.created_at.slice(0, 16)}</div></div><span className="row" style={{ gap: 6 }}>{d.source !== "office" && <span className="chip move">{d.source}</span>}<span className={`chip ${st[0]}`}>{st[1]}</span></span></div>
        {d.members.length > 0 && <><div className="lhead">참여 담당자</div>
        <div className="row" style={{ gap: 6, marginBottom: 10 }}>{d.members.map((m) => <span key={m.task_id} className="chip away" style={{ gap: 6 }}>{m.agent_name} · {TS[m.status] || m.status}{m.artifact_id && <Link href={`/artifacts/${m.artifact_id}`} style={{ fontWeight: 800 }}>산출물</Link>}</span>)}</div></>}
        {d.summary_artifact_id ? <Link href={`/artifacts/${d.summary_artifact_id}`} className="btn sm primary">{d.members.length ? "종합 정리 보기" : "아카이브 문서 보기"}{d.summary_title ? ` — ${d.summary_title}` : ""}</Link> : <span className="muted">종합 정리는 담당자 산출물이 모두 들어온 뒤 PM이 작성합니다.</span>}
      </div>); })}</div></div>);
}
