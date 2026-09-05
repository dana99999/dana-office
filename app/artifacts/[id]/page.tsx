import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { listArtifacts } from "@/lib/queries";
import { mdToHtml } from "@/lib/md";
import { ArtifactActions } from "./actions";
export const dynamic = "force-dynamic";
export default async function ArtifactPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession(); if (!s) redirect("/login");
  const { id } = await params; const a = listArtifacts("ar.id = ?", Number(id))[0]; if (!a) notFound();
  return (
    <div style={{ maxWidth: 820 }}>
      <div className="topbar"><Link href="/approvals" className="btn sm">← 승인 큐</Link><h1 style={{ fontSize: "1.2rem" }}>{a.title}</h1><span className={`chip ${a.status === "approved" ? "work" : a.status === "rejected" ? "bad" : "idle"}`}>{a.status === "approved" ? "승인" : a.status === "rejected" ? "반려" : "검토 대기"}</span></div>
      <div className="muted" style={{ marginBottom: 12 }}>{a.agent_name} · {a.project_name} · 작업 「{a.task_title}」 · {a.kind} · {a.created_at}</div>
      {a.image_url && <img src={a.image_url} alt="" style={{ maxWidth: "100%", borderRadius: 4, border: "1px solid var(--line)", marginBottom: 12 }} />}
      {a.image_request_id && !a.image_url && <div className="imgreq">🖼️ 이미지 생성 요청이 젠스파크 핸드오프 대기 중입니다. 승인 큐 상단에서 프롬프트를 복사해 생성 후 업로드하세요.<pre>{a.image_prompt}</pre></div>}
      <div className="card md" dangerouslySetInnerHTML={{ __html: mdToHtml(a.body_md) }} />
      {a.reason && <div className="alertbar" style={{ marginTop: 12 }}>반려 사유: {a.reason}</div>}
      {a.status === "review" && s.role !== "viewer" && <ArtifactActions id={a.id} canApprove={s.role === "ceo" || a.approver_user_id === s.uid || !a.approver_user_id} />}
    </div>
  );
}
