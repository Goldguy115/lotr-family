import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow these routes/assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/me") ||
    pathname.startsWith("/api/logout") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next();
  }

  // Protect pages
  const isProtected =
    pathname === "/collection" ||
    pathname.startsWith("/collection/") ||
    pathname === "/decks" ||
    pathname.startsWith("/decks/");

  if (!isProtected) return NextResponse.next();

  // Must match cookie name in /api/login
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
