/** HD 벡터 환경 렌더러 — 48px 타일, 안티앨리어싱·그라디언트·소프트 섀도 (클라이언트 전용) */
import { at, COLS, ROWS, TS, W, H, WINDOWS, ZONES, WANDER, inZone, LOUNGE, ENTRANCE } from "../world/map";
import type { ActorSnap } from "../world/types";
export interface DeskState { on: boolean; screen: string; mug: string }
export interface Ctx { t: number; hour: number; night: boolean; desk: Record<string, DeskState>; apiDown: boolean; doorOpen: boolean }
type G = CanvasRenderingContext2D;
export const BG_Q = 2; // 배경 오프스크린 품질 배율
const FONT = "800 13px Nunito, 'IBM Plex Sans KR', system-ui, sans-serif";

function rr(g: G, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string | null, lw = 1) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function circ(g: G, x: number, y: number, r: number, fill: string | CanvasGradient, stroke?: string | null, lw = 1) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function ell(g: G, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
function lg(g: G, x0: number, y0: number, x1: number, y1: number, a: string, b: string) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
function rg(g: G, x: number, y: number, r0: number, r1: number, a: string, b: string) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
function shadow(g: G, fn: () => void, blur = 6, dy = 3, col = "rgba(10,10,24,.35)") { g.save(); g.shadowColor = col; g.shadowBlur = blur; g.shadowOffsetY = dy; fn(); g.restore(); }
const OUT = "rgba(24,24,40,.45)";
export function skyFor(hour: number): [string, string] { if (hour >= 5 && hour < 7) return ["#5a4a7a", "#c98a6a"]; if (hour >= 7 && hour < 9) return ["#e8a26a", "#f4c98f"]; if (hour >= 9 && hour < 17) return ["#7fb6e8", "#c4e2f8"]; if (hour >= 17 && hour < 19) return ["#e07a5a", "#f2b27a"]; if (hour >= 19 && hour < 21) return ["#3e3f78", "#6a5a95"]; return ["#10152e", "#1d2550"]; }
export function nightAlpha(hour: number) { if (hour >= 8 && hour < 17) return 0; if (hour >= 17 && hour < 20) return (hour - 17) / 3 * 0.5; if (hour >= 20 || hour < 5) return 0.5; return 0.5 * (8 - hour) / 3; }

/* ── 바닥 ─────────────────────────────────────────── */
function floors(g: G) {
  // 복도 (기본)
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (at(x, y) === "#") continue; const X = x * TS, Y = y * TS; g.fillStyle = (x + y) % 2 ? "#e6e3df" : "#e0ddd8"; g.fillRect(X, Y, TS, TS); g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(X + 1, Y + 1, TS - 2, 1); g.fillStyle = "rgba(90,80,70,.13)"; g.fillRect(X, Y + TS - 1, TS, 1); g.fillRect(X + TS - 1, Y, 1, TS); }
  // 라운지 원목
  const L = LOUNGE; const lx = L.x1 * TS, ly = L.y1 * TS, lw = (L.x2 - L.x1 + 1) * TS, lh = (L.y2 - L.y1 + 1) * TS;
  g.save(); g.beginPath(); g.rect(lx, ly, lw, lh); g.clip();
  for (let py = ly; py < ly + lh; py += 16) { const row = (py - ly) / 16; for (let px = lx - ((row % 2) * 40); px < lx + lw; px += 80) { const tone = ((px / 80 + row) | 0) % 3; rr(g, px + 1, py + 1, 78, 14, 2, lg(g, px, py, px, py + 16, ["#d9b48a", "#d0aa80", "#e0bd94"][tone], ["#c49a6e", "#bb9268", "#cba379"][tone])); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(px + 3, py + 2, 74, 1); if ((px + row * 7) % 5 === 0) ell(g, px + 40 + (row % 3) * 10, py + 8, 3, 1.4, "rgba(120,80,50,.22)"); } }
  g.restore();
  // 존 러그
  for (const z of ZONES) { const X = z.x1 * TS + 3, Y = z.y1 * TS + 3, Wz = (z.x2 - z.x1 + 1) * TS - 6, Hz = (z.y2 - z.y1 + 1) * TS - 6;
    shadow(g, () => rr(g, X, Y, Wz, Hz, 10, lg(g, X, Y, X + Wz, Y + Hz, z.rug[0], z.rug[1])), 10, 2, "rgba(0,0,0,.22)");
    rr(g, X + 5, Y + 5, Wz - 10, Hz - 10, 7, "transparent", z.inner, 1.5); g.save(); g.beginPath(); g.roundRect(X + 8, Y + 8, Wz - 16, Hz - 16, 6); g.clip(); g.fillStyle = "rgba(255,255,255,.07)"; for (let py = Y + 14; py < Y + Hz; py += 22) for (let px = X + 14; px < X + Wz; px += 22) { circ(g, px, py, 1.4, "rgba(255,255,255,.16)"); circ(g, px + 11, py + 11, 0.9, "rgba(0,0,0,.05)"); } g.restore(); }
  // 벽 아래 그림자(AO)
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (at(x, y) !== "#") continue; const X = x * TS, Y = y * TS; if (at(x, y + 1) !== "#") { g.fillStyle = lg(g, 0, Y + TS, 0, Y + TS + 14, "rgba(10,10,30,.28)", "rgba(10,10,30,0)"); g.fillRect(X, Y + TS, TS, 14); } if (at(x + 1, y) !== "#") { g.fillStyle = lg(g, X + TS, 0, X + TS + 8, 0, "rgba(10,10,30,.16)", "rgba(10,10,30,0)"); g.fillRect(X + TS, Y, 8, TS); } }
}
/* ── 벽 · 창문 ────────────────────────────────────── */
function walls(g: G, hour: number) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (at(x, y) !== "#") continue; const X = x * TS, Y = y * TS;
    g.fillStyle = lg(g, 0, Y + 14, 0, Y + TS, "#5b5866", "#45424e"); g.fillRect(X, Y + 14, TS, TS - 14);
    g.fillStyle = lg(g, 0, Y, 0, Y + 14, "#7a7684", "#66626f"); g.fillRect(X, Y, TS, 14); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(X, Y, TS, 1.5);
    g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(X, Y + 26, TS, 1); g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(X, Y + 27, TS, 1);
    g.fillStyle = "#2f2c36"; g.fillRect(X, Y + TS - 5, TS, 5); g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(X, Y + TS - 5, TS, 1);
    if (y === 0 && WINDOWS.includes(x)) {
      const sky = skyFor(hour); const wx = X + 5, wy = Y + 6, ww = 38, wh = 34;
      shadow(g, () => rr(g, wx - 2, wy - 2, ww + 4, wh + 4, 5, "#e4e2ee"), 4, 1, "rgba(0,0,0,.3)");
      rr(g, wx, wy, ww, wh, 3, lg(g, 0, wy, 0, wy + wh, sky[0], sky[1]));
      if (hour >= 20 || hour < 5) { g.fillStyle = "#fff"; for (const [sx, sy] of [[8, 8], [26, 6], [16, 14], [31, 18], [11, 22]]) circ(g, wx + sx, wy + sy, 0.9, "rgba(255,255,255,.9)"); circ(g, wx + 29, wy + 10, 4.5, "#f6f1d2"); circ(g, wx + 27, wy + 9, 3.6, sky[0]); }
      if (hour >= 9 && hour < 17) { g.fillStyle = "rgba(255,255,255,.75)"; ell(g, wx + 12, wy + 10, 7, 3.2, "rgba(255,255,255,.75)"); ell(g, wx + 24, wy + 15, 9, 3.4, "rgba(255,255,255,.6)"); }
      g.save(); g.beginPath(); g.roundRect(wx, wy, ww, wh, 3); g.clip(); g.fillStyle = lg(g, wx, wy, wx + ww, wy + wh, "rgba(255,255,255,.28)", "rgba(255,255,255,0)"); g.beginPath(); g.moveTo(wx, wy + 8); g.lineTo(wx + 18, wy); g.lineTo(wx + 26, wy); g.lineTo(wx, wy + 22); g.closePath(); g.fill(); g.restore();
      g.fillStyle = "#e4e2ee"; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh / 2 - 1.5, ww, 3);
      rr(g, wx - 3, wy + wh + 1, ww + 6, 4, 2, lg(g, 0, wy + wh, 0, wy + wh + 5, "#eceaf4", "#b9b6c8"));
      rr(g, wx - 4, wy - 3, 5, wh + 6, 2, lg(g, wx - 4, 0, wx + 1, 0, "#7a6fa0", "#5c527e")); rr(g, wx + ww - 1, wy - 3, 5, wh + 6, 2, lg(g, wx + ww - 1, 0, wx + ww + 4, 0, "#7a6fa0", "#5c527e"));
    }
  }
}
/* ── 가구 ─────────────────────────────────────────── */
export function drawChair(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS;
  shadow(g, () => rr(g, X + 8, Y - 9, 32, 26, 9, lg(g, 0, Y - 9, 0, Y + 17, "#3a3742", "#26242c"), OUT), 5, 2);
  rr(g, X + 11, Y - 6, 26, 19, 7, lg(g, 0, Y - 6, 0, Y + 13, "#4a4752", "#35323c")); g.fillStyle = "rgba(255,255,255,.1)"; g.fillRect(X + 15, Y - 4, 18, 1.5); rr(g, X + 21, Y + 10, 6, 1.6, .8, "#ff6a00");
  rr(g, X + 4, Y + 16, 6, 14, 3, "#2a2830", OUT); rr(g, X + 38, Y + 16, 6, 14, 3, "#2a2830", OUT);
  rr(g, X + 8, Y + 30, 32, 12, 5, lg(g, 0, Y + 30, 0, Y + 42, "#3a3742", "#26242c"), OUT); rr(g, X + 11, Y + 32, 26, 6, 3, "#4a4752");
  rr(g, X + 22, Y + 42, 4, 4, 1, "#1c1a22"); g.strokeStyle = "#1c1a22"; g.lineWidth = 2.5; g.lineCap = "round"; g.beginPath(); g.moveTo(X + 24, Y + 46); g.lineTo(X + 10, Y + 47); g.moveTo(X + 24, Y + 46); g.lineTo(X + 38, Y + 47); g.stroke(); circ(g, X + 10, Y + 47, 1.6, "#3a3742"); circ(g, X + 38, Y + 47, 1.6, "#3a3742");
}
function screenContent(g: G, x: number, y: number, w: number, h: number, screen: string, t: number) {
  if (screen === "design") { const sw = ["#e07a5a", "#3aa88f", "#e8b640", "#b35a8a", "#6c63e0", "#f0efe8"]; for (let i = 0; i < 6; i++) rr(g, x + 2 + (i % 3) * (w / 3), y + 2 + Math.floor(i / 3) * (h / 2 - 2), w / 3 - 3, h / 2 - 5, 2, sw[i]); }
  else if (screen === "growth") { const hs = [.4, .7, .3, .9, .6, .8, .5]; for (let j = 0; j < 7; j++) { const hh = Math.max(2, (hs[j] + Math.sin(t * 1.2 + j) * 0.12) * (h - 6)); rr(g, x + 2 + j * (w / 7), y + h - 2 - hh, w / 7 - 2, hh, 1.5, j % 2 ? "#4fc0bc" : "#8fd6e8"); } }
  else if (screen === "list") { for (let k = 0; k < 4; k++) { rr(g, x + 2, y + 2 + k * (h / 4), w * (0.55 + (k % 2) * 0.2), 2.5, 1, k === 1 ? "#e8a33d" : "#9fe0f0"); circ(g, x + w - 4, y + 3.5 + k * (h / 4), 1.3, "#4fc0bc"); } }
  else if (screen === "grid") { for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) rr(g, x + 2 + a * (w / 4), y + 2 + b * (h / 2), w / 4 - 2.5, h / 2 - 3, 1.5, (a + b) % 3 === 0 ? "#4fc0bc" : "#7fc9de"); }
  else { for (let k = 0; k < 4; k++) rr(g, x + 2, y + 2 + k * (h / 4), w * (0.5 + ((k * 3) % 4) * 0.1), 2.2, 1, "#d7ecf5"); rr(g, x + 2, y + 2 + h / 4, 5, 2.2, 1, "#6c63e0"); if (Math.floor(t * 2) % 2) rr(g, x + w - 6, y + h - 6, 1.5, 4, 0.5, "#8fd6e8"); }
}
export function drawDesk(g: G, x: number, y: number, c: Ctx) {
  const X = x * TS, Y = y * TS, st = c.desk[`${x},${y}`] || { on: false, screen: "doc", mug: "#4b44c4" };
  shadow(g, () => rr(g, X + 1, Y + 12, TS - 2, 30, 6, lg(g, 0, Y + 12, 0, Y + 42, "#fbfaf7", "#e6e2da"), "rgba(60,50,40,.35)"), 8, 4);
  g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(X + 4, Y + 14, TS - 8, 1.5); g.save(); g.beginPath(); g.roundRect(X + 1, Y + 38, TS - 2, 4, [0, 0, 6, 6]); g.fillStyle = "#d9b48a"; g.fill(); g.restore();
  rr(g, X + 3, Y + 42, 4, 5, 1, "#c49a6e"); rr(g, X + 41, Y + 42, 4, 5, 1, "#c49a6e");
  // 서류 · 포스트잇 · 펜꽂이
  g.save(); g.translate(X + 7, Y + 26); g.rotate(-0.08); rr(g, -5, -5, 11, 14, 1.5, "#f6f4ee", OUT, .8); g.fillStyle = "#c4c1cf"; g.fillRect(-3, -2, 6, 1); g.fillRect(-3, 1, 5, 1); g.fillRect(-3, 4, 6, 1); g.restore();
  rr(g, X + 3, Y + 34, 6, 6, 1, "#f5d54c", OUT, .8); rr(g, X + 3, Y + 6, 6, 8, 2, lg(g, 0, Y + 6, 0, Y + 14, "#4a4f6d", "#2f3348"), OUT, .8); g.strokeStyle = "#e05a4a"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(X + 5, Y + 6); g.lineTo(X + 4, Y + 1); g.stroke(); g.strokeStyle = "#6c63e0"; g.beginPath(); g.moveTo(X + 7, Y + 6); g.lineTo(X + 8, Y); g.stroke();
  // 램프
  g.strokeStyle = "#3b3f57"; g.lineWidth = 2; g.lineCap = "round"; g.beginPath(); g.moveTo(X + 42, Y + 20); g.lineTo(X + 42, Y + 8); g.lineTo(X + 37, Y + 4); g.stroke(); rr(g, X + 40, Y + 19, 6, 2.5, 1, "#3b3f57"); g.beginPath(); g.moveTo(X + 31, Y + 6); g.lineTo(X + 43, Y + 6); g.lineTo(X + 40, Y + 1); g.lineTo(X + 34, Y + 1); g.closePath(); g.fillStyle = lg(g, 0, Y + 1, 0, Y + 6, "#ff8a2b", "#e05a00"); g.fill();
  if (c.night && st.on) { g.fillStyle = rg(g, X + 37, Y + 7, 1, 16, "rgba(255,214,140,.55)", "rgba(255,214,140,0)"); g.fillRect(X + 20, Y - 4, 34, 30); }
  // 모니터
  shadow(g, () => rr(g, X + 9, Y - 7, 30, 21, 3.5, lg(g, 0, Y - 7, 0, Y + 14, "#2b2933", "#17161d"), OUT), 5, 2);
  rr(g, X + 11, Y - 5, 26, 17, 2, st.on ? lg(g, 0, Y - 5, 0, Y + 12, "#14232e", "#0d1a24") : "#121218");
  if (st.on) { screenContent(g, X + 11, Y - 5, 26, 17, st.screen, c.t); g.save(); g.beginPath(); g.roundRect(X + 12, Y - 4, 24, 15, 2); g.clip(); g.fillStyle = lg(g, X + 12, Y - 4, X + 36, Y + 11, "rgba(255,255,255,.18)", "rgba(255,255,255,0)"); g.beginPath(); g.moveTo(X + 12, Y + 2); g.lineTo(X + 22, Y - 4); g.lineTo(X + 30, Y - 4); g.lineTo(X + 12, Y + 8); g.fill(); g.restore(); }
  circ(g, X + 35, Y + 12.5, 0.9, st.on ? "#ff8a2b" : "#3a3742"); rr(g, X + 22, Y + 14, 4, 4, 1, "#1c1a22"); rr(g, X + 16, Y + 17, 16, 2.5, 1.2, lg(g, 0, Y + 17, 0, Y + 20, "#3a3742", "#1c1a22"));
  // 키보드 · 마우스 · 머그
  rr(g, X + 12, Y + 29, 20, 7, 2, lg(g, 0, Y + 29, 0, Y + 36, "#f2f0ec", "#d6d2ca"), OUT, .8); g.fillStyle = "#8f8a95"; for (let k = 0; k < 6; k++) { g.fillRect(X + 14 + k * 3, Y + 31, 2, 1.4); g.fillRect(X + 14 + k * 3, Y + 33.2, 2, 1.4); }
  rr(g, X + 34, Y + 30, 5, 7, 2.5, lg(g, 0, Y + 30, 0, Y + 37, "#e2e4ee", "#b9bccb"), OUT, .8);
  shadow(g, () => rr(g, X + 39, Y + 12, 7, 8, 1.5, lg(g, X + 39, 0, X + 46, 0, "#ffffff", "#d9d6e6"), OUT, .8), 3, 1); rr(g, X + 39, Y + 15, 7, 2, .5, st.mug); g.strokeStyle = "#e6e4ee"; g.lineWidth = 1.5; g.beginPath(); g.arc(X + 46.5, Y + 16, 2.2, -Math.PI / 2, Math.PI / 2); g.stroke();
  if (st.on) { g.fillStyle = "rgba(255,255,255,.45)"; for (let i = 0; i < 3; i++) ell(g, X + 41 + i * 2, Y + 8 - ((c.t * 6 + i * 3) % 7), 1.1, 2, "rgba(255,255,255,.4)"); }
}
function bookshelf(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS, top = Y - 30;
  shadow(g, () => rr(g, X + 2, top, TS - 4, 76, 4, lg(g, X, 0, X + TS, 0, "#6e4a2c", "#4f3520"), OUT), 8, 3);
  const books = ["#d9534f", "#3aa88f", "#e8b640", "#6c63e0", "#b35a8a", "#f0efe8", "#2f6fa8", "#e07a5a"];
  for (let s = 0; s < 4; s++) { const sy = top + 4 + s * 18; g.fillStyle = "#8a6340"; g.fillRect(X + 4, sy + 15, TS - 8, 2); for (let i = 0; i < 8; i++) { const h = 11 + ((i + s) % 3) * 1.5; rr(g, X + 5 + i * 4.6, sy + 15 - h, 3.8, h, 1, lg(g, 0, sy, 0, sy + 15, books[(i + s * 3) % 8], "rgba(0,0,0,.35)")); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(X + 6 + i * 4.6, sy + 17 - h, 1, 3); } if (s === 2) { rr(g, X + 26, sy + 6, 14, 9, 1.5, "#3b3f57"); g.fillStyle = "#cfd2de"; g.fillRect(X + 28, sy + 8, 10, 1.2); } }
  ell(g, X + 20, top - 6, 11, 6, "#3f7a4d"); ell(g, X + 14, top - 8, 5, 4, "#5aa66a"); ell(g, X + 27, top - 9, 5, 4, "#5aa66a"); rr(g, X + 15, top - 4, 10, 5, 1.5, "#a8714b", OUT, .8);
}
function couch(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS, top = at(x, y - 1) !== "C"; if (!top) return;
  const h = TS * 2;
  shadow(g, () => rr(g, X + 2, Y + 2, TS - 4, h - 6, 10, lg(g, X, 0, X + TS, 0, "#e07a48", "#c2602f"), OUT), 10, 4);
  rr(g, X + 2, Y + 2, TS - 4, 12, 6, lg(g, 0, Y, 0, Y + 14, "#ee8f5e", "#dc7546")); for (let i = 0; i < 4; i++) { rr(g, X + 9, Y + 14 + i * 20, 30, 17, 6, lg(g, 0, Y + 14 + i * 20, 0, Y + 31 + i * 20, "#f39d6d", "#e58455")); g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(X + 13, Y + 17 + i * 20, 22, 1.5); }
  rr(g, X + 2, Y + 8, 7, h - 14, 4, lg(g, X, 0, X + 9, 0, "#e58455", "#c2602f")); rr(g, X + 39, Y + 8, 7, h - 14, 4, lg(g, X + 39, 0, X + 46, 0, "#e58455", "#c2602f"));
  rr(g, X + 6, Y + h - 6, 5, 4, 1, "#1c1e2c"); rr(g, X + 37, Y + h - 6, 5, 4, 1, "#1c1e2c");
}
function coffee(g: G, x: number, y: number, c: Ctx) {
  const X = x * TS, Y = y * TS;
  shadow(g, () => rr(g, X + 1, Y + 16, TS - 2, 27, 4, lg(g, 0, Y + 16, 0, Y + 43, "#8a6340", "#6b4a2f"), OUT), 6, 3); g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(X + 4, Y + 18, TS - 8, 1.5);
  shadow(g, () => rr(g, X + 7, Y - 10, 24, 30, 4, lg(g, X + 7, 0, X + 31, 0, "#3b3f5c", "#22243a"), OUT), 4, 2);
  rr(g, X + 10, Y - 7, 18, 6, 2, "#1c1e2c"); rr(g, X + 12, Y - 5.5, 8, 2.5, 1, "#8fd6e8"); circ(g, X + 13, Y + 2, 1.5, "#e8a33d"); circ(g, X + 19, Y + 2, 1.5, "#4fc0bc"); circ(g, X + 25, Y + 2, 1.5, "#e9736a");
  rr(g, X + 10, Y + 6, 18, 8, 2, "#141626"); rr(g, X + 16, Y + 6, 6, 3, 1, "#3b3f57"); rr(g, X + 15, Y + 10, 8, 7, 2, "#f6f4ee", OUT, .8); rr(g, X + 15, Y + 12.5, 8, 2, .5, "#c9612b"); rr(g, X + 9, Y + 17, 20, 3, 1.5, "#3b3f57");
  for (let i = 0; i < 3; i++) rr(g, X + 33 + (i % 2) * 2, Y + 4 + i * 5, 10, 5, 2, lg(g, 0, Y, 0, Y + 6, "#ffffff", "#d9d6e6"), OUT, .8);
  g.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 3; i++) ell(g, X + 17 + i * 2.5, Y + 6 - ((c.t * 7 + i * 3) % 8), 1.1, 2.2, "rgba(255,255,255,.45)");
}
function cooler(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS;
  shadow(g, () => rr(g, X + 12, Y + 12, 24, 34, 5, lg(g, X + 12, 0, X + 36, 0, "#f0eef6", "#c6c3d4"), OUT), 6, 3);
  rr(g, X + 15, Y + 24, 18, 8, 2.5, "#2f3348"); circ(g, X + 19, Y + 28, 1.6, "#4fc0bc"); circ(g, X + 29, Y + 28, 1.6, "#e9736a"); rr(g, X + 17, Y + 36, 14, 2, 1, "#9e9bab");
  shadow(g, () => rr(g, X + 14, Y - 14, 20, 26, 7, lg(g, X + 14, 0, X + 34, 0, "#9fd3f5", "#5aa6dc"), OUT), 4, 2); rr(g, X + 17, Y - 11, 5, 16, 2.5, "rgba(255,255,255,.45)"); rr(g, X + 19, Y - 18, 10, 5, 2, "#4b8fd6");
}
function plant(g: G, x: number, y: number, v: number) {
  const X = x * TS, Y = y * TS;
  if (v === 0) { shadow(g, () => rr(g, X + 14, Y + 26, 20, 18, 4, lg(g, X + 14, 0, X + 34, 0, "#b07a4f", "#8a5a3c"), OUT), 5, 3); rr(g, X + 12, Y + 24, 24, 5, 2, "#c58a5c", OUT, .8);
    for (const [dx, dy, rx, ry, col] of [[24, 12, 14, 9, "#3f7a4d"], [14, 8, 8, 6, "#4f9a5f"], [34, 6, 8, 6, "#4f9a5f"], [24, 2, 7, 6, "#6ab87a"], [18, 18, 6, 4, "#2e5c3a"], [31, 17, 6, 4, "#2e5c3a"]] as [number, number, number, number, string][]) ell(g, X + dx, Y + dy, rx, ry, col); g.fillStyle = "rgba(255,255,255,.22)"; ell(g, X + 21, Y + 3, 2.5, 1.4, "rgba(255,255,255,.3)"); ell(g, X + 12, Y + 7, 2, 1.2, "rgba(255,255,255,.3)"); }
  else if (v === 1) { shadow(g, () => rr(g, X + 16, Y + 24, 16, 22, 4, lg(g, X + 16, 0, X + 32, 0, "#f0eef6", "#c6c3d4"), OUT), 5, 3); g.strokeStyle = "#3f7a4d"; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.moveTo(X + 24, Y + 24); g.lineTo(X + 24, Y - 4); g.stroke(); for (const [dx, dy, r] of [[14, 4, 6], [34, 10, 6], [16, 14, 5], [33, 20, 4], [24, -8, 6]] as [number, number, number][]) { ell(g, X + dx, Y + dy, r + 2, r - 1, "#3f7a4d"); ell(g, X + dx - 1, Y + dy - 1, r - 1, r - 2.5, "#6ab87a"); } }
  else { shadow(g, () => rr(g, X + 16, Y + 28, 16, 14, 3, lg(g, X + 16, 0, X + 32, 0, "#e88a6a", "#c9612b"), OUT), 4, 2); rr(g, X + 15, Y + 26, 18, 4, 1.5, "#f0a080", OUT, .8); for (const [dx, dy, rx, ry, col] of [[24, 18, 8, 7, "#4f9a5f"], [17, 20, 5, 4, "#3f7a4d"], [31, 19, 5, 4, "#3f7a4d"], [24, 12, 4, 4, "#6ab87a"]] as [number, number, number, number, string][]) ell(g, X + dx, Y + dy, rx, ry, col); }
}
function server(g: G, x: number, y: number, c: Ctx) {
  const X = x * TS, Y = y * TS, t = c.t;
  shadow(g, () => rr(g, X + 4, Y - 22, 40, 68, 4, lg(g, X + 4, 0, X + 44, 0, "#262a44", "#161829"), OUT), 8, 3);
  for (let u = 0; u < 6; u++) { const uy = Y - 18 + u * 10.5; rr(g, X + 7, uy, 34, 9, 2, lg(g, 0, uy, 0, uy + 9, "#343854", "#22253a")); rr(g, X + 24, uy + 2.5, 14, 4, 1, "#1c1e2c"); for (let k = 0; k < 5; k++) g.fillRect(X + 25.5 + k * 2.6, uy + 4, 1.2, 1.2); const on = Math.floor(t * (2 + u)) % 2 === 0; g.save(); g.shadowColor = on ? "#4fc0bc" : "transparent"; g.shadowBlur = 6; circ(g, X + 11, uy + 4.5, 1.5, on ? "#5ff0eb" : "#1f5a58"); g.restore(); g.save(); const amber = u === 5; g.shadowColor = amber ? (c.apiDown ? "#e9736a" : "#e8a33d") : "#4fc0bc"; g.shadowBlur = 6; circ(g, X + 16, uy + 4.5, 1.5, amber ? (c.apiDown ? "#ff8a80" : "#ffc060") : (Math.floor(t * 3 + u) % 2 ? "#5ff0eb" : "#1f5a58")); g.restore(); }
}
function booth(g: G, x: number, y: number) {
  const X = x * TS, Y = y * TS;
  shadow(g, () => rr(g, X + 3, Y - 18, 42, 62, 6, lg(g, X + 3, 0, X + 45, 0, "#343854", "#22253a"), OUT), 8, 3);
  rr(g, X + 7, Y - 12, 34, 46, 4, "rgba(150,215,235,.45)"); g.save(); g.beginPath(); g.roundRect(X + 7, Y - 12, 34, 46, 4); g.clip(); g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.moveTo(X + 7, Y + 10); g.lineTo(X + 25, Y - 12); g.lineTo(X + 33, Y - 12); g.lineTo(X + 7, Y + 20); g.fill(); g.restore();
  rr(g, X + 23, Y - 12, 2, 46, 1, "#3b3f57"); rr(g, X + 36, Y + 8, 3, 6, 1.5, "#e8a33d");
  rr(g, X + 12, Y - 17, 24, 7, 3.5, "#1c1e2c"); g.font = "800 6px Nunito, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ff8a80"; g.fillText("ON AIR", X + 24, Y - 13.5);
}
export function reception(g: G, x: number, y: number) {
  const X = x * TS - 24, Y = y * TS;
  shadow(g, () => rr(g, X, Y + 6, 96, 34, 12, lg(g, 0, Y + 6, 0, Y + 40, "#ff7a12", "#d95400"), OUT), 10, 4);
  rr(g, X, Y + 6, 96, 8, { tl: 12, tr: 12, bl: 0, br: 0 } as unknown as number, lg(g, 0, Y + 6, 0, Y + 14, "#ff9a3c", "#ff7a12")); g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(X + 8, Y + 8, 80, 1.5);
  g.font = FONT; g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#f6f4ee"; g.fillText("DANA", X + 10, Y + 27); g.font = "700 7px Nunito, sans-serif"; g.fillStyle = "rgba(255,255,255,.7)"; g.fillText("OFFICE", X + 10, Y + 35);
  rr(g, X + 60, Y + 18, 28, 16, 3, "#f6f4ee", OUT, .8); rr(g, X + 63, Y + 21, 6, 10, 1.5, "#ff6a00"); g.fillStyle = "#d95400"; g.fillRect(X + 72, Y + 23, 12, 1.5); g.fillRect(X + 72, Y + 26.5, 12, 1.5); g.fillRect(X + 72, Y + 30, 8, 1.5);
  circ(g, X + 90, Y + 11, 3, "#ffc060"); ell(g, X - 2, Y + 4, 8, 6, "#3f7a4d"); ell(g, X - 4, Y + 1, 4, 3, "#6ab87a"); rr(g, X - 5, Y + 8, 7, 5, 1.5, "#a8714b", OUT, .8);
}
function door(g: G, x: number, y: number, open: boolean) {
  const X = x * TS, Y = y * TS;
  g.fillStyle = lg(g, 0, Y, 0, Y + TS, "#3a3d55", "#2a2c40"); g.fillRect(X, Y, TS, TS);
  rr(g, X + 18, Y + 2, 12, 5, 2.5, "#1c1e2c"); circ(g, X + 24, Y + 4.5, 1.6, "#5ff0eb");
  if (open) { rr(g, X + 8, Y + 8, 34, 38, 3, "#cfd0dc"); rr(g, X + 3, Y + 8, 6, 38, 2, lg(g, X + 3, 0, X + 9, 0, "#a06f45", "#6b4a2f"), OUT); }
  else { shadow(g, () => rr(g, X + 8, Y + 8, 34, 38, 3, lg(g, X + 8, 0, X + 42, 0, "#9a6a44", "#6b4a2f"), OUT), 4, 2); rr(g, X + 12, Y + 12, 26, 13, 2, "rgba(0,0,0,.18)"); rr(g, X + 12, Y + 28, 26, 13, 2, "rgba(0,0,0,.18)"); rr(g, X + 34, Y + 24, 5, 2.5, 1.2, "#ffc060"); }
  rr(g, X + 42, Y + 8, 4, 38, 1, "#4a4d66");
}
function meetingTable(g: G) {
  const X = 17 * TS, Y = 8 * TS;
  shadow(g, () => rr(g, X + 4, Y + 4, TS * 3 - 8, TS * 2 - 8, 20, lg(g, X, Y, X + TS * 3, Y + TS * 2, "#a58255", "#7d5f3c"), OUT), 14, 6);
  rr(g, X + 9, Y + 9, TS * 3 - 18, TS * 2 - 18, 16, "transparent", "rgba(255,255,255,.14)", 2);
  // 노트북 · 서류 · 컵 · 화분
  g.save(); g.translate(X + 72, Y + 40); g.rotate(-0.15); rr(g, -16, -10, 32, 20, 3, lg(g, 0, -10, 0, 10, "#3b3f5c", "#22253a"), OUT); rr(g, -13, -7, 26, 14, 2, "#8fd6e8"); g.fillStyle = "#d7ecf5"; g.fillRect(-10, -4, 14, 1.5); g.fillRect(-10, -1, 10, 1.5); g.fillRect(-10, 2, 12, 1.5); rr(g, -16, 10, 32, 5, 2, "#1c1e2c"); g.restore();
  g.save(); g.translate(X + 26, Y + 62); g.rotate(0.12); rr(g, -9, -12, 18, 24, 1.5, "#f6f4ee", OUT, .8); g.fillStyle = "#c4c1cf"; for (let i = 0; i < 5; i++) g.fillRect(-6, -8 + i * 4, 12 - (i % 2) * 4, 1.2); g.restore();
  for (const [cx, cy, col] of [[X + 116, Y + 24, "#6c63e0"], [X + 122, Y + 70, "#c9612b"]] as [number, number, string][]) { shadow(g, () => circ(g, cx, cy, 5.5, lg(g, cx - 5, 0, cx + 5, 0, "#ffffff", "#d9d6e6"), OUT, .8), 3, 1); circ(g, cx, cy, 3.6, col); circ(g, cx - 1.3, cy - 1.3, 1.2, "rgba(255,255,255,.7)"); }
  ell(g, X + 72, Y + 74, 9, 6, "#3f7a4d"); ell(g, X + 68, Y + 70, 4, 3, "#6ab87a"); ell(g, X + 77, Y + 71, 4, 3, "#6ab87a"); rr(g, X + 67, Y + 77, 10, 5, 1.5, "#a8714b", OUT, .8);
}
function stool(g: G, x: number, y: number) { const X = x * TS, Y = y * TS; shadow(g, () => circ(g, X + 24, Y + 32, 11, lg(g, X + 13, 0, X + 35, 0, "#525880", "#3b3f5c"), OUT), 6, 3); circ(g, X + 24, Y + 32, 7.5, "#4b5078"); g.fillStyle = "rgba(255,255,255,.14)"; ell(g, X + 21, Y + 29, 3, 1.6, "rgba(255,255,255,.18)"); }
function bin(g: G, x: number, y: number) { const X = x * TS, Y = y * TS; shadow(g, () => rr(g, X + 15, Y + 16, 18, 24, 4, lg(g, X + 15, 0, X + 33, 0, "#8a8fa3", "#6e7387"), OUT), 5, 3); rr(g, X + 13, Y + 14, 22, 5, 2.5, "#9ea3b7", OUT, .8); rr(g, X + 17, Y + 10, 8, 4, 1.5, "#f6f4ee"); g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(X + 27, Y + 19, 5, 20); }
function sideTable(g: G, x: number, y: number) { const X = x * TS, Y = y * TS; shadow(g, () => rr(g, X + 10, Y + 20, 28, 14, 4, lg(g, 0, Y + 20, 0, Y + 34, "#8a6340", "#6b4a2f"), OUT), 5, 3); rr(g, X + 13, Y + 34, 4, 10, 1, "#4a3220"); rr(g, X + 31, Y + 34, 4, 10, 1, "#4a3220"); g.strokeStyle = "#3b3f57"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X + 24, Y + 20); g.lineTo(X + 24, Y + 8); g.stroke(); g.beginPath(); g.moveTo(X + 13, Y + 8); g.lineTo(X + 35, Y + 8); g.lineTo(X + 31, Y - 2); g.lineTo(X + 17, Y - 2); g.closePath(); g.fillStyle = lg(g, 0, Y - 2, 0, Y + 8, "#ffd27a", "#e8a33d"); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke(); rr(g, X + 30, Y + 13, 6, 7, 1.5, "#f6f4ee", OUT, .8); rr(g, X + 30, Y + 15.5, 6, 1.6, .5, "#6c63e0"); }

function decor(g: G) {
  // 대표실 화이트보드
  shadow(g, () => rr(g, 2 * TS + 4, 6, 88, 34, 4, "#f7f6fb", OUT), 4, 2); g.strokeStyle = "#b9b6c8"; g.lineWidth = 1.4; g.lineCap = "round"; g.beginPath(); g.moveTo(2 * TS + 12, 16); g.lineTo(2 * TS + 40, 16); g.moveTo(2 * TS + 12, 23); g.lineTo(2 * TS + 66, 23); g.moveTo(2 * TS + 12, 30); g.lineTo(2 * TS + 30, 30); g.stroke(); rr(g, 2 * TS + 58, 11, 20, 7, 2, "#6c63e0"); rr(g, 2 * TS + 66, 26, 20, 10, 2, "#e05a4a"); rr(g, 2 * TS + 69, 29, 14, 4, 1.5, "#f7f6fb"); rr(g, 2 * TS + 4, 38, 88, 3, 1, "#c6c3d4"); rr(g, 2 * TS + 70, 37, 12, 3, 1, "#6c63e0"); rr(g, 2 * TS + 56, 37, 8, 3, 1, "#e05a4a");
  // 무드보드
  shadow(g, () => rr(g, 8 * TS + 4, 4, 5 * TS - 8, 38, 4, lg(g, 0, 4, 0, 42, "#8f6a45", "#6e4f33"), OUT), 4, 2);
  const arts = ["#e07a5a", "#3aa88f", "#e8b640", "#b35a8a", "#6c63e0", "#2f6fa8", "#f0efe8", "#5aa66a"];
  for (let a = 0; a < 8; a++) { g.save(); g.translate(8 * TS + 18 + a * 28, 22 + (a % 3) * 3); g.rotate(((a % 3) - 1) * 0.08); shadow(g, () => rr(g, -11, -10, 22, 20, 2, "#f6f4ee", OUT, .8), 3, 1); rr(g, -9, -8, 18, 13, 1.5, lg(g, -9, -8, 9, 5, arts[a], "rgba(0,0,0,.25)")); rr(g, -7, -6, 6, 3, 1, "rgba(255,255,255,.45)"); circ(g, 0, -10, 2, "#ffc060", OUT, .8); g.restore(); }
  // 세일즈 보드
  shadow(g, () => rr(g, 17 * TS + 4, 6, 2 * TS - 8, 34, 4, lg(g, 0, 6, 0, 40, "#262a44", "#161829"), OUT), 4, 2); const bars = [.4, .7, .3, .9, .6, .8]; for (let i = 0; i < 6; i++) rr(g, 17 * TS + 10 + i * 9, 34 - 24 * bars[i], 6, 24 * bars[i], 1.5, i % 2 ? "#4fc0bc" : "#8fd6e8"); g.fillStyle = "#ffc060"; g.fillRect(17 * TS + 66, 12, 18, 2); g.fillRect(17 * TS + 66, 18, 14, 2); g.fillStyle = "#cfd2de"; g.fillRect(17 * TS + 66, 24, 16, 2); g.fillRect(17 * TS + 66, 30, 10, 2);
  // 시계
  shadow(g, () => circ(g, 6 * TS + 24, 22, 14, "#f7f6fb", OUT, 1.2), 4, 2); circ(g, 6 * TS + 24, 22, 11.5, "transparent", "#e0dee8", 1); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = i % 3 === 0 ? "#2b2e42" : "#b9b6c8"; g.beginPath(); g.arc(6 * TS + 24 + Math.sin(a) * 10.5, 22 - Math.cos(a) * 10.5, i % 3 === 0 ? 1.1 : 0.7, 0, Math.PI * 2); g.fill(); }
  // 갤러리 액자 (파티션 x6)
  for (let f = 0; f < 3; f++) { const fy = (7 + f) * TS + 8; shadow(g, () => rr(g, 6 * TS + 6, fy, 36, 30, 3, lg(g, 0, fy, 0, fy + 30, "#6e4f33", "#4f3520"), OUT), 4, 2); rr(g, 6 * TS + 9, fy + 3, 30, 24, 2, "#f6f4ee"); rr(g, 6 * TS + 11, fy + 5, 26, 20, 1.5, lg(g, 6 * TS + 11, fy + 5, 6 * TS + 37, fy + 25, arts[(f + 2) % 8], "rgba(0,0,0,.3)")); rr(g, 6 * TS + 13, fy + 7, 8, 4, 1.5, "rgba(255,255,255,.45)"); }
  // 그로스 벽 모니터 프레임
  shadow(g, () => rr(g, 15 * TS + 5, 8 * TS + 6, 38, 30, 4, lg(g, 0, 8 * TS + 6, 0, 8 * TS + 36, "#2f3350", "#1c1f33"), OUT), 5, 2); rr(g, 15 * TS + 8, 8 * TS + 9, 32, 24, 2, "#0f2a3a"); rr(g, 15 * TS + 20, 8 * TS + 36, 8, 4, 1.5, "#1c1e2c");
  // 하단 벽 회사 사인
  g.save(); g.shadowColor = "rgba(255,138,43,.85)"; g.shadowBlur = 14; g.font = "800 22px Nunito, 'IBM Plex Sans KR', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffd7b3"; g.fillText("DANA OFFICE", W / 2 + 10, 12 * TS + 25); g.restore(); rr(g, W / 2 - 86, 12 * TS + 14, 12, 22, 3, "#ff6a00"); rr(g, W / 2 - 83, 12 * TS + 18, 6, 14, 2, "#fff3e6");
}

/* ── 정적 배경 (시간대 바뀔 때 1회) ─────────────────── */
export function buildBackground(bg: HTMLCanvasElement, hour: number) {
  bg.width = W * BG_Q; bg.height = H * BG_Q; const g = bg.getContext("2d")!; g.setTransform(BG_Q, 0, 0, BG_Q, 0, 0);
  g.fillStyle = "#0b0c14"; g.fillRect(0, 0, W, H);
  floors(g);
  if (hour >= 8 && hour < 17) for (const wx of WINDOWS) { g.fillStyle = lg(g, 0, TS, 0, TS * 3.5, "rgba(255,246,210,.22)", "rgba(255,246,210,0)"); g.beginPath(); g.moveTo(wx * TS + 4, TS); g.lineTo(wx * TS + 44, TS); g.lineTo(wx * TS + 60, TS * 3.5); g.lineTo(wx * TS - 12, TS * 3.5); g.closePath(); g.fill(); }
  walls(g, hour); decor(g);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = at(x, y); if (c === "B") bookshelf(g, x, y); else if (c === "C") couch(g, x, y); else if (c === "W") cooler(g, x, y); else if (c === "P") plant(g, x, y, (x + y) % 2); else if (c === "O") booth(g, x, y); }
  meetingTable(g); for (const s of WANDER.meet) stool(g, s[0], s[1]);
  bin(g, 1, 4); bin(g, 14, 4); bin(g, 14, 10); sideTable(g, 1, 10); plant(g, 20, 7, 1); plant(g, 5, 7, 2);
}
/* ── 동적 (매 프레임, 월드 좌표) ─────────────────────── */
export function drawDynamic(g: G, c: Ctx, simMin: number, skipDesks?: Set<string>) {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const ch = at(x, y); if (ch === "D") { if (!skipDesks?.has(`${x},${y}`)) drawDesk(g, x, y, c); } else if (ch === "K") coffee(g, x, y, c); else if (ch === "S") server(g, x, y, c); else if (ch === "E") door(g, x, y, c.doorOpen); }
  reception(g, 10, 6);
  for (let b = 0; b < 7; b++) { const hh = Math.max(2, 10 + Math.sin(c.t * 0.9 + b * 1.3) * 6); rr(g, 15 * TS + 10 + b * 4.2, 8 * TS + 31 - hh, 3, hh, 1, b % 2 ? "#4fc0bc" : "#8fd6e8"); }
  const cx = 6 * TS + 24, cy = 22, ang = ((simMin / 60) % 12) / 12 * Math.PI * 2, mang = (simMin % 60) / 60 * Math.PI * 2;
  g.strokeStyle = "#2b2e42"; g.lineCap = "round"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(ang) * 6, cy - Math.cos(ang) * 6); g.stroke(); g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(mang) * 9, cy - Math.cos(mang) * 9); g.stroke(); circ(g, cx, cy, 1.4, "#e05a4a");
}
export function drawLight(g: G, hour: number, lamps: [number, number][], monitors: [number, number][], zonesLit: { x1: number; y1: number; x2: number; y2: number }[]) {
  const a = nightAlpha(hour); if (a <= 0) return;
  g.fillStyle = hour >= 4 && hour < 8 ? "#2a2148" : "#0b1030"; g.globalAlpha = a; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = "lighter";
  for (const z of zonesLit) { const cx = (z.x1 + z.x2 + 1) / 2 * TS, cy = (z.y1 + z.y2 + 1) / 2 * TS; g.fillStyle = rg(g, cx, cy, 10, 190, "rgba(255,235,190,.18)", "rgba(255,235,190,0)"); g.fillRect(cx - 200, cy - 200, 400, 400); }
  for (const t of lamps) { const cx = t[0] * TS + 37, cy = t[1] * TS + 8; g.fillStyle = rg(g, cx, cy, 2, 70, "rgba(255,200,110,.5)", "rgba(255,200,110,0)"); g.fillRect(cx - 72, cy - 72, 144, 144); }
  for (const t of monitors) { const cx = t[0] * TS + 24, cy = t[1] * TS + 4; g.fillStyle = rg(g, cx, cy, 2, 40, "rgba(143,214,232,.42)", "rgba(143,214,232,0)"); g.fillRect(cx - 42, cy - 42, 84, 84); }
  for (const wx of WINDOWS) { g.fillStyle = lg(g, 0, TS, 0, TS * 3, "rgba(170,190,255,.16)", "rgba(170,190,255,0)"); g.fillRect(wx * TS + 2, TS, 44, TS * 2); }
  g.globalCompositeOperation = "source-over";
}
export function deskStatesFor(actors: ActorSnap[]): { desk: Record<string, DeskState>; lamps: [number, number][]; mons: [number, number][]; zonesLit: typeof ZONES } {
  const desk: Record<string, DeskState> = {}, lamps: [number, number][] = [], mons: [number, number][] = [], zonesLit: typeof ZONES = []; const seen = new Set<string>();
  for (const a of actors) { const d: [number, number] = [a.seat[0], a.seat[1] + 1]; const working = a.present && (a.kind === "human" || (a.state === "work" && a.queue > 0)) && !a.moving && a.x === a.seat[0] && a.y === a.seat[1]; if (at(d[0], d[1]) === "D") desk[`${d[0]},${d[1]}`] = { on: working, screen: a.screen, mug: a.look.top[0] }; if (working) { lamps.push(d); mons.push(d); const z = inZone(a.x, a.y); if (z && !seen.has(z.key)) { seen.add(z.key); zonesLit.push(z); } } }
  return { desk, lamps, mons, zonesLit };
}
export { ENTRANCE };
