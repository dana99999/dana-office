import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { I } from "@/components/icons";
export default async function More() {
  const s = await getSession();
  const items: [string, string, keyof typeof I][] = [["/gallery", "갤러리", "image"], ["/projects", "프로젝트", "folder"], ...(s?.role === "ceo" ? ([["/billing", "비용 · 크레딧", "card"], ["/admin/agents", "AI 담당자", "bot"], ["/admin/users", "직원 · 초대", "users"], ["/admin/features", "기능 · 편성표", "sliders"]] as [string, string, keyof typeof I][]) : []), ["/onboarding", "내 캐릭터 바꾸기", "palette"]];
  return (<div><div className="topbar"><h1>더보기</h1><span className="sub">{s?.name}</span></div>
    <div className="grid">{items.map(([h, l, ic]) => { const C = I[ic] as (p: { size?: number }) => React.ReactNode; return <Link key={h} href={h} className="card row" style={{ gap: 12 }}><span className="ic-badge">{C({ size: 18 })}</span>{l}</Link>; })}<div className="card"><LogoutButton /></div></div></div>);
}
