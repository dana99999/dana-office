/** 커스텀 아이콘 세트 — 24×24, 1.8px 라운드 스트로크, currentColor. 이모지·기본 아이콘 대체 */
import type { SVGProps } from "react";
type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size: number, p: P) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p });
export const I = {
  office: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21" /><path d="M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21" /><path d="M2.5 21h19" /><path d="M7 8h1.5M9.5 8H11M7 11.5h1.5M9.5 11.5H11M7 15h1.5M9.5 15H11M17 14h.01M17 17.5h.01" /></svg>,
  folder: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2a1.5 1.5 0 0 1 1.1.5L11.8 8H19a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-10Z" /></svg>,
  board: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M9 4v16M15 4v16" /><path d="M5.5 8h1.5M11 8h2M17 8h1.5" /></svg>,
  check: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.3 2.3 4.7-5" /></svg>,
  image: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="9.5" r="1.6" /><path d="m4 17 4.6-4.4a1.5 1.5 0 0 1 2.1 0L15 17M13.5 15.5l2.1-2a1.5 1.5 0 0 1 2.1 0L20 15.7" /></svg>,
  card: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></svg>,
  archive: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M4 8.5h16v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" /><rect x="3" y="4.5" width="18" height="4" rx="1.2" /><path d="M10 12.5h4" /></svg>,
  bot: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><rect x="4.5" y="8" width="15" height="11" rx="3.5" /><path d="M12 8V5M12 5a1.2 1.2 0 1 0 0-.01" /><circle cx="9.3" cy="13" r="1.1" fill="currentColor" stroke="none" /><circle cx="14.7" cy="13" r="1.1" fill="currentColor" stroke="none" /><path d="M9.5 16.2h5" /></svg>,
  users: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><circle cx="9.5" cy="8.5" r="3.2" /><path d="M3.5 19c.4-3.3 3-5 6-5s5.6 1.7 6 5" /><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.3c1.8.6 3 2 3.2 4.7" /></svg>,
  sliders: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9" /><circle cx="15" cy="7.5" r="2" /><circle cx="9" cy="16.5" r="2" /></svg>,
  menu: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  help: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M9.2 9.3a2.9 2.9 0 0 1 5.6.8c0 1.9-2.8 2.2-2.8 4.1" /><circle cx="12" cy="17.6" r=".9" fill="currentColor" stroke="none" /></svg>,
  gear: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" /></svg>,
  moon: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M14.5 4.5a7.5 7.5 0 1 0 5 12.6A8 8 0 0 1 14.5 4.5Z" /></svg>,
  pencil: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="m4.5 19.5 4-1 9.6-9.6a2 2 0 0 0 0-2.8l-.2-.2a2 2 0 0 0-2.8 0L5.5 15.5l-1 4Z" /><path d="m13.5 7.5 3 3" /></svg>,
  send: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M4.5 12 20 4.5l-3.6 15L11.5 14l-7-2Z" /><path d="M11.5 14 20 4.5" /></svg>,
  chevron: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="m9 6 6 6-6 6" /></svg>,
  x: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="m6.5 6.5 11 11M17.5 6.5l-11 11" /></svg>,
  palette: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.1-.9-1.4-.9-2.4 0-1 .8-1.6 1.8-1.6h1.6a4 4 0 0 0 4-4c0-4-3.9-7.2-8.5-7.2Z" /><circle cx="8" cy="11" r="1.1" fill="currentColor" stroke="none" /><circle cx="11" cy="7.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" /></svg>,
  logout: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M13.5 4.5h4A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5h-4" /><path d="M4.5 12h9M10 8.5l3.5 3.5L10 15.5" /></svg>,
  spark: ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M12 4.5c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6Z" /><path d="M18.5 15.5c.2 1.3.9 2 2.2 2.2-1.3.2-2 .9-2.2 2.2-.2-1.3-.9-2-2.2-2.2 1.3-.2 2-.9 2.2-2.2Z" /></svg>,
  arrow: ({ size = 18, dir = "up", ...p }: P & { dir?: "up" | "down" | "left" | "right" }) => <svg {...base(size, p)} style={{ transform: `rotate(${{ up: 0, right: 90, down: 180, left: 270 }[dir]}deg)`, ...(p.style || {}) }}><path d="M12 19V5.5M6.5 11 12 5.5l5.5 5.5" /></svg>,
};
/** 캔버스 오버레이용 인라인 SVG 문자열 (innerHTML) */
export const svgStr = {
  gear: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/></svg>',
  moon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 4.5a7.5 7.5 0 1 0 5 12.6A8 8 0 0 1 14.5 4.5Z"/></svg>',
  pencil: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 19.5 4-1 9.6-9.6a2 2 0 0 0 0-2.8l-.2-.2a2 2 0 0 0-2.8 0L5.5 15.5l-1 4Z"/></svg>',
};
