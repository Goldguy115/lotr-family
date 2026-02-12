import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const passcode = String(body.passcode ?? body.password ?? "");

  if (!process.env.FAMILY_PASSCODE) {
    return NextResponse.json({ error: "Server missing FAMILY_PASSCODE" }, { status: 500 });
  }

  if (!passcode || passcode !== process.env.FAMILY_PASSCODE) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // simple shared-session cookie
  res.cookies.set("family_session", "ok", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",                 // IMPORTANT: applies to /collection and /decks
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
