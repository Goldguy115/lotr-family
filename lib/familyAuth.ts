// lib/familyAuth.ts
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "lotr_family_session";

function sign(value: string) {
  const secret = process.env.FAMILY_PASSCODE!;
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export async function setFamilySession() {
  const payload = `ok:${Date.now()}`;
  const sig = sign(payload);
  const c = await cookies();
  c.set(COOKIE_NAME, `${payload}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearFamilySession() {
  const c = await cookies();
  c.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function requireFamilySession() {
  const c = await cookies();
  const v = c.get(COOKIE_NAME)?.value;
  if (!v) return false;
  const [payload, sig] = v.split(".");
  if (!payload || !sig) return false;
  return sign(payload) === sig && payload.startsWith("ok:");
}
