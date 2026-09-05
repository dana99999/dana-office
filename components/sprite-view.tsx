"use client";
import { useEffect, useRef } from "react";
import { buildSprite, type Dir, type Pose } from "@/lib/pixel/sprite";
import type { Look } from "@/lib/types";
/** 단일 캐릭터 미리보기 (아바타·명단·캐릭터 만들기) */
export function SpriteView({ look, dir = "down", pose = "idle", scale = 4, animate = false, className }: { look: Look; dir?: Dir; pose?: Pose; scale?: number; animate?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const g = cv.getContext("2d")!; g.imageSmoothingEnabled = false; let raf = 0; const t0 = performance.now();
    const draw = () => { const t = (performance.now() - t0) / 1000; g.clearRect(0, 0, 14, 22); const fr = animate ? Math.floor(t * 8) % 4 : 0; g.drawImage(buildSprite(look, dir, fr, animate ? "walk" : pose), 0, 0); if (animate) raf = requestAnimationFrame(draw); };
    draw(); return () => cancelAnimationFrame(raf);
  }, [look, dir, pose, animate]);
  return <canvas ref={ref} className={`px ${className || ""}`} width={14} height={22} style={{ width: 14 * scale, height: 22 * scale }} aria-hidden="true" />;
}
