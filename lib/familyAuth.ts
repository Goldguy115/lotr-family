import { cookies } from "next/headers";

export async function requireFamilySession() {
  const jar = await cookies(); // IMPORTANT: await
  const token = jar.get("family_session")?.value;
  return token === "ok";
}

export async function clearFamilySession() {
  const jar = await cookies();
  jar.set("family_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // deletes the cookie
  });
}
