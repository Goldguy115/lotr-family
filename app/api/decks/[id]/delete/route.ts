import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: deckId } = await context.params;
  const sb = supabaseServer();

  // Delete child rows first
  const delHeroes = await sb.from("deck_heroes").delete().eq("deck_id", deckId);
  if (delHeroes.error) return NextResponse.json({ error: delHeroes.error.message }, { status: 500 });

  const delCards = await sb.from("deck_cards").delete().eq("deck_id", deckId);
  if (delCards.error) return NextResponse.json({ error: delCards.error.message }, { status: 500 });

  // Delete the deck
  const delDeck = await sb.from("decks").delete().eq("id", deckId);
  if (delDeck.error) return NextResponse.json({ error: delDeck.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

