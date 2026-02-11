import { NextResponse } from "next/server";
import { setFamilySession } from "@/lib/familyAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const passcode = String(body.passcode ?? "");

  if (!process.env.FAMILY_PASSCODE) {
    return NextResponse.json({ error: "Server missing FAMILY_PASSCODE" }, { status: 500 });
  }

  if (passcode !== process.env.FAMILY_PASSCODE) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  await setFamilySession();
  return NextResponse.json({ ok: true });
}
