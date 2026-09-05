"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Me = { name: string; role: "ceo" | "staff" | "viewer"; onboarded: boolean } | null;
const NAV = [
  { href: "/office", label: "오피스", ic: "🏢", roles: ["ceo", "staff"] },
  { href: "/projects", label: "프로젝트", ic: "📁", roles: ["ceo", "staff"] },
  { href: "/tasks", label: "작업 보드", ic: "🗂️", roles: ["ceo", "staff"] },
  { href: "/approvals", label: "승인 큐", ic: "✅", roles: ["ceo", "staff"] },
  { href: "/gallery", label: "갤러리", ic: "🖼️", roles: ["ceo", "staff", "viewer"] },
  { href: "/billing", label: "비용 · 크레딧", ic: "💳", roles: ["ceo"] },
];
const ADMIN = [
  { href: "/admin/agents", label: "AI 담당자", ic: "🤖" },
  { href: "/admin/users", label: "직원 · 초대", ic: "👥" },
  { href: "/admin/features", label: "기능 · 편성표", ic: "⚙️" },
];
const TABS = [
  { href: "/office", label: "오피스", ic: "🏢" },
  { href: "/tasks", label: "작업", ic: "🗂️" },
  { href: "/approvals", label: "승인", ic: "✅" },
  { href: "/projects", label: "프로젝트", ic: "📁" },
  { href: "/more", label: "더보기", ic: "☰" },
];

export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const bare = !me || path.startsWith("/login") || path.startsWith("/onboarding") || path.startsWith("/view");
  if (bare) return <>{children}</>;
  const on = (h: string) => path === h || path.startsWith(h + "/");
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); };
  return (
    <div className="shell">
      <nav className="nav" aria-label="주 메뉴">
        <div className="brand">DANA OFFICE</div>
        {NAV.filter((n) => n.roles.includes(me.role)).map((n) => <Link key={n.href} href={n.href} className={on(n.href) ? "on" : ""}><span className="ic">{n.ic}</span>{n.label}</Link>)}
        {me.role === "ceo" && <><div className="grp">관리자</div>{ADMIN.map((n) => <Link key={n.href} href={n.href} className={on(n.href) ? "on" : ""}><span className="ic">{n.ic}</span>{n.label}</Link>)}</>}
        <div className="me"><div style={{ flex: 1 }}><b>{me.name}</b><div className="muted">{me.role === "ceo" ? "대표이사" : me.role === "staff" ? "직원" : "관람"}</div></div><button className="btn sm" onClick={logout}>로그아웃</button></div>
      </nav>
      <main className="main">{children}</main>
      <nav className="tabs" aria-label="모바일 메뉴">
        {TABS.map((t) => <Link key={t.href} href={t.href} className={on(t.href) ? "on" : ""}><span className="ic">{t.ic}</span>{t.label}</Link>)}
      </nav>
    </div>
  );
}
