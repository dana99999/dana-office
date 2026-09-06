#!/usr/bin/env node
// 같은 Wi-Fi의 모바일에서 접속할 수 있도록 LAN에 바인딩해 서버를 띄운다.
//   npm run lan            → 빌드가 없으면 빌드 후 실행
//   npm run lan -- --build → 강제 재빌드
import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";

const PORT = process.env.PORT || "3000";
const force = process.argv.includes("--build");

if (force || !existsSync(".next/BUILD_ID")) {
  console.log("▶ 빌드 중… (1~2분)");
  execSync("npx next build", { stdio: "inherit" });
}

const ips = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n.address);

console.log("\n────────────────────────────────────────");
console.log("  DANA OFFICE — 모바일에서 아래 주소로 접속");
for (const ip of ips) console.log(`  http://${ip}:${PORT}`);
if (!ips.length) console.log("  (LAN IP를 찾지 못했습니다. ipconfig / ifconfig 로 확인하세요)");
console.log("  PC 본인:  http://localhost:" + PORT);
console.log("  로그인:   hyotae / " + (process.env.CEO_PASSWORD || "dana-office-2026"));
console.log("────────────────────────────────────────\n");

const env = {
  AUTH_SECRET: process.env.AUTH_SECRET || "local-dev-secret-change-me",
  COOKIE_INSECURE: "1", // http(LAN) 접속이므로 secure 쿠키 해제
  HOSTNAME: "0.0.0.0",
  PORT,
  ...process.env,
};
const child = spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", PORT], { stdio: "inherit", env, shell: process.platform === "win32" });
child.on("exit", (c) => process.exit(c ?? 0));
