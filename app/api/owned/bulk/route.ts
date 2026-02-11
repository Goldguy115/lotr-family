import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  if (!(await requireFamilySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body) ? body : (body.rows ?? []);
  if (!rows.length) return NextResponse.json({ error: "No rows provided" }, { status: 400 });

  const toUpsert = rows.map((r: any) => ({
    card_code: String(r.card_code),
    owned_qty: Number(r.owned_qty ?? 0)
  }));

  const sb = supabaseServer();
  const up = await sb.from("collection_cards").upsert(toUpsert, { onConflict: "card_code" });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: (up.data ?? []).length });
}
