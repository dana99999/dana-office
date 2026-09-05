import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_MS, signToken, verifyToken, type Session } from "./token";
import { db } from "./db";
import type { User } from "./types";

export async function getSession(): Promise<Session | null> { const c = await cookies(); return verifyToken(c.get(SESSION_COOKIE)?.value); }
export async function requireSession(): Promise<Session> { const s = await getSession(); if (!s) throw new Response("unauthorized", { status: 401 }); return s; }
export async function requireRole(roles: Session["role"][]): Promise<Session> { const s = await requireSession(); if (!roles.includes(s.role)) throw new Response("forbidden", { status: 403 }); return s; }
export async function issueSession(u: User): Promise<string> { return signToken({ uid: u.id, role: u.role, name: u.display_name, onboarded: !!u.onboarded, exp: Date.now() + SESSION_TTL_MS }); }
export function cookieOptions() { return { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: SESSION_TTL_MS / 1000, secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1" }; }
export function userById(id: number): User | undefined { return db().prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined; }
/** 라우트 핸들러용: Response를 throw한 경우 그대로 반환 */
export function guard<T>(fn: () => Promise<T>): Promise<T | Response> { return fn().catch((e) => (e instanceof Response ? e : Promise.reject(e))); }
