"use client";
import { useEffect, useRef } from "react";
import { drawCharacter, type Dir, type Pose } from "@/lib/hd/chars";
import type { Look } from "@/lib/types";
/** 단일 캐릭터 HD 미리보기 (아바타·명단·캐릭터 만들기). size = 타일 크기 기준 */
export function SpriteView({ look, dir = "down", pose = "idle", size = 48, animate = false, className, ring }: { look: Look; dir?: Dir; pose?: Pose; size?: number; animate?: boolean; className?: string; ring?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.round(size * 1.05), h = Math.round(size * 1.3);
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const dpr = window.devicePixelRatio || 1; cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext("2d")!; let raf = 0; const t0 = performance.now();
    const draw = () => { const t = (performance.now() - t0) / 1000; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); drawCharacter(g, look, w / 2, h - 4, { dir, pose: animate ? "walk" : pose, phase: animate ? (t * 1.6) % 1 : (t * 0.5) % 1, size }); if (animate || pose === "idle") raf = requestAnimationFrame(draw); };
    draw(); return () => cancelAnimationFrame(raf);
  }, [look, dir, pose, animate, size, w, h]);
  return <canvas ref={ref} className={className} style={{ width: w, height: h, display: "block", borderRadius: ring ? "50%" : undefined, boxShadow: ring ? `0 0 0 3px ${ring}` : undefined }} aria-hidden="true" />;
}
