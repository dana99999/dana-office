/** 환경 렌더러 v2 — 24px 타일. 바닥·벽·창문·가구·조명 (클라이언트 전용) */
import { at, COLS, ROWS, TS, W, H, WINDOWS, ZONES, WANDER, inZone, inLounge, ENTRANCE } from "../world/map";
import type { ActorSnap } from "../world/types";

export interface DeskState { on: boolean; screen: string; mug: string }
export interface Ctx { t: number; hour: number; night: boolean; desk: Record<string, DeskState>; apiDown: boolean; doorOpen: boolean }
type G = CanvasRenderingContext2D;
const R = (g: G, x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

const FONT: Record<string, string[]> = { D: ["110", "101", "101", "101", "110"], A: ["010", "101", "111", "101", "101"], N: ["101", "111", "111", "101", "101"], O: ["111", "101", "101", "101", "111"], F: ["111", "100", "110", "100", "100"], I: ["111", "010", "010", "010", "111"], C: ["111", "100", "100", "100", "111"], E: ["111", "100", "110", "100", "111"], " ": ["000", "000", "000", "000", "000"] };
export function drawText(g: G, x: number, y: number, str: string, c: string, s = 1) { g.fillStyle = c; for (let i = 0; i < str.length; i++) { const f = FONT[str[i]] || FONT[" "]; for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (f[r][k] === "1") g.fillRect(x + (i * 4 + k) * s, y + r * s, s, s); } }
export function skyFor(hour: number): [string, string] { if (hour >= 5 && hour < 7) return ["#5a4a7a", "#c98a6a"]; if (hour >= 7 && hour < 9) return ["#e8a26a", "#f4c98f"]; if (hour >= 9 && hour < 17) return ["#7fb6e8", "#c4e2f8"]; if (hour >= 17 && hour < 19) return ["#e07a5a", "#f2b27a"]; if (hour >= 19 && hour < 21) return ["#3e3f78", "#6a5a95"]; return ["#10152e", "#1d2550"]; }
export function nightAlpha(hour: number) { if (hour >= 8 && hour < 17) return 0; if (hour >= 17 && hour < 20) return (hour - 17) / 3 * 0.48; if (hour >= 20 || hour < 5) return 0.48; return 0.48 * (8 - hour) / 3; }

/* ── 바닥 ─────────────────────────────────────────────── */
function floor(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS, z = inZone(x, y);
  if (z) {
    R(g, X, Y, TS, TS, z.rug[(x + y) % 2]);
    g.fillStyle = z.rug[(x + y + 1) % 2]; for (let i = 0; i < 6; i++) { g.fillRect(X + 2 + i * 4, Y + 2 + (i % 2) * 12, 1, 1); g.fillRect(X + 4 + i * 4, Y + 20 - (i % 2) * 12, 1, 1); g.fillRect(X + 3 + (i % 3) * 8, Y + 8 + (i % 2) * 6, 2, 1); }
    g.fillStyle = z.inner; g.fillRect(X + 11 + ((x + y) % 2) * 1, Y + 11, 2, 2); g.fillRect(X + ((x * 3 + y) % 10) + 6, Y + ((x + y * 3) % 10) + 6, 1, 1);
    g.fillStyle = z.border; if (x === z.x1) g.fillRect(X, Y, 2, TS); if (x === z.x2) g.fillRect(X + TS - 2, Y, 2, TS); if (y === z.y1) g.fillRect(X, Y, TS, 2); if (y === z.y2) g.fillRect(X, Y + TS - 2, TS, 2);
    g.fillStyle = z.inner; if (x === z.x1) g.fillRect(X + 3, Y, 1, TS); if (x === z.x2) g.fillRect(X + TS - 4, Y, 1, TS); if (y === z.y1) g.fillRect(X, Y + 3, TS, 1); if (y === z.y2) g.fillRect(X, Y + TS - 4, TS, 1);
  } else if (inLounge(x, y)) {
    for (let p = 0; p < 3; p++) { const py = Y + p * 8; const tone = (p + y) % 2 === 0 ? "#9a7452" : "#a37b58"; R(g, X, py, TS, 8, tone); R(g, X, py, TS, 1, "#b08a64"); R(g, X, py + 7, TS, 1, "#7d5c40"); const j = ((x * 7 + p * 5 + y * 3) % 20) + 2; R(g, X + j, py, 1, 8, "#7d5c40"); if ((x * 3 + p + y) % 7 === 0) { R(g, X + ((j + 9) % 20), py + 3, 3, 2, "#6b4c33"); R(g, X + ((j + 10) % 20), py + 4, 1, 1, "#5a3f2a"); } }
  } else {
    let base = (x + y) % 2 === 0 ? "#bab7c6" : "#b3b0bf"; if ((x * 7 + y * 3) % 11 === 0) base = "#aca9b9"; R(g, X, Y, TS, TS, base);
    R(g, X, Y + TS - 1, TS, 1, "#9e9bab"); R(g, X + TS - 1, Y, 1, TS, "#9e9bab"); R(g, X, Y, TS - 1, 1, "#c9c6d3"); R(g, X, Y, 1, TS - 1, "#c9c6d3");
    if ((x * 5 + y * 11) % 9 === 0) { R(g, X + 6, Y + 14, 4, 1, "#a6a3b3"); R(g, X + 8, Y + 15, 2, 1, "#a6a3b3"); }
  }
}
/* ── 벽 · 창문 ────────────────────────────────────────── */
function wall(g: G, x: number, y: number, hour: number) {
  const X = x * TS, Y = y * TS;
  R(g, X, Y, TS, TS, "#383b52"); R(g, X, Y, TS, 8, "#4c5070"); R(g, X, Y, TS, 1, "#5c6188"); R(g, X, Y + 7, TS, 1, "#40435c");
  R(g, X, Y + 12, TS, 1, "#33364c"); R(g, X, Y + 15, TS, 1, "#40435c"); R(g, X, Y + 18, TS, 1, "#33364c");
  R(g, X, Y + 21, TS, 3, "#2a2c40"); R(g, X, Y + 21, TS, 1, "#4a4d66");
  if (y === 0 && WINDOWS.includes(x)) {
    const sky = skyFor(hour);
    R(g, X + 2, Y + 3, 20, 19, "#1e2033"); R(g, X + 3, Y + 4, 18, 17, "#d9d6e6");
    const grd = g.createLinearGradient(0, Y + 5, 0, Y + 20); grd.addColorStop(0, sky[0]); grd.addColorStop(1, sky[1]); g.fillStyle = grd; g.fillRect(X + 4, Y + 5, 16, 15);
    if (hour >= 20 || hour < 5) { g.fillStyle = "#fff"; g.fillRect(X + 6, Y + 8, 1, 1); g.fillRect(X + 15, Y + 11, 1, 1); g.fillRect(X + 10, Y + 7, 1, 1); g.fillRect(X + 17, Y + 16, 1, 1); R(g, X + 15, Y + 6, 3, 3, "#f4f1d0"); R(g, X + 14, Y + 7, 1, 1, "#f4f1d0"); }
    if (hour >= 9 && hour < 17) { g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(X + 5, Y + 7, 4, 1); g.fillRect(X + 7, Y + 8, 6, 1); g.fillRect(X + 12, Y + 14, 4, 1); }
    R(g, X + 11, Y + 5, 2, 15, "#d9d6e6"); R(g, X + 4, Y + 12, 16, 1, "#d9d6e6");
    R(g, X + 2, Y + 4, 1, 17, "#6a5f8c"); R(g, X + 21, Y + 4, 1, 17, "#6a5f8c"); R(g, X + 3, Y + 4, 1, 17, "#7a6fa0"); R(g, X + 20, Y + 4, 1, 17, "#7a6fa0");
    R(g, X + 1, Y + 21, 22, 2, "#c9c6d3"); R(g, X + 1, Y + 23, 22, 1, "#8f8ba0");
  }
}
/* ── 가구 ─────────────────────────────────────────────── */
export function drawChair(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS;
  R(g, X + 5, Y - 7, 14, 9, "#262838"); R(g, X + 6, Y - 6, 12, 7, "#3b3f57"); R(g, X + 7, Y - 5, 10, 1, "#4a4f6d"); R(g, X + 11, Y - 5, 2, 6, "#343850");
  R(g, X + 2, Y + 7, 3, 8, "#262838"); R(g, X + 19, Y + 7, 3, 8, "#262838"); R(g, X + 2, Y + 7, 3, 1, "#3b3f57"); R(g, X + 19, Y + 7, 3, 1, "#3b3f57");
  R(g, X + 4, Y + 15, 16, 6, "#262838"); R(g, X + 5, Y + 16, 14, 4, "#3b3f57"); R(g, X + 11, Y + 21, 2, 2, "#1c1e2c"); R(g, X + 6, Y + 23, 12, 1, "#1c1e2c"); R(g, X + 5, Y + 23, 1, 1, "#262838"); R(g, X + 18, Y + 23, 1, 1, "#262838");
}
function screenContent(g: G, X: number, Y: number, screen: string, t: number) {
  // 화면 영역: X+6..X+17 (12) × Y-2..Y+9 (12)
  if (screen === "design") { const sw = ["#c9612b", "#2f7d6f", "#c9932c", "#8f2f5a", "#4b44c4", "#e8e8f0"]; for (let i = 0; i < 6; i++) R(g, X + 6 + (i % 3) * 4, Y - 2 + Math.floor(i / 3) * 4, 3, 3, sw[i]); R(g, X + 6, Y + 6, 12, 1, "#8fd6e8"); R(g, X + 6, Y + 8, 8, 1, "#4fc0bc"); }
  else if (screen === "growth") { const hs = [4, 7, 3, 9, 6, 8]; for (let j = 0; j < 6; j++) { const hh = Math.max(1, Math.round(hs[j] + Math.sin(t * 1.3 + j) * 1.5)); R(g, X + 6 + j * 2, Y + 9 - hh, 1, hh, j % 2 ? "#4fc0bc" : "#8fd6e8"); } R(g, X + 6, Y + 9, 12, 1, "#2f7d6f"); }
  else if (screen === "list") { for (let k = 0; k < 5; k++) { R(g, X + 6, Y - 1 + k * 2, 8 - (k % 3), 1, k === 1 ? "#e8a33d" : "#8fd6e8"); R(g, X + 16, Y - 1 + k * 2, 1, 1, "#4fc0bc"); } }
  else if (screen === "grid") { for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) R(g, X + 6 + a * 3, Y - 2 + b * 4, 2, 3, (a + b) % 3 === 0 ? "#4fc0bc" : "#8fd6e8"); }
  else { for (let k = 0; k < 5; k++) R(g, X + 7, Y - 1 + k * 2, 10 - (k * 3) % 5, 1, "#cfe9f2"); R(g, X + 7, Y + 1, 2, 1, "#4b44c4"); if (Math.floor(t * 2) % 2) R(g, X + 12, Y + 7, 1, 2, "#8fd6e8"); }
}
function desk(g: G, x: number, y: number, c: Ctx) {
  const X = x * TS, Y = y * TS, st = c.desk[`${x},${y}`] || { on: false, screen: "doc", mug: "#4b44c4" };
  R(g, X, Y + 6, TS, 15, "#6b4a2f"); R(g, X, Y + 6, TS, 2, "#8a6340"); R(g, X + 3, Y + 11, 9, 1, "#7a5636"); R(g, X + 14, Y + 16, 8, 1, "#7a5636"); R(g, X, Y + 20, TS, 1, "#4a3220"); R(g, X, Y + 21, TS, 1, "#3a2718"); R(g, X + 1, Y + 22, 2, 2, "#3a2718"); R(g, X + 21, Y + 22, 2, 2, "#3a2718");
  R(g, X, Y + 8, 6, 8, "#f4f1ea"); R(g, X + 1, Y + 10, 4, 1, "#b9b6c4"); R(g, X + 1, Y + 12, 3, 1, "#b9b6c4"); R(g, X + 1, Y + 14, 4, 1, "#b9b6c4"); R(g, X + 5, Y + 8, 1, 1, "#d9d6e6");
  R(g, X + 1, Y + 17, 3, 3, "#f2d54a"); R(g, X + 1, Y + 19, 3, 1, "#d9b83a");
  R(g, X + 1, Y + 2, 3, 5, "#3b3f57"); R(g, X + 1, Y + 0, 1, 2, "#c0392b"); R(g, X + 3, Y - 1, 1, 3, "#4b44c4");
  R(g, X + 19, Y + 10, 5, 1, "#3b3f57"); R(g, X + 21, Y + 2, 1, 8, "#3b3f57"); R(g, X + 18, Y + 1, 6, 3, "#4a4f6d"); R(g, X + 19, Y + 4, 4, 1, c.night && st.on ? "#ffd27a" : "#2b2e42");
  R(g, X + 5, Y - 3, 14, 14, "#262838"); R(g, X + 6, Y - 3, 12, 1, "#33364c"); R(g, X + 6, Y - 2, 12, 12, st.on ? "#0f2a36" : "#141626"); R(g, X + 11, Y + 11, 2, 2, "#1c1e2c"); R(g, X + 8, Y + 13, 8, 1, "#1c1e2c"); R(g, X + 9, Y + 13, 6, 1, "#33364c"); R(g, X + 17, Y + 10, 1, 1, st.on ? "#4fc0bc" : "#3b3f57");
  if (st.on) { screenContent(g, X, Y, st.screen, c.t); if (Math.floor(c.t * 6) % 23 === 0) { g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(X + 6, Y - 2, 12, 12); } }
  R(g, X + 6, Y + 15, 11, 4, "#3b3f57"); for (let k = 0; k < 5; k++) { R(g, X + 7 + k * 2, Y + 16, 1, 1, "#cfd2de"); R(g, X + 7 + k * 2, Y + 17, 1, 1, "#9e9bab"); } R(g, X + 8, Y + 18, 7, 1, "#cfd2de");
  R(g, X + 18, Y + 15, 3, 4, "#cfd2de"); R(g, X + 19, Y + 15, 1, 2, "#9e9bab"); R(g, X + 18, Y + 18, 3, 1, "#9e9bab");
  R(g, X + 20, Y + 5, 3, 5, "#f4f1ea"); R(g, X + 20, Y + 7, 3, 1, st.mug); R(g, X + 23, Y + 6, 1, 3, "#f4f1ea"); R(g, X + 20, Y + 9, 3, 1, "#d9d6e6");
  if (st.on) { const ph = Math.floor(c.t * 2) % 3; g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(X + 20 + (ph % 2), Y + 3 - ph, 1, 1); g.fillRect(X + 22, Y + 2 - ((ph + 1) % 3), 1, 1); }
}
function bookshelf(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS; const top = Y - 14;
  R(g, X + 1, top, 22, 38, "#5a3c24"); R(g, X + 1, top, 22, 1, "#7a5434"); R(g, X + 1, top + 37, 22, 1, "#2a2c40"); R(g, X + 1, top, 1, 38, "#4a3020"); R(g, X + 22, top, 1, 38, "#4a3020");
  const books = ["#c0392b", "#2f7d6f", "#c9932c", "#4b44c4", "#8f2f5a", "#e8e8f0", "#1f4f7a", "#e07a5a"];
  for (let s = 0; s < 3; s++) { const sy = top + 2 + s * 12; R(g, X + 2, sy + 10, 20, 1, "#7a5434"); for (let i = 0; i < 8; i++) { const h = 7 + ((i + s) % 3); R(g, X + 3 + i * 2, sy + 10 - h, 2, h, books[(i + s * 3) % 8]); R(g, X + 3 + i * 2, sy + 10 - h + 2, 1, 1, "rgba(255,255,255,.25)"); } if (s === 1) { R(g, X + 15, sy + 4, 6, 6, "#3b3f57"); R(g, X + 16, sy + 5, 4, 1, "#cfd2de"); } }
  R(g, X + 6, top - 6, 8, 6, "#3f7a4d"); R(g, X + 8, top - 8, 4, 3, "#5aa66a"); R(g, X + 4, top - 4, 3, 3, "#5aa66a"); R(g, X + 7, top - 1, 6, 2, "#8a5a3c");
}
function couch(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS, top = at(x, y - 1) !== "C", bot = at(x, y + 1) !== "C";
  R(g, X + 1, Y, 22, TS, "#3f4c8a");
  if (top) { R(g, X + 1, Y + 1, 22, 6, "#2e3868"); R(g, X + 2, Y + 2, 20, 4, "#4a58a0"); R(g, X + 11, Y + 2, 2, 4, "#2e3868"); }
  R(g, X + 4, Y + (top ? 8 : 1), 16, top ? 15 : 22, "#5a68a8"); R(g, X + 5, Y + (top ? 9 : 2), 6, 3, "#6f7cb8"); R(g, X + 13, Y + (top ? 9 : 2), 6, 3, "#6f7cb8"); R(g, X + 11, Y + (top ? 8 : 1), 2, top ? 15 : 22, "#4a58a0");
  R(g, X + 1, Y, 3, TS, "#2e3868"); R(g, X + 20, Y, 3, TS, "#2e3868"); R(g, X + 1, Y, 3, 1, "#4a58a0"); R(g, X + 20, Y, 3, 1, "#4a58a0");
  if (bot) { R(g, X + 1, Y + 20, 22, 2, "#2e3868"); R(g, X + 3, Y + 22, 3, 2, "#1c1e2c"); R(g, X + 18, Y + 22, 3, 2, "#1c1e2c"); }
}
function coffee(g: G, x: number, y: number, c: Ctx) {
  const X = x * TS, Y = y * TS;
  R(g, X, Y + 9, TS, 13, "#6b4a2f"); R(g, X, Y + 9, TS, 2, "#8a6340"); R(g, X, Y + 21, TS, 1, "#4a3220"); R(g, X + 1, Y + 22, 2, 2, "#3a2718"); R(g, X + 21, Y + 22, 2, 2, "#3a2718");
  R(g, X + 4, Y - 6, 12, 15, "#262838"); R(g, X + 5, Y - 5, 10, 3, "#3b3f57"); R(g, X + 6, Y - 4, 4, 1, "#8fd6e8"); R(g, X + 7, Y - 1, 1, 1, "#e8a33d"); R(g, X + 10, Y - 1, 1, 1, "#4fc0bc"); R(g, X + 13, Y - 1, 1, 1, "#e9736a");
  R(g, X + 5, Y + 1, 10, 5, "#1c1e2c"); R(g, X + 9, Y + 1, 2, 2, "#3b3f57"); R(g, X + 8, Y + 4, 4, 3, "#f4f1ea"); R(g, X + 8, Y + 5, 4, 1, "#c9612b"); R(g, X + 5, Y + 7, 10, 2, "#3b3f57");
  R(g, X + 17, Y + 3, 5, 3, "#f4f1ea"); R(g, X + 18, Y + 6, 4, 3, "#f4f1ea"); R(g, X + 17, Y + 5, 5, 1, "#d9d6e6"); R(g, X + 18, Y + 8, 4, 1, "#d9d6e6");
  const ph = Math.floor(c.t * 2.5) % 3; g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(X + 9 + (ph % 2), Y + 2 - ph, 1, 1); g.fillRect(X + 11, Y + 1 - ((ph + 1) % 3), 1, 1);
}
function cooler(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS;
  R(g, X + 6, Y + 6, 12, 17, "#d9d6e6"); R(g, X + 15, Y + 6, 3, 17, "#b9b6c4"); R(g, X + 7, Y + 12, 10, 4, "#3b3f57"); R(g, X + 9, Y + 13, 1, 2, "#4fc0bc"); R(g, X + 13, Y + 13, 1, 2, "#e9736a"); R(g, X + 8, Y + 18, 8, 1, "#9e9bab");
  R(g, X + 7, Y - 7, 10, 13, "#4b8fd6"); R(g, X + 8, Y - 6, 3, 8, "#8fd6e8"); R(g, X + 14, Y - 7, 3, 13, "#2a5f9e"); R(g, X + 9, Y - 9, 6, 2, "#4b8fd6"); R(g, X + 7, Y + 3, 10, 1, "rgba(255,255,255,.4)");
  R(g, X + 6, Y + 23, 12, 1, "#2a2c40");
}
function plant(g: G, x: number, y: number, v: number) {
  const X = x * TS, Y = y * TS;
  if (v === 0) { R(g, X + 7, Y + 13, 10, 9, "#8a5a3c"); R(g, X + 6, Y + 12, 12, 2, "#a8714b"); R(g, X + 7, Y + 21, 10, 1, "#6b4229"); R(g, X + 8, Y + 15, 2, 5, "#9a6a48"); R(g, X + 3, Y + 3, 18, 10, "#3f7a4d"); R(g, X + 6, Y - 1, 10, 6, "#5aa66a"); R(g, X + 1, Y + 6, 5, 4, "#5aa66a"); R(g, X + 17, Y + 4, 6, 4, "#5aa66a"); R(g, X + 13, Y + 9, 6, 4, "#2e5c3a"); R(g, X + 4, Y + 10, 5, 3, "#2e5c3a"); R(g, X + 8, Y + 1, 3, 1, "#7dc48c"); R(g, X + 2, Y + 7, 2, 1, "#7dc48c"); R(g, X + 11, Y + 6, 1, 7, "#2e5c3a"); }
  else if (v === 1) { R(g, X + 8, Y + 12, 8, 11, "#d9d6e6"); R(g, X + 13, Y + 12, 3, 11, "#b9b6c4"); R(g, X + 8, Y + 22, 8, 1, "#9e9bab"); R(g, X + 11, Y - 4, 2, 16, "#3f7a4d"); R(g, X + 6, Y - 1, 5, 3, "#3f7a4d"); R(g, X + 13, Y + 2, 6, 3, "#3f7a4d"); R(g, X + 7, Y + 6, 4, 3, "#3f7a4d"); R(g, X + 13, Y + 8, 5, 2, "#3f7a4d"); R(g, X + 10, Y - 6, 4, 3, "#5aa66a"); R(g, X + 4, Y - 2, 3, 2, "#5aa66a"); R(g, X + 17, Y + 1, 3, 2, "#5aa66a"); R(g, X + 5, Y + 6, 2, 1, "#7dc48c"); }
  else { R(g, X + 8, Y + 14, 8, 7, "#c9612b"); R(g, X + 8, Y + 13, 8, 1, "#e07a5a"); R(g, X + 8, Y + 20, 8, 1, "#96431c"); R(g, X + 9, Y + 8, 6, 6, "#5aa66a"); R(g, X + 7, Y + 10, 3, 3, "#3f7a4d"); R(g, X + 14, Y + 9, 3, 4, "#3f7a4d"); R(g, X + 11, Y + 6, 2, 3, "#7dc48c"); R(g, X + 10, Y + 12, 4, 1, "#2e5c3a"); }
}
function server(g: G, x: number, y: number, c: Ctx) {
  const X = x * TS, Y = y * TS, t = c.t;
  R(g, X + 2, Y - 10, 20, 33, "#1e2033"); R(g, X + 2, Y - 10, 20, 1, "#3b3f57"); R(g, X + 2, Y + 22, 20, 1, "#0b0c14");
  for (let u = 0; u < 5; u++) { const uy = Y - 8 + u * 6; R(g, X + 3, uy, 18, 5, "#2b2e42"); R(g, X + 3, uy, 18, 1, "#3b3f57"); R(g, X + 12, uy + 1, 8, 3, "#33364c"); for (let k = 0; k < 4; k++) R(g, X + 13 + k * 2, uy + 2, 1, 1, "#4a4f6d"); const on = Math.floor(t * (2 + u)) % 2 === 0; R(g, X + 5, uy + 2, 2, 1, on ? "#4fc0bc" : "#1f7a78"); R(g, X + 8, uy + 2, 2, 1, u === 4 ? (c.apiDown ? "#e9736a" : "#e8a33d") : (Math.floor(t * 3 + u) % 2 ? "#4fc0bc" : "#1f7a78")); }
  R(g, X + 22, Y + 4, 1, 18, "#1c1e2c"); R(g, X + 21, Y + 21, 2, 1, "#1c1e2c");
}
function booth(g: G, x: number, y: number) {
  const X = x * TS, y0 = y * TS;
  R(g, X + 1, y0 - 8, 22, 31, "#2b2e42"); R(g, X + 2, y0 - 7, 20, 1, "#3b3f57"); R(g, X + 1, y0 + 22, 22, 1, "#1c1e2c");
  R(g, X + 3, y0 - 4, 18, 22, "rgba(143,214,232,.5)"); g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(X + 5, y0 - 3, 1, 18); g.fillRect(X + 6, y0 - 3, 1, 6); g.fillRect(X + 17, y0 + 8, 1, 8);
  R(g, X + 3, y0 + 18, 18, 1, "#3b3f57"); R(g, X + 19, y0 + 8, 1, 2, "#e8a33d"); R(g, X + 12, y0 - 4, 1, 22, "#3b3f57");
  R(g, X + 6, y0 - 7, 12, 2, "#5c6188"); R(g, X + 9, y0 - 7, 6, 2, "#e9736a"); drawText(g, X + 8, y0 + 0, "ON", "rgba(255,255,255,.7)");
}
export function reception(g: G, x: number, y: number) {
  const X = x * TS - 12, Y = y * TS;
  R(g, X, Y + 3, 48, 17, "#3b34a8"); R(g, X, Y + 3, 48, 4, "#4b44c4"); R(g, X, Y + 3, 48, 1, "#6a63e0"); R(g, X, Y + 19, 48, 1, "#2a2580"); R(g, X, Y + 20, 48, 2, "#1f1b60"); R(g, X + 2, Y + 22, 4, 2, "#1f1b60"); R(g, X + 42, Y + 22, 4, 2, "#1f1b60");
  drawText(g, X + 4, Y + 9, "DANA", "#f4f1ea", 2);
  R(g, X + 40, Y + 5, 6, 3, "#f4f1ea"); R(g, X + 41, Y + 6, 4, 1, "#e8a33d");
  R(g, X + 34, Y + 9, 10, 8, "#f4f1ea"); R(g, X + 35, Y + 10, 3, 6, "#e8a33d"); R(g, X + 39, Y + 11, 3, 1, "#3b34a8"); R(g, X + 39, Y + 13, 4, 1, "#3b34a8"); R(g, X + 39, Y + 15, 2, 1, "#3b34a8");
  R(g, X - 2, Y - 2, 6, 6, "#3f7a4d"); R(g, X - 1, Y - 4, 3, 3, "#5aa66a"); R(g, X - 1, Y + 4, 4, 2, "#8a5a3c");
}
function door(g: G, x: number, y: number, open: boolean) {
  const X = x * TS, Y = y * TS;
  R(g, X, Y, TS, TS, "#2a2c40"); R(g, X, Y, TS, 1, "#5c6188"); R(g, X + 1, Y + 1, 22, 2, "#4c5070"); R(g, X + 9, Y + 1, 6, 2, "#4fc0bc"); R(g, X + 10, Y + 1, 4, 1, "#7ff0ea");
  if (open) { R(g, X + 4, Y + 3, 16, 20, "#bab7c6"); R(g, X + 4, Y + 22, 16, 1, "#9e9bab"); R(g, X + 1, Y + 3, 3, 20, "#7a5434"); R(g, X + 1, Y + 3, 1, 20, "#5a3c24"); R(g, X + 2, Y + 12, 1, 2, "#e8a33d"); }
  else { R(g, X + 4, Y + 3, 16, 20, "#7a5434"); R(g, X + 5, Y + 4, 14, 8, "#5a3c24"); R(g, X + 5, Y + 13, 14, 8, "#5a3c24"); R(g, X + 6, Y + 5, 12, 6, "#6b4a2f"); R(g, X + 6, Y + 14, 12, 6, "#6b4a2f"); R(g, X + 16, Y + 12, 2, 1, "#e8a33d"); R(g, X + 4, Y + 3, 1, 20, "#8a6340"); }
  R(g, X + 20, Y + 3, 3, 20, "#3b3f57"); R(g, X + 1, Y + 23, 22, 1, "#1c1e2c");
}
function table(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS, top = at(x, y - 1) !== "T", bot = at(x, y + 1) !== "T", lef = at(x - 1, y) !== "T", rig = at(x + 1, y) !== "T";
  R(g, X, Y, TS, TS, "#8a6a44"); R(g, X + ((x * 5) % 12), Y + 6, 8, 1, "#7d5f3c"); R(g, X + ((x * 3) % 10), Y + 17, 10, 1, "#7d5f3c");
  if (top) { R(g, X, Y, TS, 1, "#6e5436"); R(g, X, Y + 1, TS, 3, "#a58255"); } if (bot) { R(g, X, Y + TS - 3, TS, 3, "#5e4528"); R(g, X, Y + TS - 1, TS, 1, "#3a2718"); } if (lef) { R(g, X, Y, 2, TS, "#6e5436"); } if (rig) { R(g, X + TS - 2, Y, 2, TS, "#6e5436"); }
  if (x === 18 && y === 8) { R(g, X + 4, Y + 5, 16, 11, "#262838"); R(g, X + 5, Y + 6, 14, 7, "#8fd6e8"); R(g, X + 6, Y + 7, 8, 1, "#cfe9f2"); R(g, X + 6, Y + 9, 6, 1, "#cfe9f2"); R(g, X + 5, Y + 14, 14, 1, "#3b3f57"); R(g, X + 4, Y + 16, 16, 2, "#1c1e2c"); }
  if (x === 17 && y === 9) { R(g, X + 5, Y + 6, 11, 9, "#f4f1ea"); R(g, X + 6, Y + 8, 8, 1, "#9e9bab"); R(g, X + 6, Y + 10, 6, 1, "#9e9bab"); R(g, X + 6, Y + 12, 7, 1, "#9e9bab"); R(g, X + 15, Y + 5, 1, 9, "#d9d6e6"); }
  if (x === 19 && y === 9) { R(g, X + 7, Y + 8, 4, 5, "#f4f1ea"); R(g, X + 7, Y + 10, 4, 1, "#4b44c4"); R(g, X + 11, Y + 9, 1, 3, "#f4f1ea"); R(g, X + 14, Y + 6, 3, 4, "#f4f1ea"); R(g, X + 14, Y + 8, 3, 1, "#c9612b"); }
  if (x === 18 && y === 9) { R(g, X + 9, Y + 12, 6, 6, "#3f7a4d"); R(g, X + 11, Y + 10, 2, 2, "#5aa66a"); R(g, X + 10, Y + 18, 4, 2, "#8a5a3c"); }
}
function stool(g: G, x: number, y: number) { const X = x * TS, Y = y * TS; R(g, X + 6, Y + 14, 12, 6, "#262838"); R(g, X + 7, Y + 15, 10, 3, "#3b3f57"); R(g, X + 11, Y + 20, 2, 3, "#1c1e2c"); R(g, X + 7, Y + 23, 10, 1, "#1c1e2c"); }
function bin(g: G, x: number, y: number) { const X = x * TS, Y = y * TS; R(g, X + 7, Y + 9, 10, 12, "#6e7387"); R(g, X + 6, Y + 8, 12, 2, "#8a8fa3"); R(g, X + 14, Y + 10, 3, 11, "#4f5468"); R(g, X + 8, Y + 6, 4, 2, "#f4f1ea"); R(g, X + 7, Y + 21, 10, 1, "#3b3f57"); }
function sideTable(g: G, x: number, y: number) { const X = x * TS, Y = y * TS; R(g, X + 5, Y + 10, 14, 8, "#6b4a2f"); R(g, X + 5, Y + 10, 14, 1, "#8a6340"); R(g, X + 6, Y + 18, 2, 5, "#4a3220"); R(g, X + 16, Y + 18, 2, 5, "#4a3220"); R(g, X + 11, Y + 3, 2, 7, "#3b3f57"); R(g, X + 7, Y - 1, 10, 4, "#e8a33d"); R(g, X + 8, Y - 2, 8, 1, "#f2c66a"); R(g, X + 15, Y + 6, 3, 3, "#f4f1ea"); R(g, X + 15, Y + 7, 3, 1, "#4b44c4"); }

/* ── 정적 배경 ────────────────────────────────────────── */
export function buildBackground(bg: HTMLCanvasElement, hour: number) {
  const g = bg.getContext("2d")!; g.imageSmoothingEnabled = false; R(g, 0, 0, W, H, "#0b0c14");
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (at(x, y) !== "#") floor(g, x, y);
  // 회의실 러그
  R(g, 16 * TS + 4, 7 * TS + 12, 5 * TS - 8, 4 * TS - 4, "#4f4470"); R(g, 16 * TS + 7, 7 * TS + 15, 5 * TS - 14, 4 * TS - 10, "#5d5282"); g.fillStyle = "#4f4470"; for (let i = 0; i < 9; i++) { g.fillRect(16 * TS + 10 + i * 12, 7 * TS + 18, 6, 1); g.fillRect(16 * TS + 10 + i * 12, 11 * TS + 3, 6, 1); } g.fillStyle = "#6b5f92"; for (let i = 0; i < 4; i++) { g.fillRect(16 * TS + 16 + i * 24, 8 * TS + 6, 2, 2); g.fillRect(16 * TS + 28 + i * 24, 10 * TS + 4, 2, 2); }
  if (hour >= 8 && hour < 17) for (const wx of WINDOWS) { g.fillStyle = "rgba(255,250,220,.10)"; g.fillRect(wx * TS + 2, TS, 20, TS * 2); g.fillStyle = "rgba(255,250,220,.05)"; g.fillRect(wx * TS - 1, TS * 3, 26, TS); }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (at(x, y) === "#") wall(g, x, y, hour);
  // 대표실 화이트보드
  R(g, 2 * TS + 2, 4, 44, 16, "#d9d6e6"); R(g, 2 * TS + 3, 5, 42, 14, "#f4f1ea"); g.fillStyle = "#9e9bab"; g.fillRect(2 * TS + 6, 8, 14, 1); g.fillRect(2 * TS + 6, 11, 26, 1); g.fillRect(2 * TS + 6, 14, 10, 1); g.fillRect(2 * TS + 6, 17, 20, 1); R(g, 2 * TS + 28, 7, 10, 3, "#4b44c4"); R(g, 2 * TS + 34, 13, 8, 5, "#c0392b"); R(g, 2 * TS + 35, 14, 6, 3, "#f4f1ea"); R(g, 2 * TS + 3, 19, 42, 1, "#b9b6c4"); R(g, 2 * TS + 36, 19, 6, 1, "#4b44c4"); R(g, 2 * TS + 30, 19, 4, 1, "#c0392b");
  // 무드보드
  const arts = ["#c9612b", "#2f7d6f", "#c9932c", "#8f2f5a", "#4b44c4", "#1f4f7a", "#e07a5a", "#5aa66a"]; R(g, 8 * TS + 1, 3, 118, 18, "#3b2f24"); R(g, 8 * TS + 2, 4, 116, 16, "#4a3c2e");
  for (let a = 0; a < 8; a++) { const ax = 8 * TS + 4 + a * 14 + (a % 2), ay = 5 + (a % 3); R(g, ax, ay, 12, 11, "#f4f1ea"); R(g, ax + 1, ay + 1, 10, 8, arts[a]); R(g, ax + 2, ay + 2, 3, 2, "rgba(255,255,255,.4)"); R(g, ax + 5, ay - 1, 3, 2, "#e8a33d"); }
  // 세일즈 보드
  R(g, 17 * TS + 2, 4, 44, 16, "#1f2233"); R(g, 17 * TS + 3, 5, 42, 14, "#262838"); const bars = [6, 9, 4, 11, 7, 10]; for (let i = 0; i < 6; i++) R(g, 17 * TS + 5 + i * 5, 18 - bars[i], 3, bars[i], i % 2 ? "#4fc0bc" : "#8fd6e8"); R(g, 17 * TS + 36, 6, 8, 1, "#e8a33d"); R(g, 17 * TS + 36, 9, 6, 1, "#e8a33d"); R(g, 17 * TS + 36, 12, 7, 1, "#cfd2de"); R(g, 17 * TS + 36, 15, 5, 1, "#cfd2de");
  // 벽시계
  R(g, 6 * TS + 5, 3, 14, 14, "#262838"); R(g, 6 * TS + 6, 4, 12, 12, "#f4f1ea"); g.fillStyle = "#262838"; g.fillRect(6 * TS + 11, 5, 2, 1); g.fillRect(6 * TS + 11, 14, 2, 1); g.fillRect(6 * TS + 7, 9, 1, 2); g.fillRect(6 * TS + 16, 9, 1, 2);
  // 갤러리 액자 (파티션 x6)
  for (let f = 0; f < 3; f++) { const fy = (7 + f) * TS; R(g, 6 * TS + 3, fy + 4, 18, 15, "#3b2f24"); R(g, 6 * TS + 4, fy + 5, 16, 13, "#f4f1ea"); R(g, 6 * TS + 5, fy + 6, 14, 11, arts[(f + 2) % 8]); R(g, 6 * TS + 6, fy + 7, 4, 2, "rgba(255,255,255,.45)"); R(g, 6 * TS + 11, fy + 3, 4, 1, "#3b3f57"); }
  // 그로스 벽 모니터 프레임
  R(g, 15 * TS + 2, 8 * TS + 3, 20, 15, "#1f2233"); R(g, 15 * TS + 3, 8 * TS + 4, 18, 13, "#262838"); R(g, 15 * TS + 10, 8 * TS + 18, 4, 2, "#1c1e2c");
  // 회사 사인 (하단 벽)
  drawText(g, 220, 12 * TS + 7, "DANA OFFICE", "#8fd6e8", 2); R(g, 208, 12 * TS + 7, 6, 10, "#e8a33d"); R(g, 210, 12 * TS + 9, 2, 6, "#3b34a8");
  // 정적 가구
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = at(x, y); if (c === "B") bookshelf(g, x, y); else if (c === "C") couch(g, x, y); else if (c === "W") cooler(g, x, y); else if (c === "P") plant(g, x, y, (x + y) % 2); else if (c === "O") booth(g, x, y); else if (c === "T") table(g, x, y); }
  for (const s of WANDER.meet) stool(g, s[0], s[1]);
  bin(g, 1, 4); bin(g, 14, 4); bin(g, 14, 10); sideTable(g, 1, 10); plant(g, 20, 7, 1); plant(g, 5, 7, 2);
}
/* ── 동적 가구 (매 프레임) ─────────────────────────────── */
export function drawDynamic(g: G, c: Ctx, simMin: number) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const ch = at(x, y); if (ch === "D") desk(g, x, y, c); else if (ch === "K") coffee(g, x, y, c); else if (ch === "S") server(g, x, y, c); else if (ch === "E") door(g, x, y, c.doorOpen); }
  reception(g, 10, 6);
  for (let b = 0; b < 6; b++) { const hh = Math.max(1, Math.round(6 + Math.sin(c.t * 0.9 + b * 1.3) * 3.5)); R(g, 15 * TS + 5 + b * 3, 8 * TS + 16 - hh, 2, hh, b % 2 ? "#4fc0bc" : "#8fd6e8"); }
  const ang = ((simMin / 60) % 12) / 12 * Math.PI * 2, mang = (simMin % 60) / 60 * Math.PI * 2, cx = 6 * TS + 11.5, cy = 9.5;
  g.fillStyle = "#262838"; for (let r = 1; r <= 3; r++) g.fillRect(Math.round(cx + Math.sin(ang) * r - 0.5), Math.round(cy - Math.cos(ang) * r - 0.5), 1, 1); for (let r = 1; r <= 4; r++) g.fillRect(Math.round(cx + Math.sin(mang) * r - 0.5), Math.round(cy - Math.cos(mang) * r - 0.5), 1, 1); g.fillStyle = "#c0392b"; g.fillRect(6 * TS + 11, 9, 1, 1);
}
export function drawLight(g: G, hour: number, lamps: [number, number][], monitors: [number, number][], zonesLit: { x1: number; y1: number; x2: number; y2: number }[]) {
  const a = nightAlpha(hour); if (a <= 0) return;
  g.fillStyle = hour >= 4 && hour < 8 ? "#2a2148" : "#0b1030"; g.globalAlpha = a; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = "lighter";
  for (const z of zonesLit) { const cx = (z.x1 + z.x2 + 1) / 2 * TS, cy = (z.y1 + z.y2 + 1) / 2 * TS; const grd = g.createRadialGradient(cx, cy, 6, cx, cy, 96); grd.addColorStop(0, "rgba(255,235,190,.16)"); grd.addColorStop(1, "rgba(255,235,190,0)"); g.fillStyle = grd; g.fillRect(cx - 100, cy - 100, 200, 200); }
  for (const t of lamps) { const cx = t[0] * TS + 20, cy = t[1] * TS + 28; const grd = g.createRadialGradient(cx, cy, 1, cx, cy, 40); grd.addColorStop(0, "rgba(255,200,110,.5)"); grd.addColorStop(1, "rgba(255,200,110,0)"); g.fillStyle = grd; g.fillRect(cx - 42, cy - 42, 84, 84); }
  for (const t of monitors) { const cx = t[0] * TS + 12, cy = t[1] * TS + 4; const grd = g.createRadialGradient(cx, cy, 1, cx, cy, 20); grd.addColorStop(0, "rgba(143,214,232,.4)"); grd.addColorStop(1, "rgba(143,214,232,0)"); g.fillStyle = grd; g.fillRect(cx - 22, cy - 22, 44, 44); }
  for (const wx of WINDOWS) { const grd = g.createLinearGradient(0, TS, 0, TS * 3); grd.addColorStop(0, "rgba(170,190,255,.14)"); grd.addColorStop(1, "rgba(170,190,255,0)"); g.fillStyle = grd; g.fillRect(wx * TS + 2, TS, 20, TS * 2); }
  g.globalCompositeOperation = "source-over";
}
export function deskStatesFor(actors: ActorSnap[]): { desk: Record<string, DeskState>; lamps: [number, number][]; mons: [number, number][]; zonesLit: typeof ZONES } {
  const desk: Record<string, DeskState> = {}, lamps: [number, number][] = [], mons: [number, number][] = [], zonesLit: typeof ZONES = []; const seen = new Set<string>();
  for (const a of actors) { const d: [number, number] = [a.seat[0], a.seat[1] + 1]; const working = a.present && (a.kind === "human" || (a.state === "work" && a.queue > 0)) && !a.moving && a.x === a.seat[0] && a.y === a.seat[1]; if (at(d[0], d[1]) === "D") desk[`${d[0]},${d[1]}`] = { on: working, screen: a.screen, mug: a.look.top[0] }; if (working) { lamps.push(d); mons.push(d); const z = inZone(a.x, a.y); if (z && !seen.has(z.key)) { seen.add(z.key); zonesLit.push(z); } } }
  return { desk, lamps, mons, zonesLit };
}
export { ENTRANCE };
