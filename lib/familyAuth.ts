import { cookies } from "next/headers";

export async function requireFamilySession() {
  const jar = await cookies(); // IMPORTANT: await
  const token = jar.get("family_session")?.value;
  return token === "ok";
}
