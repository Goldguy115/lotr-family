import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: deckId } = await context.params;

  const body = await req.json().catch(() => ({}));
  const card_code = String(body.card_code ?? "");
  const qty = Number(body.qty ?? 0);

  if (!card_code) return NextResponse.json({ error: "card_code required" }, { status: 400 });

  const sb = supabaseServer();
  const q = Math.max(0, Math.trunc(qty));

  if (q === 0) {
    const del = await sb.from("deck_cards").delete().eq("deck_id", deckId).eq("card_code", card_code);
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const up = await sb
    .from("deck_cards")
    .upsert({ deck_id: deckId, card_code, qty: q }, { onConflict: "deck_id,card_code" });

  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
