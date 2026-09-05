// HMAC-SHA256 서명 세션 토큰 — Node/Edge(proxy) 양쪽에서 동작
const SECRET = process.env.AUTH_SECRET || "dana-office-dev-secret-change-me";

export interface Session { uid: number; role: "ceo" | "staff" | "viewer"; name: string; onboarded: boolean; exp: number; }

function b64url(bytes: Uint8Array): string { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function b64urlDecode(str: string): Uint8Array { const s = str.replace(/-/g, "+").replace(/_/g, "/"); const bin = atob(s + "===".slice((s.length + 3) % 4)); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); }
async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}
export async function signToken(s: Session): Promise<string> { const payload = b64url(new TextEncoder().encode(JSON.stringify(s))); return `${payload}.${await hmac(payload)}`; }
export async function verifyToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || sig !== (await hmac(payload))) return null;
  try { const s = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Session; if (!s.exp || s.exp < Date.now()) return null; return s; } catch { return null; }
}
export const SESSION_COOKIE = "do_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
