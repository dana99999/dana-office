import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
export default async function More() {
  const s = await getSession();
  const items = [["/gallery", "🖼️ 갤러리"], ...(s?.role === "ceo" ? [["/billing", "💳 비용 · 크레딧"], ["/admin/agents", "🤖 AI 담당자"], ["/admin/users", "👥 직원 · 초대"], ["/admin/features", "⚙️ 기능 · 편성표"]] : []), ["/onboarding", "🧑‍🎨 내 캐릭터 바꾸기"]];
  return (<div><div className="topbar"><h1>더보기</h1><span className="sub">{s?.name}</span></div>
    <div className="grid">{items.map(([h, l]) => <Link key={h} href={h} className="card" style={{ display: "block" }}>{l}</Link>)}<div className="card"><LogoutButton /></div></div></div>);
}
