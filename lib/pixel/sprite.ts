/** 스프라이트 템플릿 시스템 v2 — 18×30 문자 템플릿 + 헤어/의상/안경 레이어 (클라이언트 전용) */
import type { Look } from "../types";
export type Dir = "up" | "down" | "left" | "right";
export type Pose = "idle" | "walk" | "type" | "coffee" | "sleep" | "blink";
type View = "front" | "back" | "side";
export const SW = 18, SH = 30, OW = 20, OH = 32; // 스프라이트 / 아웃라인 포함 크기
const TPL: Record<View, string[]> = {
  front: [
    "......HHHHHH......", "....HHHHHHHHHh....", "...HHHHHHHHHHhh...", "...HHHHHHHHHHhh...",
    "...hHSSSSSSSShh...", "...hSSSSSSSSSsh...", "...hShhSSShhSsh...", "...hSWPSSSPWSsh...",
    "...hSPPSSSPPSsh...", "....SSSSsSSSSs....", "....SSSssSSSSs....", "....sSSSSSSSss....",
    ".....sSSSSSss.....", "......TTssTT......",
    "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..",
    "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..",
    "..SSTTTTTTTTTtss..", "..SSTTTTTTTTTtss..",
    "....BBBBbBBBBb....", "....BBBBbBBBBb....", "....BBBBbBBBBb....", "....BBBBbBBBBb....",
    "....kKKK..KKKk....", "....KKKK..KKKK....", "....KKKK..KKKK....",
  ],
  back: [
    "......HHHHHH......", "....HHHHHHHHHh....", "...HHHHHHHHHHhh...", "...HHHHHHHHHHhh...",
    "...HHHHHHHHHHhh...", "...HHHHHHHHHHhh...", "...HHHHHHHHHHhh...", "...HHHHHHHHHHhh...",
    "...hHHHHHHHHHhh...", "....HHHHHHHHhh....", ".....HHHHHHhh.....", ".....sSSSSSSs.....",
    "......sSSSSs......", "......ssssss......",
    "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..",
    "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..", "..TTTTTTTTTTTttt..",
    "..SSTTTTTTTTTtss..", "..SSTTTTTTTTTtss..",
    "....BBBBbBBBBb....", "....BBBBbBBBBb....", "....BBBBbBBBBb....", "....BBBBbBBBBb....",
    "....kKKK..KKKk....", "....KKKK..KKKK....", "....KKKK..KKKK....",
  ],
  side: [
    "......HHHHHH......", "....HHHHHHHHHh....", "...HHHHHHHHHHhh...", "...HHHHHHHHHHhh...",
    "...HHHHHHHSSSSh...", "...hHHHHHSSSSSs...", "...hHHHHHShhSSs...", "...hHHHHHSWPSSs...",
    "...hHHHHHSPPSSs...", "....HHHHSSSSSSs...", "....hHHSSSSSss....", ".....hSSSSSSs.....",
    "......sSSSSs......", ".......ssTT.......",
    ".....TTTTTTTTtt...", ".....TTTTTTtttt...", ".....TTTTTTtttt...", ".....TTTTTTtttt...",
    ".....TTTTTTtttt...", ".....TTTTTTtttt...", ".....TTTTTTtttt...",
    ".....TTTTTTTSss...", ".....TTTTTTTSss...",
    ".....bbbBBBBBb....", ".....bbbBBBBBb....", ".....bbbBBBBBb....", ".....bbbBBBBBb....",
    ".....kkkkKKKKk....", ".....KKKKKKKKK....", ".....KKKKKKKKK....",
  ],
};
type Grid = string[][];
const grid = (rows: string[]): Grid => rows.map((r) => r.split(""));
const set = (g: Grid, x: number, y: number, c: string) => { if (y >= 0 && y < SH && x >= 0 && x < SW) g[y][x] = c; };
const fill = (g: Grid, x1: number, y1: number, x2: number, y2: number, c: string) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set(g, x, y, c); };
function shift(g: Grid, x1: number, y1: number, x2: number, y2: number, dx: number, dy: number) { const t: [number, number, string][] = []; for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) { t.push([x, y, g[y][x]]); g[y][x] = "."; } for (const [x, y, c] of t) if (c !== ".") set(g, x + dx, y + dy, c); }

function hair(g: Grid, v: View, h: Look["hair"]) {
  if (v === "front") {
    if (h === "long") { for (let y = 5; y <= 18; y++) { set(g, 2, y, "H"); set(g, 3, y, "H"); set(g, 14, y, "h"); set(g, 15, y, "h"); } set(g, 2, 4, "H"); set(g, 15, 4, "h"); }
    else if (h === "bun") { fill(g, 13, 0, 15, 2, "h"); set(g, 13, 0, "H"); set(g, 14, 0, "H"); set(g, 12, 1, "H"); }
    else if (h === "cap") { fill(g, 4, 0, 13, 3, "C"); fill(g, 12, 0, 13, 3, "c"); fill(g, 6, 0, 11, 0, "c"); fill(g, 2, 4, 15, 4, "c"); fill(g, 3, 5, 3, 8, "."); fill(g, 13, 5, 14, 8, "."); set(g, 4, 4, "c"); set(g, 13, 4, "c"); fill(g, 5, 5, 5, 5, "S"); fill(g, 13, 5, 13, 5, "s"); }
    else { /* short: 살짝 갈라진 앞머리 */ set(g, 8, 4, "h"); set(g, 12, 3, "h"); }
  } else if (v === "back") {
    if (h === "long") { fill(g, 4, 11, 13, 20, "H"); fill(g, 13, 11, 13, 20, "h"); fill(g, 4, 20, 13, 20, "h"); }
    else if (h === "bun") { fill(g, 7, 0, 10, 2, "h"); set(g, 8, 0, "H"); set(g, 9, 0, "H"); }
    else if (h === "cap") { fill(g, 4, 0, 13, 9, "C"); fill(g, 12, 0, 13, 9, "c"); fill(g, 3, 6, 14, 6, "c"); set(g, 3, 8, "."); set(g, 14, 8, "."); set(g, 14, 7, "."); fill(g, 4, 10, 13, 10, "c"); }
  } else {
    if (h === "long") { for (let y = 8; y <= 19; y++) { set(g, 3, y, "h"); set(g, 4, y, "H"); set(g, 5, y, "H"); } fill(g, 3, 19, 5, 19, "h"); }
    else if (h === "bun") { fill(g, 1, 1, 3, 3, "h"); set(g, 2, 1, "H"); set(g, 2, 2, "H"); }
    else if (h === "cap") { fill(g, 4, 0, 13, 3, "C"); fill(g, 12, 0, 13, 3, "c"); fill(g, 9, 4, 16, 4, "c"); fill(g, 4, 4, 8, 4, "C"); fill(g, 3, 5, 3, 8, "."); set(g, 4, 5, "C"); set(g, 4, 6, "C"); fill(g, 4, 7, 4, 8, "h"); }
  }
}
function outfit(g: Grid, v: View, o: Look["outfit"]) {
  if (v === "front") {
    if (o === "blazer") { fill(g, 6, 14, 6, 20, "t"); fill(g, 11, 14, 11, 20, "t"); fill(g, 7, 14, 10, 21, "X"); set(g, 8, 14, "R"); set(g, 9, 14, "R"); fill(g, 9, 15, 9, 19, "R"); set(g, 5, 15, "t"); set(g, 12, 15, "t"); fill(g, 4, 20, 13, 20, "t"); }
    else if (o === "hoodie") { fill(g, 4, 13, 13, 13, "t"); fill(g, 5, 14, 12, 14, "t"); set(g, 7, 15, "R"); set(g, 10, 15, "R"); fill(g, 7, 16, 7, 18, "R"); fill(g, 10, 16, 10, 18, "R"); fill(g, 5, 20, 12, 20, "t"); set(g, 5, 21, "t"); set(g, 12, 21, "t"); }
    else if (o === "vest") { fill(g, 7, 14, 10, 22, "X"); set(g, 6, 13, "X"); set(g, 11, 13, "X"); set(g, 8, 16, "R"); set(g, 8, 18, "R"); set(g, 8, 20, "R"); fill(g, 4, 22, 6, 22, "t"); fill(g, 11, 22, 13, 22, "t"); }
    else { fill(g, 7, 17, 10, 18, "R"); set(g, 8, 13, "S"); set(g, 9, 13, "S"); fill(g, 4, 21, 13, 21, "t"); }
  } else if (v === "back") {
    if (o === "hoodie") { fill(g, 4, 13, 13, 15, "t"); fill(g, 5, 12, 12, 12, "t"); }
    else if (o === "blazer") { fill(g, 8, 14, 9, 22, "t"); }
    else if (o === "vest") { fill(g, 4, 22, 13, 22, "t"); }
  } else {
    if (o === "blazer") { fill(g, 12, 14, 12, 19, "X"); fill(g, 12, 15, 12, 17, "R"); fill(g, 5, 20, 12, 20, "t"); }
    else if (o === "hoodie") { fill(g, 5, 13, 12, 14, "t"); fill(g, 12, 15, 12, 17, "R"); fill(g, 7, 20, 10, 20, "t"); }
    else if (o === "vest") { fill(g, 12, 14, 12, 21, "X"); set(g, 12, 16, "R"); set(g, 12, 18, "R"); }
    else { fill(g, 9, 17, 10, 18, "R"); }
  }
}
function glasses(g: Grid, v: View) {
  if (v === "front") { for (const y of [7, 8]) { set(g, 4, y, "G"); set(g, 7, y, "G"); set(g, 9, y, "G"); set(g, 12, y, "G"); } set(g, 8, 7, "G"); set(g, 5, 9, "G"); set(g, 6, 9, "G"); set(g, 10, 9, "G"); set(g, 11, 9, "G"); }
  else if (v === "side") { for (const y of [7, 8]) { set(g, 9, y, "G"); set(g, 12, y, "G"); } set(g, 13, 7, "G"); set(g, 14, 7, "G"); set(g, 10, 9, "G"); set(g, 11, 9, "G"); }
}
function eyesClosed(g: Grid, v: View) {
  if (v === "front") { fill(g, 5, 7, 6, 7, "S"); fill(g, 10, 7, 11, 7, "S"); fill(g, 5, 8, 6, 8, "s"); fill(g, 10, 8, 11, 8, "s"); }
  else if (v === "side") { fill(g, 10, 7, 11, 7, "S"); fill(g, 10, 8, 11, 8, "s"); }
}
function pose(g: Grid, v: View, p: Pose, f: number) {
  if (p === "walk") {
    if (v !== "side") {
      if (f === 1) { shift(g, 4, 23, 8, 29, 0, -1); shift(g, 2, 14, 3, 22, 0, -1); shift(g, 14, 14, 15, 22, 0, 1); }
      if (f === 3) { shift(g, 9, 23, 13, 29, 0, -1); shift(g, 14, 14, 15, 22, 0, -1); shift(g, 2, 14, 3, 22, 0, 1); }
    } else {
      if (f === 1) { shift(g, 8, 23, 13, 29, 1, -1); shift(g, 5, 23, 7, 29, -1, 0); shift(g, 11, 15, 14, 22, 1, 0); }
      if (f === 3) { shift(g, 8, 23, 13, 29, -1, -1); shift(g, 5, 23, 7, 29, 1, 0); shift(g, 11, 15, 14, 22, -1, 0); }
    }
  } else if (p === "type" && v === "front") {
    fill(g, 2, 21, 3, 22, "T"); fill(g, 14, 21, 15, 22, "t");
    if (f % 2 === 0) { fill(g, 2, 20, 3, 21, "S"); fill(g, 14, 21, 15, 22, "s"); } else { fill(g, 2, 21, 3, 22, "S"); fill(g, 14, 20, 15, 21, "s"); }
  } else if (p === "coffee" && v === "front") {
    if (f % 2 === 0) { fill(g, 14, 17, 16, 19, "M"); set(g, 17, 18, "M"); set(g, 15, 18, "R"); fill(g, 14, 20, 15, 20, "s"); fill(g, 14, 21, 15, 22, "."); }
    else { fill(g, 14, 14, 15, 15, "t"); fill(g, 13, 10, 15, 12, "M"); set(g, 16, 11, "M"); set(g, 14, 11, "R"); fill(g, 14, 13, 15, 13, "s"); fill(g, 14, 21, 15, 22, "."); fill(g, 14, 16, 15, 20, "t"); }
  }
}
const cache = new Map<string, HTMLCanvasElement>();
export function lookKey(L: Look) { return `${L.hair}|${L.hair_c.join()}|${(L.cap || []).join()}|${L.skin.join()}|${L.outfit}|${L.top.join()}|${L.shirt || ""}|${L.accent || ""}|${L.bottom.join()}|${L.shoe.join()}|${L.glasses ? 1 : 0}`; }
/** 20×32 캔버스(아웃라인 포함). 같은 조합은 캐시 */
export function buildSprite(L: Look, dir: Dir, frame: number, p: Pose): HTMLCanvasElement {
  const key = `${lookKey(L)}|${dir}|${frame}|${p}`; const hit = cache.get(key); if (hit) return hit;
  const v: View = dir === "up" ? "back" : dir === "down" ? "front" : "side";
  const g = grid(TPL[v]); hair(g, v, L.hair); outfit(g, v, L.outfit); if (L.glasses) glasses(g, v); if (p === "sleep" || p === "blink") eyesClosed(g, v); pose(g, v, p, frame);
  const cap = L.cap || ["#3f3a8f", "#2c2866"];
  const col: Record<string, string> = { H: L.hair_c[0], h: L.hair_c[1], S: L.skin[0], s: L.skin[1], W: "#ffffff", P: "#1c1c24", T: L.top[0], t: L.top[1], X: L.shirt || "#f2f2f5", R: L.accent || "#c0392b", B: L.bottom[0], b: L.bottom[1], K: L.shoe[0], k: L.shoe[1], C: cap[0], c: cap[1], G: "#3b3f57", M: "#f4f1ea" };
  let tmp = document.createElement("canvas"); tmp.width = SW; tmp.height = SH; const tg = tmp.getContext("2d")!;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const c = g[y][x]; if (c !== "." && col[c]) { tg.fillStyle = col[c]; tg.fillRect(x, y, 1, 1); } }
  /* 머리 하이라이트 · 볼 홍조 · 신발 광택 */
  if (v !== "back" || true) { tg.fillStyle = "rgba(255,255,255,.18)"; tg.fillRect(6, 1, 3, 1); tg.fillRect(5, 2, 1, 1); }
  if (v === "front") { tg.fillStyle = "rgba(220,110,110,.35)"; tg.fillRect(4, 9, 1, 1); tg.fillRect(13, 9, 1, 1); }
  if (dir === "left") { const m = document.createElement("canvas"); m.width = SW; m.height = SH; const mg = m.getContext("2d")!; mg.translate(SW, 0); mg.scale(-1, 1); mg.drawImage(tmp, 0, 0); tmp = m; }
  const out = document.createElement("canvas"); out.width = OW; out.height = OH; const og = out.getContext("2d")!; og.imageSmoothingEnabled = false;
  for (const [ox, oy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) og.drawImage(tmp, ox, oy);
  og.globalCompositeOperation = "source-in"; og.fillStyle = "#141420"; og.fillRect(0, 0, OW, OH); og.globalCompositeOperation = "source-over"; og.drawImage(tmp, 1, 1);
  if (cache.size > 2000) cache.clear(); cache.set(key, out); return out;
}
export const HAIR_COLORS: [string, string][] = [["#2b2118", "#4a3a2c"], ["#1a1a1e", "#33333c"], ["#5a3620", "#7a4e30"], ["#8a5a3c", "#a8714b"], ["#c9932c", "#e0b04a"], ["#6e7387", "#8a8fa3"], ["#7a3f8f", "#9a5fae"], ["#b8452f", "#d86a50"]];
export const TOP_COLORS: [string, string][] = [["#2e3352", "#1f2238"], ["#7a2f4a", "#571f33"], ["#2f7d6f", "#215a50"], ["#c9612b", "#96431c"], ["#5b4a9e", "#3f3372"], ["#c9932c", "#9a6e1e"], ["#6e7387", "#4f5468"], ["#b8456f", "#8a3253"], ["#f2efe6", "#cfc9b8"], ["#1c1c22", "#34343f"]];
export const BOTTOM_COLORS: [string, string][] = [["#26283a", "#1b1c2a"], ["#2e3145", "#22243a"], ["#5a4a3a", "#3e3228"], ["#8a8fa3", "#6e7387"], ["#4b5f8a", "#354566"]];
export const SKINS: { label: string; v: [string, string] }[] = [{ label: "연", v: ["#f4d3b3", "#dcae86"] }, { label: "중", v: ["#eabf99", "#c99268"] }, { label: "진", v: ["#f1c9a4", "#d19a6e"] }, { label: "딥", v: ["#b9835c", "#8d603f"] }];
export function randomLook(): Look { const pk = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]; return { hair: pk(["short", "long", "bun", "cap"] as Look["hair"][]), hair_c: pk(HAIR_COLORS), cap: pk([["#3f3a8f", "#2c2866"], ["#1c1c22", "#34343f"], ["#b8452f", "#8a3223"]] as [string, string][]), skin: pk(SKINS).v, outfit: pk(["tee", "hoodie", "blazer", "vest"] as Look["outfit"][]), top: pk(TOP_COLORS), shirt: "#f2f2f5", accent: pk(["#f4f1ea", "#c0392b", "#e8a33d", "#2b2e42"]), bottom: pk(BOTTOM_COLORS), shoe: pk([["#1a1a22", "#3a3a48"], ["#e6e6ea", "#b8b8c4"], ["#4a3020", "#6a4a34"]] as [string, string][]), glasses: Math.random() < 0.25 }; }
