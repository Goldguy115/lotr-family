import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";

export async function GET() {
  if (!(await requireFamilySession())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
