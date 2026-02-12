import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const token = (await cookies()).get("family_session")?.value;
  return NextResponse.json({ ok: !!token });
}
