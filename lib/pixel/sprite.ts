/** 스프라이트 템플릿 시스템 — 12×20 문자 템플릿 + 헤어/의상/안경 레이어 (클라이언트 전용) */
import type { Look } from "../types";
export type Dir = "up" | "down" | "left" | "right";
export type Pose = "idle" | "walk" | "type" | "coffee" | "sleep" | "blink";
type View = "front" | "back" | "side";
const TPL: Record<View, string[]> = {
  front: ["...HHHHHH...", "..HHHHHHHh..", "..HHHHHHhh..", "..hSWSSWsh..", "..hSPSSPsh..", "...SSSSSs...", "...sSssSs...", "....TssT....", ".TTTTTTTTtt.", ".TTTTTTTTtt.", ".TTTTTTTTtt.", ".TTTTTTTTtt.", ".TTTTTTTTtt.", ".SsTTTTTTss.", "...BBBBBb...", "...BBBBBb...", "...BBbBBb...", "...BBbBBb...", "...kKKkKK...", "...KKKKKK..."],
  back: ["...HHHHHH...", "..HHHHHHHh..", "..HHHHHHHh..", "..HHHHHHHh..", "..hHHHHHhh..", "...HHHHHh...", "...sSSSSs...", "....ssss....", ".TTTTTTTTtt.", ".TTTTTTTTtt.", ".TTTTTTTTtt.", ".TTTTTTTTtt.", ".TTTTTTTTtt.", ".SsTTTTTTss.", "...BBBBBb...", "...BBBBBb...", "...BBbBBb...", "...BBbBBb...", "...kKKkKK...", "...KKKKKK..."],
  side: ["....HHHHH...", "...HHHHHHh..", "...HHHHSSs..", "...hHSSWSs..", "...hHSSPSs..", "....SSSSSs..", "....sSSSs...", ".....sTT....", "....TTTTTt..", "....TTTttt..", "....TTTttt..", "....TTTttt..", "....TTTttt..", "....TTTTSs..", "....bbBBB...", "....bbBBB...", "....bbBBB...", "....bbBBB...", "....kkKKk...", "....KKKKK..."],
};
type Grid = string[][];
const grid = (rows: string[]): Grid => rows.map((r) => r.split(""));
const set = (g: Grid, x: number, y: number, c: string) => { if (y >= 0 && y < 20 && x >= 0 && x < 12) g[y][x] = c; };
const fill = (g: Grid, x1: number, y1: number, x2: number, y2: number, c: string) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set(g, x, y, c); };
function shift(g: Grid, x1: number, y1: number, x2: number, y2: number, dx: number, dy: number) { const t: [number, number, string][] = []; for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) { t.push([x, y, g[y][x]]); g[y][x] = "."; } for (const [x, y, c] of t) if (c !== ".") set(g, x + dx, y + dy, c); }
function hair(g: Grid, v: View, h: Look["hair"]) {
  if (v === "front") { if (h === "long") for (let y = 3; y <= 10; y++) { set(g, 2, y, "H"); set(g, 9, y, "h"); } else if (h === "bun") { set(g, 9, 0, "h"); set(g, 10, 0, "h"); set(g, 9, 1, "h"); set(g, 10, 1, "h"); set(g, 8, 0, "H"); } else if (h === "cap") { fill(g, 3, 0, 8, 1, "C"); set(g, 7, 0, "c"); set(g, 8, 0, "c"); set(g, 7, 1, "c"); set(g, 8, 1, "c"); fill(g, 2, 2, 9, 2, "c"); set(g, 2, 4, "."); set(g, 9, 4, "."); } }
  else if (v === "back") { if (h === "long") { fill(g, 3, 6, 8, 10, "H"); fill(g, 8, 6, 8, 10, "h"); } else if (h === "bun") { set(g, 5, 0, "h"); set(g, 6, 0, "h"); set(g, 5, 1, "h"); set(g, 6, 1, "h"); } else if (h === "cap") { fill(g, 3, 0, 8, 3, "C"); fill(g, 8, 0, 8, 3, "c"); fill(g, 3, 4, 8, 4, "c"); set(g, 2, 4, "."); set(g, 9, 4, "."); } }
  else { if (h === "long") for (let y = 3; y <= 10; y++) { set(g, 3, y, "h"); set(g, 4, y, "H"); } else if (h === "bun") { set(g, 2, 1, "h"); set(g, 3, 1, "h"); set(g, 2, 2, "h"); set(g, 3, 2, "h"); } else if (h === "cap") { fill(g, 3, 0, 8, 1, "C"); fill(g, 3, 2, 6, 2, "C"); fill(g, 7, 2, 10, 2, "c"); set(g, 8, 1, "c"); set(g, 4, 3, "C"); } }
}
function outfit(g: Grid, v: View, o: Look["outfit"]) {
  if (v === "front") { if (o === "blazer") { fill(g, 4, 8, 4, 12, "t"); fill(g, 7, 8, 7, 12, "t"); fill(g, 5, 8, 6, 12, "X"); set(g, 5, 8, "R"); set(g, 6, 8, "R"); fill(g, 6, 9, 6, 11, "R"); } else if (o === "hoodie") { fill(g, 3, 7, 8, 7, "t"); fill(g, 4, 8, 7, 8, "t"); fill(g, 5, 9, 5, 10, "R"); fill(g, 6, 9, 6, 10, "R"); fill(g, 4, 12, 7, 12, "t"); } else if (o === "vest") { fill(g, 5, 8, 6, 13, "X"); set(g, 4, 7, "X"); set(g, 7, 7, "X"); set(g, 5, 10, "R"); set(g, 5, 12, "R"); } else fill(g, 5, 10, 6, 11, "R"); }
  else if (v === "back") { if (o === "hoodie") fill(g, 3, 7, 8, 8, "t"); else if (o === "blazer") fill(g, 5, 8, 6, 13, "t"); }
  else { if (o === "blazer") { fill(g, 8, 8, 8, 9, "X"); set(g, 8, 10, "R"); } else if (o === "hoodie") { fill(g, 4, 7, 8, 7, "t"); fill(g, 8, 8, 8, 9, "R"); fill(g, 5, 12, 7, 12, "t"); } else if (o === "vest") fill(g, 8, 8, 8, 12, "X"); }
}
function glasses(g: Grid, v: View) { if (v === "front") { set(g, 3, 4, "G"); set(g, 5, 4, "G"); set(g, 6, 4, "G"); set(g, 8, 4, "G"); } else if (v === "side") { set(g, 6, 4, "G"); set(g, 8, 4, "G"); set(g, 9, 4, "G"); } }
function eyesClosed(g: Grid, v: View) { if (v === "front") { set(g, 4, 3, "S"); set(g, 7, 3, "S"); set(g, 4, 4, "s"); set(g, 7, 4, "s"); } else if (v === "side") { set(g, 7, 3, "S"); set(g, 7, 4, "s"); } }
function pose(g: Grid, v: View, p: Pose, f: number) {
  if (p === "walk") {
    if (v !== "side") { if (f === 1) { shift(g, 3, 14, 5, 19, 0, -1); shift(g, 1, 8, 2, 13, 0, -1); shift(g, 9, 8, 10, 13, 0, 1); } if (f === 3) { shift(g, 6, 14, 8, 19, 0, -1); shift(g, 9, 8, 10, 13, 0, -1); shift(g, 1, 8, 2, 13, 0, 1); } }
    else { if (f === 1) { shift(g, 6, 14, 8, 19, 1, -1); shift(g, 4, 14, 5, 19, -1, 0); shift(g, 7, 9, 9, 13, 1, 0); } if (f === 3) { shift(g, 6, 14, 8, 19, -1, -1); shift(g, 4, 14, 5, 19, 1, 0); shift(g, 7, 9, 9, 13, -1, 0); } }
  } else if (p === "type" && v === "front") { fill(g, 1, 13, 2, 13, "."); fill(g, 9, 13, 10, 13, "."); if (f % 2 === 0) { set(g, 1, 12, "S"); set(g, 2, 12, "S"); set(g, 9, 12, "s"); set(g, 10, 12, "s"); } else { set(g, 1, 12, "T"); set(g, 2, 12, "S"); set(g, 9, 12, "s"); set(g, 10, 12, "t"); set(g, 2, 13, "S"); set(g, 9, 13, "s"); } }
  else if (p === "coffee" && v === "front") { if (f % 2 === 0) { set(g, 10, 10, "M"); set(g, 10, 11, "M"); set(g, 11, 10, "M"); set(g, 10, 12, "S"); set(g, 9, 13, "."); set(g, 10, 13, "."); } else { fill(g, 9, 8, 10, 12, "t"); set(g, 9, 7, "M"); set(g, 9, 8, "M"); set(g, 10, 7, "M"); set(g, 9, 9, "S"); set(g, 9, 13, "."); set(g, 10, 13, "."); } }
}
const cache = new Map<string, HTMLCanvasElement>();
export function lookKey(L: Look) { return `${L.hair}|${L.hair_c.join()}|${(L.cap || []).join()}|${L.skin.join()}|${L.outfit}|${L.top.join()}|${L.shirt || ""}|${L.accent || ""}|${L.bottom.join()}|${L.shoe.join()}|${L.glasses ? 1 : 0}`; }
/** 14×22 캔버스(아웃라인 포함). 같은 조합은 캐시 */
export function buildSprite(L: Look, dir: Dir, frame: number, p: Pose): HTMLCanvasElement {
  const key = `${lookKey(L)}|${dir}|${frame}|${p}`; const hit = cache.get(key); if (hit) return hit;
  const v: View = dir === "up" ? "back" : dir === "down" ? "front" : "side";
  const g = grid(TPL[v]); hair(g, v, L.hair); outfit(g, v, L.outfit); if (L.glasses) glasses(g, v); if (p === "sleep" || p === "blink") eyesClosed(g, v); pose(g, v, p, frame);
  const cap = L.cap || ["#3f3a8f", "#2c2866"];
  const col: Record<string, string> = { H: L.hair_c[0], h: L.hair_c[1], S: L.skin[0], s: L.skin[1], W: "#ffffff", P: "#1c1c24", T: L.top[0], t: L.top[1], X: L.shirt || "#f2f2f5", R: L.accent || "#c0392b", B: L.bottom[0], b: L.bottom[1], K: L.shoe[0], k: L.shoe[1], C: cap[0], c: cap[1], G: "#3b3f57", M: "#f4f1ea" };
  let tmp = document.createElement("canvas"); tmp.width = 12; tmp.height = 20; const tg = tmp.getContext("2d")!;
  for (let y = 0; y < 20; y++) for (let x = 0; x < 12; x++) { const c = g[y][x]; if (c !== "." && col[c]) { tg.fillStyle = col[c]; tg.fillRect(x, y, 1, 1); } }
  if (dir === "left") { const m = document.createElement("canvas"); m.width = 12; m.height = 20; const mg = m.getContext("2d")!; mg.translate(12, 0); mg.scale(-1, 1); mg.drawImage(tmp, 0, 0); tmp = m; }
  const out = document.createElement("canvas"); out.width = 14; out.height = 22; const og = out.getContext("2d")!; og.imageSmoothingEnabled = false;
  for (const [ox, oy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) og.drawImage(tmp, ox, oy);
  og.globalCompositeOperation = "source-in"; og.fillStyle = "#141420"; og.fillRect(0, 0, 14, 22); og.globalCompositeOperation = "source-over"; og.drawImage(tmp, 1, 1);
  if (cache.size > 2000) cache.clear(); cache.set(key, out); return out;
}
export const HAIR_COLORS: [string, string][] = [["#2b2118", "#4a3a2c"], ["#1a1a1e", "#33333c"], ["#5a3620", "#7a4e30"], ["#8a5a3c", "#a8714b"], ["#c9932c", "#e0b04a"], ["#6e7387", "#8a8fa3"]];
export const TOP_COLORS: [string, string][] = [["#2e3352", "#1f2238"], ["#7a2f4a", "#571f33"], ["#2f7d6f", "#215a50"], ["#c9612b", "#96431c"], ["#5b4a9e", "#3f3372"], ["#c9932c", "#9a6e1e"], ["#6e7387", "#4f5468"], ["#b8456f", "#8a3253"]];
export const BOTTOM_COLORS: [string, string][] = [["#26283a", "#1b1c2a"], ["#2e3145", "#22243a"], ["#5a4a3a", "#3e3228"], ["#8a8fa3", "#6e7387"]];
export const SKINS: { label: string; v: [string, string] }[] = [{ label: "연", v: ["#f4d3b3", "#dcae86"] }, { label: "중", v: ["#eabf99", "#c99268"] }, { label: "진", v: ["#f1c9a4", "#d19a6e"] }];
export function randomLook(): Look { const pk = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]; return { hair: pk(["short", "long", "bun", "cap"] as Look["hair"][]), hair_c: pk(HAIR_COLORS), cap: ["#3f3a8f", "#2c2866"], skin: pk(SKINS).v, outfit: pk(["tee", "hoodie", "blazer", "vest"] as Look["outfit"][]), top: pk(TOP_COLORS), shirt: "#f2f2f5", accent: "#f4f1ea", bottom: pk(BOTTOM_COLORS), shoe: pk([["#1a1a22", "#3a3a48"], ["#e6e6ea", "#b8b8c4"], ["#4a3020", "#6a4a34"]] as [string, string][]), glasses: Math.random() < 0.25 }; }
