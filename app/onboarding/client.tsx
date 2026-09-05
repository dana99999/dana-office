"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CharacterMaker } from "@/components/character-maker";
import type { Look } from "@/lib/types";
export function OnboardingClient({ initial, name, first }: { initial: Look; name: string; first: boolean }) {
  const r = useRouter(); const [look, setLook] = useState(initial); const [nm, setNm] = useState(name); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); await fetch("/api/users/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sprite_json: JSON.stringify(look), display_name: nm }) }); r.push("/office"); r.refresh(); };
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "22px 14px 40px" }}>
      <div className="topbar"><h1>{first ? "내 캐릭터 만들기" : "캐릭터 바꾸기"}</h1><span className="sub">{first ? "첫 출근입니다. 이 모습으로 사무실에 들어갑니다." : "저장하면 사무실에 바로 반영됩니다."}</span></div>
      <div className="field" style={{ maxWidth: 260, marginBottom: 12 }}><label>이름표</label><input value={nm} onChange={(e) => setNm(e.target.value)} maxLength={12} /></div>
      <CharacterMaker initial={initial} name={nm} onChange={setLook} footer={<button type="button" className="btn primary" disabled={busy} onClick={save}>{busy ? "저장 중…" : "이 모습으로 출근"}</button>} />
    </div>
  );
}
