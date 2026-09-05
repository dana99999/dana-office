"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SpriteView } from "@/components/sprite-view";
import { randomLook } from "@/lib/hd/chars";
import { useMemo } from "react";

export default function Login() {
  const r = useRouter();
  const [tab, setTab] = useState<"login" | "invite">("login");
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [code, setCode] = useState(""); const [np, setNp] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const looks = useMemo(() => [randomLook(), randomLook(), randomLook()], []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const res = tab === "login"
      ? await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: u, password: p }) })
      : await fetch("/api/auth/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, password: np }) });
    const j = await res.json().catch(() => ({})); setBusy(false);
    if (!res.ok) { setErr(j.error || "실패했습니다"); return; }
    r.push(tab === "invite" || !j.onboarded ? "/onboarding" : "/office"); r.refresh();
  };
  return (
    <div className="login-wrap">
      <div className="login-art">
        <div><div className="logo">DANA OFFICE</div><div className="sub">다나나인 버추얼 오피스</div></div>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>{looks.map((l, i) => <SpriteView key={i} look={l} dir="right" size={72} animate />)}</div>
        <div className="sub">필요한 사람만 자리에 있고, 부르면 걸어 들어오는 픽셀 사무실.</div>
      </div>
      <form className="login-form" onSubmit={submit}>
        <div className="segs"><button type="button" className={tab === "login" ? "on" : ""} onClick={() => setTab("login")}>출근하기</button><button type="button" className={tab === "invite" ? "on" : ""} onClick={() => setTab("invite")}>초대 코드로 첫 출근</button></div>
        {tab === "login" ? (<>
          <h1 style={{ fontSize: "1.3rem" }}>출근하기</h1><p className="muted">회사 계정으로 로그인하세요.</p>
          <div className="field"><label>아이디</label><input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" required /></div>
          <div className="field"><label>비밀번호</label><input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></div>
        </>) : (<>
          <h1 style={{ fontSize: "1.3rem" }}>첫 출근</h1><p className="muted">대표가 발급한 6자리 초대 코드와 새 비밀번호(8자 이상)를 입력하면 캐릭터 만들기로 이동합니다.</p>
          <div className="field"><label>초대 코드</label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} style={{ fontFamily: "var(--mono)", letterSpacing: ".2em" }} required /></div>
          <div className="field"><label>새 비밀번호</label><input type="password" value={np} onChange={(e) => setNp(e.target.value)} minLength={8} autoComplete="new-password" required /></div>
        </>)}
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn primary" disabled={busy} style={{ padding: 11 }}>{busy ? "확인 중…" : tab === "login" ? "출근하기" : "비밀번호 설정하고 첫 출근"}</button>
        <p className="muted">광고주 관람 링크로 오셨다면 별도 로그인 없이 열립니다.</p>
      </form>
    </div>
  );
}
