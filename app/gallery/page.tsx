import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listArtifacts } from "@/lib/queries";
export const dynamic = "force-dynamic";
export default async function Gallery() {
  const s = await getSession(); if (!s) redirect("/login");
  const items = listArtifacts("ar.status = 'approved'");
  return (<div><div className="topbar"><h1>갤러리</h1><span className="sub">승인된 산출물 {items.length}건</span></div>
    {items.length === 0 && <div className="card muted">아직 승인된 산출물이 없습니다. 승인 큐에서 승인하면 여기에 걸립니다.</div>}
    <div className="gal">{items.map((a) => <Link href={`/artifacts/${a.id}`} className="it" key={a.id}>{a.image_url ? <img src={a.image_url} alt="" /> : <div className="ph">{a.kind.toUpperCase()}</div>}<div className="b"><b>{a.title}</b><div className="muted">{a.agent_name} · {a.project_name}</div></div></Link>)}</div></div>);
}
