/** HD 벡터 캐릭터 — 트렌디 플랫 치비 스타일 (큰 머리, 부드러운 형태, 저채도 팔레트, 은은한 아웃라인) */
import type { Look } from "../types";
export type Dir = "up" | "down" | "left" | "right";
export type Pose = "idle" | "walk" | "type" | "coffee" | "sleep" | "blink" | "talk";
type G = CanvasRenderingContext2D;
export interface CharOpts { dir: Dir; pose: Pose; phase: number; size: number; seated?: boolean; }

const OUT = "rgba(28,24,44,.30)";
const LINE = "#2b2438";
function rr(g: G, x: number, y: number, w: number, h: number, r: number | number[], fill: string | CanvasGradient, stroke?: string | null, lw = 1) {
  g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
function circ(g: G, x: number, y: number, r: number, fill: string | CanvasGradient, stroke?: string | null, lw = 1) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function ell(g: G, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, stroke?: string | null, lw = 1) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function lg(g: G, x0: number, y0: number, x1: number, y1: number, a: string, b: string) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
function lighten(hex: string, amt: number) { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, ((n >> 16) & 255) + amt), gg = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt); return `rgb(${r},${gg},${b})`; }
function mix(hex: string, to: string, t: number) { const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16); const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; }

/**
 * (cx, feetY) 기준. size = 타일 크기(48 기준 스케일). 로컬 좌표: y=0 머리 꼭대기, y=46 발바닥.
 */
export function drawCharacter(g: G, L: Look, cx: number, feetY: number, o: CharOpts) {
  const s = o.size / 48; const ph = o.phase; const walking = o.pose === "walk";
  const swing = walking ? Math.sin(ph * Math.PI * 2) : 0;
  const bob = walking ? Math.abs(Math.cos(ph * Math.PI * 2)) * 1.6 : (o.pose === "idle" || o.pose === "type" || o.pose === "talk" ? Math.sin(ph * Math.PI * 2) * 0.7 : 0);
  const side = o.dir === "left" || o.dir === "right", back = o.dir === "up", flip = o.dir === "left";
  const skin = L.skin[0], skinSh = L.skin[1], top = L.top[0], topSh = L.top[1], hair = L.hair_c[0], hairSh = L.hair_c[1], pants = L.bottom[0], pantsSh = L.bottom[1], shoe = L.shoe[0], shoeHi = L.shoe[1];
  const shirt = L.shirt || "#f5f4f0", accent = L.accent || "#e8a33d"; const capC = L.cap || ["#3f3a8f", "#2c2866"];
  const hairGrad = lg(g, -10, 0, 10, 26, lighten(hair, 22), hairSh);
  const HR = 13, HX = side ? 0.5 : 0, HY = 14; // 머리 반지름·중심

  const seated = !!o.seated && !walking;
  g.save(); g.translate(cx, feetY); if (flip) g.scale(-1, 1); g.scale(s, s);
  // 그림자 (앉으면 의자에 가려짐)
  if (!seated) ell(g, 0, 0.5, 11.5, 3.4, "rgba(10,10,24,.28)");
  g.translate(0, -46 - bob + (seated ? 15 : 0));

  // 뒷머리(롱) — 몸 뒤
  if (L.hair === "long") { if (side) rr(g, -11.5, 10, 13, 24, [6, 3, 6, 6], hairGrad, OUT); else rr(g, -14.5, 10, 29, 25, [8, 8, 9, 9], hairGrad, OUT); }
  if (L.hair === "bun" && back) circ(g, 0, 3, 5.2, hairGrad, OUT);

  // 다리 + 신발 (짧고 둥글게)
  const legDy = swing * 2.4; const lw = side ? 6 : 6.5; const legL = side ? -4.5 : -7.5, legR = side ? -1.5 : 1;
  const leg = (x: number, dy: number) => {
    const lift = Math.max(0, dy);
    rr(g, x, 37 - lift, lw, 7 + lift * 0.4, [2, 2, 1, 1], lg(g, 0, 37, 0, 44, pants, pantsSh), OUT);
    rr(g, x - 0.8, 42 - lift, lw + 1.6, 4.2, [2.2, 2.2, 2.6, 2.6], shoe, OUT); rr(g, x - 0.2, 42.6 - lift, lw + 0.4, 1.2, 1, shoeHi);
  };
  if (seated) { // 앉은 다리: 허벅지만 앞으로 짧게
    rr(g, legL - 0.5, 36, lw + 1, 5, [2, 2, 2.5, 2.5], lg(g, 0, 36, 0, 41, pants, pantsSh), OUT); rr(g, legR - 0.5, 36, lw + 1, 5, [2, 2, 2.5, 2.5], lg(g, 0, 36, 0, 41, pants, pantsSh), OUT);
  } else { leg(legL, legDy); leg(legR, -legDy); }

  // 몸통 (캡슐)
  const bw = side ? 16 : 21, bx = -bw / 2, by = 26.5, bh = 12.5;
  const bodyCol = L.outfit === "vest" ? shirt : top, bodySh = L.outfit === "vest" ? mix(shirt, "#000000", 0.14) : topSh;
  rr(g, bx, by, bw, bh, [8, 8, 5, 5], lg(g, bx, by, bx + bw, by + bh, lighten(bodyCol, 10), bodySh), OUT);
  // 의상 디테일
  if (!back) {
    if (L.outfit === "blazer") {
      if (!side) { g.fillStyle = shirt; g.beginPath(); g.moveTo(-5, by); g.lineTo(5, by); g.lineTo(0, by + 9); g.closePath(); g.fill(); g.fillStyle = topSh; g.beginPath(); g.moveTo(-8.5, by); g.lineTo(-4.2, by); g.lineTo(-0.6, by + 9); g.lineTo(-3.4, by + 10.5); g.closePath(); g.fill(); g.beginPath(); g.moveTo(8.5, by); g.lineTo(4.2, by); g.lineTo(0.6, by + 9); g.lineTo(3.4, by + 10.5); g.closePath(); g.fill(); rr(g, -1.2, by + 1, 2.4, 7, 1, accent); }
      else { rr(g, 2.5, by, 4, 8, [1.5, 1.5, 1, 1], shirt); rr(g, 3.6, by + 1.5, 1.6, 5, 0.8, accent); }
    } else if (L.outfit === "hoodie") {
      rr(g, side ? -8 : -11, by - 3, side ? 15 : 22, 6, 3.5, lg(g, 0, by - 3, 0, by + 3, lighten(top, 6), topSh), OUT);
      rr(g, side ? -5 : -7, by + 7.5, side ? 10 : 14, 4, [1, 1, 2.5, 2.5], "rgba(0,0,0,.12)");
      g.strokeStyle = shirt; g.lineWidth = 1.2; g.lineCap = "round"; g.beginPath(); if (!side) { g.moveTo(-2.6, by + 2); g.lineTo(-3, by + 8); g.moveTo(2.6, by + 2); g.lineTo(3, by + 8); } else { g.moveTo(4.5, by + 2); g.lineTo(5, by + 7.5); } g.stroke();
    } else if (L.outfit === "vest") {
      if (!side) { rr(g, -7, by, 14, bh, [6, 6, 4, 4], lg(g, -7, by, 7, by + bh, lighten(top, 8), topSh), OUT); g.fillStyle = shirt; g.beginPath(); g.moveTo(-3.6, by); g.lineTo(3.6, by); g.lineTo(0, by + 5.5); g.closePath(); g.fill(); for (const y of [by + 6.5, by + 9.5]) circ(g, 0, y, 0.85, mix(topSh, "#000000", 0.3)); }
      else { rr(g, -6, by, 10, bh, [5, 5, 3, 3], lg(g, -6, by, 4, by + bh, lighten(top, 8), topSh), OUT); }
    } else { // tee
      if (!side) { g.beginPath(); g.arc(0, by, 4, 0, Math.PI); g.fillStyle = skinSh; g.fill(); rr(g, -4.5, by + 4.5, 9, 3.6, 1.6, accent); }
      else rr(g, 1, by + 4.5, 5.5, 3.6, 1.6, accent);
    }
  }
  // 팔
  const sleeve = L.outfit === "vest" ? shirt : top, sleeveSh = L.outfit === "vest" ? mix(shirt, "#000000", 0.14) : topSh;
  const armSw = o.pose === "type" ? 0 : swing * 22;
  const arm = (ax: number, sign: number, ang: number, front: boolean) => {
    g.save(); g.translate(ax, by + 1.5); g.rotate((ang * Math.PI) / 180 * sign);
    if ((o.pose === "type" || o.pose === "coffee") && !back) g.rotate(sign * -0.7);
    rr(g, -2.6, 0, 5.2, 10.5, 2.6, lg(g, 0, 0, 0, 10, front ? lighten(sleeve, 8) : sleeveSh, sleeveSh), OUT); circ(g, 0, 10.8, 2.7, lg(g, 0, 8, 0, 13, skin, skinSh), OUT, .9); g.restore();
  };
  if (side) arm(2.5, 1, -armSw, true); else { arm(-11.5, 1, armSw, false); arm(11.5, 1, -armSw, true); }
  if (o.pose === "coffee" && !back) { const cy = ph > 0.5 ? by - 4 : by + 3; rr(g, side ? 4 : 12.5, cy, 6, 6.5, [1.5, 1.5, 2.5, 2.5], "#f7f5ef", OUT); rr(g, side ? 4 : 12.5, cy + 2.2, 6, 1.6, 0.8, top); g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); g.arc(side ? 10.4 : 18.9, cy + 3.2, 1.8, -Math.PI / 2, Math.PI / 2); g.stroke(); for (let i = 0; i < 2; i++) ell(g, (side ? 6 : 14.5) + i * 2.6, cy - 2.6 - ((ph * 8 + i * 2) % 4), 0.8, 1.5, "rgba(255,255,255,.45)"); }

  // 목
  rr(g, -2.8, 24.5, 5.6, 3.5, 1.6, lg(g, 0, 24, 0, 28, skinSh, skin));
  // 머리 (큰 둥근 얼굴)
  // 얼굴형: 위는 둥글고 턱은 살짝 좁은 형태
  g.beginPath(); g.moveTo(HX - HR + 0.6, HY - 1); g.bezierCurveTo(HX - HR + 0.6, HY - 15, HX + HR - 0.6, HY - 15, HX + HR - 0.6, HY - 1); g.bezierCurveTo(HX + HR - 0.6, HY + 9, HX + 6.5, HY + 13.6, HX, HY + 13.6); g.bezierCurveTo(HX - 6.5, HY + 13.6, HX - HR + 0.6, HY + 9, HX - HR + 0.6, HY - 1); g.closePath();
  g.fillStyle = lg(g, -8, 2, 8, 26, lighten(skin, 10), skinSh); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
  // 귀
  if (!back) { circ(g, side ? -11.4 : -12.6, 15.5, 2.2, lg(g, 0, 14, 0, 18, skin, skinSh), OUT, .9); if (!side) circ(g, 12.6, 15.5, 2.2, lg(g, 0, 14, 0, 18, skin, skinSh), OUT, .9); }

  // 얼굴
  if (!back) {
    const eyeXs = side ? [6.4] : [-5, 5]; const ey = 15.8; const mx = side ? 7.4 : 0;
    const closed = o.pose === "sleep" || o.pose === "blink";
    for (const ex of eyeXs) {
      if (closed) { g.strokeStyle = LINE; g.lineWidth = 1.3; g.lineCap = "round"; g.beginPath(); g.moveTo(ex - 2, ey); g.quadraticCurveTo(ex, ey + 1.6, ex + 2, ey); g.stroke(); }
      else { circ(g, ex, ey, 1.85, LINE); circ(g, ex - 0.55, ey - 0.6, 0.62, "rgba(255,255,255,.95)"); circ(g, ex + 0.7, ey + 0.6, 0.3, "rgba(255,255,255,.55)"); }
      // 눈썹 (헤어 톤, 얇게)
      g.strokeStyle = hairSh; g.lineWidth = 1.1; g.lineCap = "round"; g.beginPath(); g.moveTo(ex - 2, ey - 4.2); g.quadraticCurveTo(ex + 0.3, ey - 5.2, ex + 2.2, ey - 4.4); g.stroke();
    }
    // 블러시
    for (const bx2 of (side ? [8.4] : [-7.8, 7.8])) ell(g, bx2, 19.4, 2.4, 1.3, "rgba(236,120,120,.26)");
    // 입
    if (o.pose === "talk") { ell(g, mx, 21.4, 1.7, 1.25, "#6c3a45"); ell(g, mx, 22.1, 1.1, 0.5, "#e58b8b"); }
    else { g.strokeStyle = "#7b4a50"; g.lineWidth = 1.15; g.lineCap = "round"; g.beginPath(); g.moveTo(mx - 1.9, 20.9); g.quadraticCurveTo(mx, 22.6, mx + 1.9, 20.9); g.stroke(); }
    // 안경
    if (L.glasses) { g.strokeStyle = "rgba(43,36,56,.92)"; g.lineWidth = 1.15; for (const ex of eyeXs) { g.beginPath(); g.roundRect(ex - 3.9, ey - 3, 7.8, 5.6, 2.2); g.stroke(); } g.beginPath(); if (!side) { g.moveTo(-1.2, ey - 0.6); g.lineTo(1.2, ey - 0.6); } else { g.moveTo(2.6, ey - 1.6); g.lineTo(-7, ey - 3.2); } g.stroke(); g.fillStyle = "rgba(255,255,255,.14)"; for (const ex of eyeXs) { g.beginPath(); g.roundRect(ex - 3.9, ey - 3, 7.8, 5.6, 2.2); g.fill(); } }
  }

  // 머리카락(앞) / 캡
  if (L.hair === "cap") {
    g.beginPath(); g.arc(HX, HY - 2.5, HR + 0.6, Math.PI, 0); g.closePath(); g.fillStyle = lg(g, -10, 0, 10, 12, lighten(capC[0], 18), capC[1]); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
    if (!back) ell(g, HX + (side ? 7 : 0), HY - 2.4, side ? 9.5 : 15, 2.4, capC[1], OUT); else ell(g, HX, HY - 2.4, HR + 0.6, 1.8, capC[1], OUT);
    circ(g, HX, HY - 15.2, 1.6, capC[1]);
    g.beginPath(); g.arc(HX, HY - 2.5, HR - 1.5, Math.PI * 1.15, Math.PI * 1.45); g.strokeStyle = "rgba(255,255,255,.3)"; g.lineWidth = 1.8; g.lineCap = "round"; g.stroke();
    if (!back) { for (const sx of (side ? [-10.5] : [-11.2, 11.2])) rr(g, sx - 1.4, HY - 2, 2.8, 5, 1.4, hairGrad); }
  } else {
    if (back) { g.beginPath(); g.arc(HX, HY, HR + 0.6, 0, Math.PI * 2); g.fillStyle = hairGrad; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke(); g.beginPath(); g.moveTo(-13, 18); g.quadraticCurveTo(-8, 25, 0, 25.5); g.quadraticCurveTo(8, 25, 13, 18); g.lineTo(13, 14); g.lineTo(-13, 14); g.closePath(); g.fillStyle = hairGrad; g.fill(); }
    else if (side) {
      // 옆: 뒤통수 덮고 앞머리가 이마 쪽으로 쓸려 내려옴
      g.beginPath(); g.arc(HX, HY, HR + 0.6, Math.PI * 0.62, Math.PI * 1.92); g.quadraticCurveTo(HX + 10, HY - 4, HX + 6, HY - 2); g.quadraticCurveTo(HX + 2, HY - 6.5, HX - 4, HY - 4.5); g.lineTo(HX - 9, HY + 3); g.closePath(); g.fillStyle = hairGrad; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
      if (L.hair !== "short") rr(g, HX - 13.6, HY - 4, 5, 12, 2.5, hairGrad, OUT);
    } else {
      // 정면: 둥근 헬멧 + 두 갈래 앞머리 + 옆머리
      g.beginPath(); g.arc(HX, HY, HR + 0.6, Math.PI * 0.86, Math.PI * 2.14); g.quadraticCurveTo(10.5, HY - 5, 6, HY - 3.2); g.quadraticCurveTo(3, HY - 7.2, -0.5, HY - 3.6); g.quadraticCurveTo(-4.5, HY - 7.6, -8, HY - 3.4); g.quadraticCurveTo(-11, HY - 4, HX - HR - 0.6, HY + 0.4); g.closePath(); g.fillStyle = hairGrad; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
      const sideLen = L.hair === "long" ? 12 : L.hair === "bun" ? 7 : 6.5;
      for (const sx of [-1, 1]) rr(g, sx * 11.6 - 1.8, HY - 4, 3.6, sideLen, 1.8, hairGrad, OUT);
    }
    // 하이라이트
    g.beginPath(); g.arc(HX - 1.5, HY, HR - 2.2, Math.PI * 1.18, Math.PI * 1.5); g.strokeStyle = "rgba(255,255,255,.26)"; g.lineWidth = 2.2; g.lineCap = "round"; g.stroke();
    if (L.hair === "bun" && !back) { const bxp = side ? -8.5 : 6.5, byp = side ? 2.5 : 1; circ(g, bxp, byp, 5, hairGrad, OUT); circ(g, bxp - 1.4, byp - 1.6, 1.4, "rgba(255,255,255,.3)"); }
  }
  g.restore();
}

/* 저채도·트렌디 팔레트 */
export const HAIR_COLORS: [string, string][] = [["#2a2226", "#443840"], ["#171519", "#2e2b33"], ["#5b3b2b", "#7a533f"], ["#9a6b4a", "#b8865f"], ["#d9a85a", "#e9c07a"], ["#8f93a8", "#a9adbf"], ["#8a6bb3", "#a98ccb"], ["#c86b57", "#e0887a"], ["#c9b7e8", "#dccff2"], ["#7fb8b0", "#9fd0c8"]];
export const TOP_COLORS: [string, string][] = [["#3a3f66", "#2a2e4c"], ["#8b3f5c", "#6a2e46"], ["#3f8f80", "#2e6b60"], ["#d47a48", "#a85a30"], ["#6a5cc4", "#4c4295"], ["#d9a85a", "#a8803e"], ["#8a8fa8", "#67708a"], ["#c85c8a", "#9a4468"], ["#f2eee4", "#d5cfbf"], ["#23232b", "#3c3c48"], ["#a8c8a0", "#7fa478"], ["#f0b7b7", "#d48f8f"]];
export const BOTTOM_COLORS: [string, string][] = [["#2c2e42", "#20222f"], ["#3a3f5c", "#2c3047"], ["#6a5646", "#4c3e32"], ["#a3a7ba", "#868a9e"], ["#5b6f9e", "#425276"], ["#e8e4da", "#c8c3b5"]];
export const SKINS: { label: string; v: [string, string] }[] = [{ label: "연", v: ["#f7dcc2", "#e2b895"] }, { label: "중", v: ["#efc7a3", "#d19b72"] }, { label: "진", v: ["#d9a077", "#b57c55"] }, { label: "딥", v: ["#a86f4c", "#7e5134"] }];
export function randomLook(): Look { const pk = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]; return { hair: pk(["short", "long", "bun", "cap"] as Look["hair"][]), hair_c: pk(HAIR_COLORS), cap: pk([["#3f3a8f", "#2c2866"], ["#23232b", "#3c3c48"], ["#c86b57", "#9a4a3a"]] as [string, string][]), skin: pk(SKINS).v, outfit: pk(["tee", "hoodie", "blazer", "vest"] as Look["outfit"][]), top: pk(TOP_COLORS), shirt: "#f5f4f0", accent: pk(["#f5f4f0", "#c0392b", "#e8a33d", "#2b2e42", "#7fb8b0"]), bottom: pk(BOTTOM_COLORS), shoe: pk([["#1e1e26", "#3e3e4c"], ["#eaeaee", "#bdbdc8"], ["#4a3020", "#6a4a34"]] as [string, string][]), glasses: Math.random() < 0.25 }; }
