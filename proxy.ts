import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/token";

const PUBLIC = ["/login", "/api/auth", "/view", "/api/files", "/api/health"];
const CEO_ONLY = ["/admin", "/billing", "/api/admin", "/api/billing"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    if (pathname.startsWith("/api/")) return new NextResponse("unauthorized", { status: 401 });
    const url = req.nextUrl.clone(); url.pathname = "/login"; url.search = ""; return NextResponse.redirect(url);
  }
  if (!session.onboarded && !pathname.startsWith("/onboarding") && !pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone(); url.pathname = "/onboarding"; return NextResponse.redirect(url);
  }
  if (session.role !== "ceo" && CEO_ONLY.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith("/api/")) return new NextResponse("forbidden", { status: 403 });
    const url = req.nextUrl.clone(); url.pathname = "/office"; return NextResponse.redirect(url);
  }
  if (session.role === "viewer" && !pathname.startsWith("/view") && !pathname.startsWith("/gallery")) {
    const url = req.nextUrl.clone(); url.pathname = "/gallery"; return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"] };
