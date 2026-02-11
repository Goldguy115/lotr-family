import { NextResponse } from "next/server";
import { clearFamilySession } from "@/lib/familyAuth";

export async function POST() {
  await clearFamilySession();
  return NextResponse.json({ ok: true });
}
