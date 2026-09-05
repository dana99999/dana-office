"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
export function UsersAdmin({ users }: { users: User[] }) {
  const r = useRouter(); const [f, setF] = useState({ username: "", display_name: "", role: "staff" }); const [err, setErr] = useState("");
  const add = async () => { setErr(""); const res = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }); const j = await res.json().catch(() => ({})); if (!res.ok) { setErr(j.error || "실패"); return; } setF({ username: "", display_name: "", role: "staff" }); r.refresh(); };
  return (
    <div>
      <div className="topbar"><h1>직원 · 초대</h1><span className="sub">초대 코드를 전달하면 직원이 로그인 화면의 「초대 코드로 첫 출근」에서 비밀번호를 만들고 캐릭터를 꾸밉니다.</span></div>
      <div className="card" style={{ marginBottom: 14 }}><div className="row"><input placeholder="아이디 (영문)" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} style={inp} /><input placeholder="이름" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} style={inp} /><select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} style={inp}><option value="staff">직원</option><option value="viewer">관람(광고주)</option><option value="ceo">대표</option></select><button className="btn primary" onClick={add} disabled={!f.username || !f.display_name}>초대 코드 발급</button></div>{err && <div className="err" style={{ marginTop: 6 }}>{err}</div>}</div>
      <div className="scroll"><table><thead><tr><th>이름</th><th>아이디</th><th>권한</th><th>상태</th><th>초대 코드</th><th>좌석</th></tr></thead>
        <tbody>{users.map((u) => <tr key={u.id}><td><b>{u.display_name}</b></td><td className="mono">{u.username}</td><td>{u.role === "ceo" ? "대표" : u.role === "staff" ? "직원" : "관람"}</td><td>{u.invite_code ? <span className="chip idle">첫 출근 대기</span> : u.onboarded ? <span className="chip work">출근 완료</span> : <span className="chip move">캐릭터 미설정</span>}</td><td className="mono" style={{ letterSpacing: ".15em", fontWeight: 600 }}>{u.invite_code || "—"}</td><td className="mono">{u.seat_x},{u.seat_y}</td></tr>)}</tbody></table></div>
      <p className="muted" style={{ marginTop: 8 }}>직원의 위치·접속은 기록하지 않습니다(프레즌스만). 인사 평가에 쓰지 않습니다.</p>
    </div>
  );
}
const inp: React.CSSProperties = { flex: 1, minWidth: 120, padding: "8px 10px", border: "1px solid var(--line-strong)", borderRadius: 3, background: "var(--surface)", color: "var(--ink)" };
