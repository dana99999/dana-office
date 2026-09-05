/** HD 벡터 캐릭터 — 모던 캐주얼 게임 스타일 (안티앨리어싱, 그라디언트, 소프트 아웃라인) */
import type { Look } from "../types";
export type Dir = "up" | "down" | "left" | "right";
export type Pose = "idle" | "walk" | "type" | "coffee" | "sleep" | "blink" | "talk";
type G = CanvasRenderingContext2D;
export interface CharOpts { dir: Dir; pose: Pose; phase: number; size: number; }

const OUT = "rgba(22,22,36,.55)";
function rr(g: G, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string | null, lw = 1.1) {
  g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
function circ(g: G, x: number, y: number, r: number, fill: string | CanvasGradient, stroke?: string | null, lw = 1.1) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function ell(g: G, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, stroke?: string | null, lw = 1.1) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function lg(g: G, x0: number, y0: number, x1: number, y1: number, a: string, b: string) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
function irisColor(hair: string): [string, string] {
  const n = parseInt(hair.slice(1), 16); const r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  const warm = r > b; // 따뜻한 머리색 → 갈색 눈, 차가운/검은 머리 → 짙은 회갈색
  return warm ? ["#5a3a26", "#8a5a3a"] : ["#3a3038", "#5c4a52"];
}
function lighten(hex: string, amt: number) { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, ((n >> 16) & 255) + amt), gg = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt); return `rgb(${r},${gg},${b})`; }

/**
 * (cx, feetY) 기준. size = 타일 크기(48 기준 스케일).
 */
export function drawCharacter(g: G, L: Look, cx: number, feetY: number, o: CharOpts) {
  const s = o.size / 48; const ph = o.phase; const walking = o.pose === "walk";
  const swing = walking ? Math.sin(ph * Math.PI * 2) : 0; const bob = walking ? Math.abs(Math.cos(ph * Math.PI * 2)) * 1.4 * s : (o.pose === "idle" || o.pose === "type" ? Math.sin(ph * Math.PI * 2) * 0.6 * s : 0);
  const side = o.dir === "left" || o.dir === "right", back = o.dir === "up", flip = o.dir === "left";
  g.save(); g.translate(cx, feetY); if (flip) g.scale(-1, 1); g.scale(s, s); g.translate(0, -46 - bob / s);
  // 그림자
  g.save(); g.filter = "blur(1.2px)"; ell(g, 0, 46 + bob / s, 12.5, 4, "rgba(10,10,24,.30)"); g.restore();
  const skin = L.skin[0], skinSh = L.skin[1], top = L.top[0], topSh = L.top[1], hair = L.hair_c[0], hairSh = L.hair_c[1], pants = L.bottom[0], pantsSh = L.bottom[1], shoe = L.shoe[0], shoeHi = L.shoe[1];
  const capC = L.cap || ["#3f3a8f", "#2c2866"];
  // 뒷머리(롱) — 몸 뒤
  if (L.hair === "long" && !side) { rr(g, -12.5, 2, 25, 26, 9, lg(g, 0, 2, 0, 28, hair, hairSh), OUT); }
  if (L.hair === "long" && side) { rr(g, -13, 4, 14, 24, 7, lg(g, 0, 4, 0, 28, hair, hairSh), OUT); }
  // 다리
  const legDy = swing * 2.2; const lw = side ? 6.5 : 7;
  const legL = side ? -5 : -8.5, legR = side ? -1 : 1.5;
  rr(g, legL, 30 - Math.max(0, legDy), lw, 13 + Math.max(0, legDy) * 0.3, 3, lg(g, 0, 30, 0, 43, pants, pantsSh), OUT);
  rr(g, legR, 30 - Math.max(0, -legDy), lw, 13 + Math.max(0, -legDy) * 0.3, 3, lg(g, 0, 30, 0, 43, pants, pantsSh), OUT);
  rr(g, legL - 1, 41 - Math.max(0, legDy), lw + 2, 5.5, 2.5, shoe, OUT); rr(g, legR - 1, 41 - Math.max(0, -legDy), lw + 2, 5.5, 2.5, shoe, OUT);
  rr(g, legL + 0.5, 41.5 - Math.max(0, legDy), lw - 1, 1.5, 1, shoeHi); rr(g, legR + 0.5, 41.5 - Math.max(0, -legDy), lw - 1, 1.5, 1, shoeHi);
  // 몸통
  const bw = side ? 17 : 22, bx = -bw / 2;
  rr(g, bx, 17, bw, 16.5, 6, lg(g, bx, 17, bx + bw, 33, lighten(top, 14), topSh), OUT);
  // 의상 디테일
  if (!back) {
    if (L.outfit === "blazer") {
      if (!side) { g.fillStyle = L.shirt || "#f4f4f8"; g.beginPath(); g.moveTo(-5.5, 17); g.lineTo(5.5, 17); g.lineTo(0, 28); g.closePath(); g.fill(); g.fillStyle = topSh; g.beginPath(); g.moveTo(-9, 17); g.lineTo(-4.5, 17); g.lineTo(-1, 28); g.lineTo(-4, 30); g.closePath(); g.fill(); g.beginPath(); g.moveTo(9, 17); g.lineTo(4.5, 17); g.lineTo(1, 28); g.lineTo(4, 30); g.closePath(); g.fill(); rr(g, -1.5, 18, 3, 9.5, 1.2, L.accent || "#c0392b"); }
      else { rr(g, 3, 17, 4.5, 10, 1.5, L.shirt || "#f4f4f8"); rr(g, 4.2, 19, 2, 6, 1, L.accent || "#c0392b"); }
      rr(g, bx, 31, bw, 2.5, 1, "rgba(0,0,0,.12)");
    } else if (L.outfit === "hoodie") {
      rr(g, side ? -8 : -12, 13.5, side ? 15 : 24, 7, 4, topSh, OUT); rr(g, side ? -5 : -8, 27, side ? 11 : 16, 5, 2.5, "rgba(0,0,0,.14)");
      g.strokeStyle = L.accent || "#f4f1ea"; g.lineWidth = 1.3; g.lineCap = "round"; if (!side) { g.beginPath(); g.moveTo(-3, 19); g.lineTo(-3.5, 26); g.moveTo(3, 19); g.lineTo(3.5, 26); g.stroke(); } else { g.beginPath(); g.moveTo(5, 19); g.lineTo(5.5, 25); g.stroke(); }
    } else if (L.outfit === "vest") {
      if (!side) { rr(g, -5, 17, 10, 16.5, 2, L.shirt || "#f4f4f8"); g.fillStyle = L.accent || "#1c1c24"; for (const y of [21, 25, 29]) circ(g, 0, y, 0.9, L.accent || "#1c1c24"); } else { rr(g, 3.5, 17, 5, 16.5, 2, L.shirt || "#f4f4f8"); }
    } else { if (!side) { rr(g, -5.5, 21.5, 11, 5, 2, L.accent || "#f4f1ea"); g.beginPath(); g.arc(0, 17.5, 4, 0, Math.PI); g.fillStyle = skinSh; g.fill(); } else rr(g, 1, 21.5, 6, 5, 2, L.accent || "#f4f1ea"); }
  }
  // 팔
  const armSw = o.pose === "type" ? 0 : swing * 18;
  const arm = (ax: number, sign: number, ang: number, front: boolean) => {
    g.save(); g.translate(ax, 19); g.rotate((ang * Math.PI) / 180 * sign);
    if (o.pose === "type" && !back) { g.rotate(sign * -0.55); }
    rr(g, -3, 0, 6, 13, 3, lg(g, 0, 0, 0, 13, front ? lighten(top, 10) : topSh, topSh), OUT); circ(g, 0, 13.5, 3.2, lg(g, 0, 11, 0, 16, skin, skinSh), OUT); g.restore();
  };
  if (side) { arm(3, 1, -armSw, true); }
  else { arm(-12.5, 1, armSw, false); arm(12.5, 1, -armSw, true); }
  if (o.pose === "coffee" && !back) { const cy = ph > 0.5 ? 14 : 22; g.save(); rr(g, side ? 5 : 14, cy, 6.5, 7.5, 2, "#f6f4ee", OUT); rr(g, side ? 5 : 14, cy + 2.5, 6.5, 2, 1, L.top[0]); g.strokeStyle = OUT; g.lineWidth = 1.1; g.beginPath(); g.arc(side ? 12 : 21, cy + 3.7, 2, -Math.PI / 2, Math.PI / 2); g.stroke(); g.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 2; i++) ell(g, (side ? 7 : 16) + i * 3, cy - 3 - ((ph * 8 + i * 2) % 4), 0.9, 1.6, "rgba(255,255,255,.45)"); g.restore(); }
  // 목
  rr(g, -3.2, 15.5, 6.4, 4, 2, lg(g, 0, 15, 0, 20, skin, skinSh));
  // 머리
  const hx = side ? 1 : 0;
  circ(g, hx, 9.5, 10.8, lg(g, -6, 0, 6, 20, lighten(skin, 8), skinSh), OUT);
  if (!back) { circ(g, side ? -9.6 : -10.6, 11.5, 1.8, lg(g, 0, 10, 0, 13, skin, skinSh), OUT, .9); if (!side) circ(g, 10.6, 11.5, 1.8, lg(g, 0, 10, 0, 13, skin, skinSh), OUT, .9); }
  // 얼굴
  if (!back) {
    const eyeXs = side ? [5.5] : [-4.5, 4.5];
    const closed = o.pose === "sleep" || o.pose === "blink";
    const irisC = irisColor(hair);
    for (const ex of eyeXs) {
      const ey = 11.9;
      if (closed) { g.strokeStyle = "#3a2d33"; g.lineWidth = 1.2; g.lineCap = "round"; g.beginPath(); g.moveTo(ex - 2.1, ey - 0.2); g.quadraticCurveTo(ex, ey + 1.2, ex + 2.1, ey - 0.2); g.stroke(); }
      else {
        // 아몬드형 눈 — 윗눈꺼풀이 살짝 덮은 자연스러운 눈
        g.save(); g.beginPath(); g.moveTo(ex - 2.3, ey); g.quadraticCurveTo(ex, ey - 2.3, ex + 2.3, ey); g.quadraticCurveTo(ex, ey + 1.9, ex - 2.3, ey); g.closePath(); g.fillStyle = "#f8f6f3"; g.fill(); g.clip();
        const ir = g.createRadialGradient(ex + 0.2, ey + 0.1, 0.2, ex + 0.2, ey + 0.1, 1.5); ir.addColorStop(0, irisC[1]); ir.addColorStop(0.75, irisC[0]); ir.addColorStop(1, "rgba(20,14,18,.9)");
        circ(g, ex + 0.2, ey + 0.1, 1.45, ir); circ(g, ex + 0.2, ey + 0.15, 0.62, "#15101a"); circ(g, ex - 0.35, ey - 0.45, 0.42, "rgba(255,255,255,.92)");
        g.fillStyle = "rgba(60,40,50,.18)"; g.beginPath(); g.moveTo(ex - 2.3, ey); g.quadraticCurveTo(ex, ey - 2.3, ex + 2.3, ey); g.quadraticCurveTo(ex, ey - 0.9, ex - 2.3, ey); g.fill(); g.restore();
        g.strokeStyle = "#3a2d33"; g.lineWidth = 1.05; g.lineCap = "round"; g.beginPath(); g.moveTo(ex - 2.4, ey); g.quadraticCurveTo(ex, ey - 2.5, ex + 2.4, ey); g.stroke();
        g.strokeStyle = "rgba(58,45,51,.35)"; g.lineWidth = 0.7; g.beginPath(); g.moveTo(ex - 2.1, ey + 0.2); g.quadraticCurveTo(ex, ey + 1.9, ex + 2.1, ey + 0.2); g.stroke();
      }
      g.strokeStyle = hairSh; g.lineWidth = 1.05; g.lineCap = "round"; g.beginPath(); g.moveTo(ex - 2.3, 8.3); g.quadraticCurveTo(ex + 0.2, 7.4, ex + 2.4, 8.1); g.stroke();
    }
    for (const bx2 of (side ? [7.5] : [-7.5, 7.5])) ell(g, bx2, 15, 2.2, 1.3, "rgba(240,120,120,.30)");
    g.strokeStyle = "#8a5a55"; g.lineWidth = 1.1; g.beginPath(); if (o.pose === "talk") { ell(g, side ? 7 : 0, 17.2, 1.4, 1.1, "#7a3f45"); } else { g.moveTo((side ? 7 : 0) - 1.6, 16.8); g.quadraticCurveTo(side ? 7 : 0, 18.2, (side ? 7 : 0) + 1.6, 16.8); g.stroke(); }
    if (L.glasses) { g.strokeStyle = "#2f3345"; g.lineWidth = 1.2; for (const ex of eyeXs) { g.beginPath(); g.roundRect(ex - 3.4, 9.1, 6.8, 5.4, 2.4); g.stroke(); } if (!side) { g.beginPath(); g.moveTo(-1.1, 11.4); g.lineTo(1.1, 11.4); g.stroke(); } else { g.beginPath(); g.moveTo(2.1, 10.6); g.lineTo(-6, 9.6); g.stroke(); } }
  }
  // 머리카락(앞) / 캡
  const hairGrad = lg(g, -8, -2, 8, 12, lighten(hair, 18), hairSh);
  if (L.hair === "cap") {
    g.beginPath(); g.arc(hx, 8.5, 11.2, Math.PI, 0); g.lineTo(hx + 11.2, 8.5); g.lineTo(hx - 11.2, 8.5); g.closePath(); g.fillStyle = lg(g, -8, -3, 8, 9, lighten(capC[0], 16), capC[1]); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.1; g.stroke();
    if (!back) ell(g, hx + (side ? 6 : 0), 8.6, side ? 9 : 13.5, 2.2, capC[1], OUT); else ell(g, hx, 8.6, 11, 1.6, capC[1], OUT);
    rr(g, hx - 2, 2, 4, 1.6, 0.8, capC[1]); g.beginPath(); g.arc(hx, 8.5, 11.2, Math.PI * 1.15, Math.PI * 1.45); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.6; g.stroke();
    if (!back && !side) { for (const sx of [-9, 9]) rr(g, sx - 1.2, 8.5, 2.4, 4, 1, hair); }
  } else {
    if (back) { circ(g, hx, 9, 11.4, hairGrad, OUT); g.beginPath(); g.moveTo(-11, 12); g.quadraticCurveTo(-6, 18, 0, 17.5); g.quadraticCurveTo(6, 18, 11, 12); g.lineTo(11, 9); g.lineTo(-11, 9); g.closePath(); g.fillStyle = hairGrad; g.fill(); }
    else if (side) { g.beginPath(); g.arc(hx, 9, 11.4, Math.PI * 0.95, Math.PI * 1.98); g.quadraticCurveTo(hx + 9, 1, hx + 3, 3.5); g.quadraticCurveTo(hx - 2, 6, hx - 6, 4); g.lineTo(hx - 11.3, 10); g.closePath(); g.fillStyle = hairGrad; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.1; g.stroke(); rr(g, hx - 12.2, 6, 4.5, 9, 2.2, hairGrad, OUT); }
    else { g.beginPath(); g.arc(hx, 9, 11.4, Math.PI * 0.98, Math.PI * 2.02); g.quadraticCurveTo(9, 3, 4.5, 5.2); g.quadraticCurveTo(2, 2.5, -1.5, 5.5); g.quadraticCurveTo(-5, 2.8, -8.5, 6); g.closePath(); g.fillStyle = hairGrad; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.1; g.stroke(); for (const sx of [-1, 1]) rr(g, sx * 9.2 - 1.8, 5.5, 3.6, 7.5, 1.8, hairGrad, OUT); }
    g.beginPath(); g.arc(hx - 1, 9, 9.6, Math.PI * 1.2, Math.PI * 1.55); g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 1.8; g.lineCap = "round"; g.stroke();
    if (L.hair === "bun") { circ(g, side ? -9 : 7.5, side ? 2 : -1.5, 4.3, hairGrad, OUT); circ(g, side ? -10 : 6.3, side ? 0.8 : -2.8, 1.3, "rgba(255,255,255,.3)"); }
  }
  g.restore();
}
export const HAIR_COLORS: [string, string][] = [["#2b2118", "#4a3a2c"], ["#1a1a1e", "#33333c"], ["#5a3620", "#7a4e30"], ["#8a5a3c", "#a8714b"], ["#c9932c", "#e0b04a"], ["#6e7387", "#8a8fa3"], ["#7a3f8f", "#9a5fae"], ["#b8452f", "#d86a50"]];
export const TOP_COLORS: [string, string][] = [["#2e3352", "#1f2238"], ["#7a2f4a", "#571f33"], ["#2f7d6f", "#215a50"], ["#c9612b", "#96431c"], ["#5b4a9e", "#3f3372"], ["#c9932c", "#9a6e1e"], ["#6e7387", "#4f5468"], ["#b8456f", "#8a3253"], ["#f2efe6", "#cfc9b8"], ["#1c1c22", "#34343f"]];
export const BOTTOM_COLORS: [string, string][] = [["#26283a", "#1b1c2a"], ["#2e3145", "#22243a"], ["#5a4a3a", "#3e3228"], ["#8a8fa3", "#6e7387"], ["#4b5f8a", "#354566"]];
export const SKINS: { label: string; v: [string, string] }[] = [{ label: "연", v: ["#f4d3b3", "#dcae86"] }, { label: "중", v: ["#eabf99", "#c99268"] }, { label: "진", v: ["#f1c9a4", "#d19a6e"] }, { label: "딥", v: ["#b9835c", "#8d603f"] }];
export function randomLook(): Look { const pk = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]; return { hair: pk(["short", "long", "bun", "cap"] as Look["hair"][]), hair_c: pk(HAIR_COLORS), cap: pk([["#3f3a8f", "#2c2866"], ["#1c1c22", "#34343f"], ["#b8452f", "#8a3223"]] as [string, string][]), skin: pk(SKINS).v, outfit: pk(["tee", "hoodie", "blazer", "vest"] as Look["outfit"][]), top: pk(TOP_COLORS), shirt: "#f2f2f5", accent: pk(["#f4f1ea", "#c0392b", "#e8a33d", "#2b2e42"]), bottom: pk(BOTTOM_COLORS), shoe: pk([["#1a1a22", "#3a3a48"], ["#e6e6ea", "#b8b8c4"], ["#4a3020", "#6a4a34"]] as [string, string][]), glasses: Math.random() < 0.25 }; }
