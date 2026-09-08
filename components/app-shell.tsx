"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { I } from "./icons";

type Me = { name: string; role: "ceo" | "staff" | "viewer"; onboarded: boolean } | null;
type Ic = keyof typeof I;
const NAV: { href: string; label: string; ic: Ic; roles: string[] }[] = [
  { href: "/office", label: "오피스", ic: "office", roles: ["ceo", "staff"] },
  { href: "/projects", label: "프로젝트", ic: "folder", roles: ["ceo", "staff"] },
  { href: "/tasks", label: "작업 보드", ic: "board", roles: ["ceo", "staff"] },
  { href: "/approvals", label: "승인 큐", ic: "check", roles: ["ceo", "staff"] },
  { href: "/archive", label: "아카이브", ic: "archive", roles: ["ceo", "staff"] },
  { href: "/gallery", label: "갤러리", ic: "image", roles: ["ceo", "staff", "viewer"] },
  { href: "/billing", label: "비용 · 크레딧", ic: "card", roles: ["ceo"] },
];
const ADMIN: { href: string; label: string; ic: Ic }[] = [
  { href: "/admin/agents", label: "AI 담당자", ic: "bot" },
  { href: "/admin/users", label: "직원 · 초대", ic: "users" },
  { href: "/admin/features", label: "기능 · 편성표", ic: "sliders" },
];
const TABS: { href: string; label: string; ic: Ic }[] = [
  { href: "/office", label: "오피스", ic: "office" },
  { href: "/tasks", label: "작업", ic: "board" },
  { href: "/approvals", label: "승인", ic: "check" },
  { href: "/archive", label: "아카이브", ic: "archive" },
  { href: "/more", label: "더보기", ic: "menu" },
];
const Icon = ({ n, size = 18 }: { n: Ic; size?: number }) => { const C = I[n] as (p: { size?: number }) => React.ReactNode; return <span className="ic">{C({ size })}</span>; };

export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const bare = !me || path.startsWith("/login") || path.startsWith("/onboarding") || path.startsWith("/view");
  if (bare) return <>{children}</>;
  const on = (h: string) => path === h || path.startsWith(h + "/");
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); };
  return (
    <div className={`shell ${path.startsWith("/office") ? "shell-office" : ""}`}>
      <nav className="nav" aria-label="주 메뉴">
        <div className="brand"><span className="mark" aria-hidden="true" /><span>DANA OFFICE</span></div>
        {NAV.filter((n) => n.roles.includes(me.role)).map((n) => <Link key={n.href} href={n.href} className={on(n.href) ? "on" : ""}><Icon n={n.ic} />{n.label}</Link>)}
        {me.role === "ceo" && <><div className="grp">관리자</div>{ADMIN.map((n) => <Link key={n.href} href={n.href} className={on(n.href) ? "on" : ""}><Icon n={n.ic} />{n.label}</Link>)}</>}
        <div className="me"><div style={{ flex: 1 }}><b>{me.name}</b><div className="muted">{me.role === "ceo" ? "대표이사" : me.role === "staff" ? "직원" : "관람"}</div></div><button className="btn sm ghost" onClick={logout} aria-label="로그아웃"><I.logout size={16} /></button></div>
      </nav>
      <main className="main">{children}</main>
      <nav className="tabs" aria-label="모바일 메뉴">
        {TABS.map((t) => <Link key={t.href} href={t.href} className={on(t.href) ? "on" : ""}><Icon n={t.ic} size={20} />{t.label}</Link>)}
      </nav>
    </div>
  );
}
