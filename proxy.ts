import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login + static assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/logout") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Protect these routes
  if (
    pathname.startsWith("/collection") ||
    pathname.startsWith("/decks") ||
    pathname.startsWith("/api")
  ) {
    const hasSession = req.cookies.get("lotr_family_session")?.value;
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/collection/:path*", "/decks/:path*", "/api/:path*"],
};
