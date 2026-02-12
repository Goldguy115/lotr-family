import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/collection", "/decks"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // allow these through
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/me") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next();
  }

  // protect pages
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  // check cookie set by /api/login
  const token = req.cookies.get("family_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/collection/:path*", "/decks/:path*"],
};
