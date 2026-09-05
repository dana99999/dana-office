"use client";
import { useState } from "react";
import { SpriteView } from "./sprite-view";
import { BOTTOM_COLORS, HAIR_COLORS, SKINS, TOP_COLORS, randomLook, type Dir } from "@/lib/pixel/sprite";
import type { Look } from "@/lib/types";

const DIRS: Dir[] = ["down", "right", "up", "left"];
function Seg<T>({ label, opts, val, set }: { label: string; opts: [string, T][]; val: T; set: (v: T) => void }) {
  return <div><div className="lhead" style={{ marginBottom: 6 }}>{label}</div><div className="segs">{opts.map(([l, v]) => <button key={l} type="button" className={JSON.stringify(v) === JSON.stringify(val) ? "on" : ""} onClick={() => set(v)}>{l}</button>)}</div></div>;
}
function Sw({ label, cols, val, set }: { label: string; cols: [string, string][]; val: [string, string]; set: (v: [string, string]) => void }) {
  return <div><div className="lhead" style={{ marginBottom: 6 }}>{label}</div><div className="sw">{cols.map((c) => <button key={c[0]} type="button" aria-label={c[0]} style={{ background: c[0] }} className={val[0] === c[0] ? "on" : ""} onClick={() => set(c)} />)}</div></div>;
}
export function CharacterMaker({ initial, name, onChange, footer }: { initial: Look; name: string; onChange: (l: Look) => void; footer?: React.ReactNode }) {
  const [look, setLookState] = useState<Look>(initial); const [di, setDi] = useState(0); const [walk, setWalk] = useState(false);
  const setLook = (l: Look) => { setLookState(l); onChange(l); };
  return (
    <div className="maker">
      <div className="stagebox">
        <SpriteView look={look} dir={DIRS[di]} scale={8} animate={walk} />
        <div className="nametag">{name || "이름"}</div>
        <div className="row"><button type="button" className="btn sm" onClick={() => setDi((di + 3) % 4)}>◀ 회전</button><button type="button" className="btn sm" onClick={() => setDi((di + 1) % 4)}>회전 ▶</button><button type="button" className="btn sm" onClick={() => setWalk(!walk)}>{walk ? "멈춤" : "걷기"}</button></div>
      </div>
      <div className="opts">
        <Seg label="헤어" opts={[["숏", "short"], ["롱", "long"], ["번", "bun"], ["캡", "cap"]] as [string, Look["hair"]][]} val={look.hair} set={(v) => setLook({ ...look, hair: v })} />
        <Sw label="헤어 색" cols={HAIR_COLORS} val={look.hair_c} set={(v) => setLook({ ...look, hair_c: v })} />
        <Seg label="피부" opts={SKINS.map((s) => [s.label, s.v] as [string, [string, string]])} val={look.skin} set={(v) => setLook({ ...look, skin: v })} />
        <Seg label="의상" opts={[["티", "tee"], ["후디", "hoodie"], ["블레이저", "blazer"], ["베스트", "vest"]] as [string, Look["outfit"]][]} val={look.outfit} set={(v) => setLook({ ...look, outfit: v })} />
        <Sw label="상의 색" cols={TOP_COLORS} val={look.top} set={(v) => setLook({ ...look, top: v })} />
        <Sw label="하의 색" cols={BOTTOM_COLORS} val={look.bottom} set={(v) => setLook({ ...look, bottom: v })} />
        <Seg label="안경" opts={[["없음", false], ["있음", true]]} val={!!look.glasses} set={(v) => setLook({ ...look, glasses: v })} />
        <Seg label="신발" opts={[["검정", ["#1a1a22", "#3a3a48"]], ["흰색", ["#e6e6ea", "#b8b8c4"]], ["브라운", ["#4a3020", "#6a4a34"]]] as [string, [string, string]][]} val={look.shoe} set={(v) => setLook({ ...look, shoe: v })} />
        <div className="row" style={{ gridColumn: "1 / -1", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <button type="button" className="btn" onClick={() => setLook(randomLook())}>랜덤</button>
          {footer}
        </div>
      </div>
    </div>
  );
}
