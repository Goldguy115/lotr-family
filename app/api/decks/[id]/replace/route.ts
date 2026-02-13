import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

type ReplaceBody = {
  heroes: string[];
  cards: { card_code: string; qty: number }[];
};

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: deckId } = await context.params;
  const body = (await req.json().catch(() => ({}))) as Partial<ReplaceBody>;

  const heroes = Array.isArray(body.heroes) ? body.heroes.map(String) : [];
  const cardsRaw = Array.isArray(body.cards) ? body.cards : [];

  const cards = cardsRaw
    .map((c: any) => ({
      card_code: String(c.card_code ?? ""),
      qty: Math.max(0, Math.trunc(Number(c.qty ?? 0))),
    }))
    .filter((c) => c.card_code && c.qty > 0);

  if (heroes.length > 3) {
    return NextResponse.json({ error: "Too many heroes (max 3)" }, { status: 400 });
  }

  const sb = supabaseServer();

  const delHeroes = await sb.from("deck_heroes").delete().eq("deck_id", deckId);
  if (delHeroes.error) return NextResponse.json({ error: delHeroes.error.message }, { status: 500 });

  const delCards = await sb.from("deck_cards").delete().eq("deck_id", deckId);
  if (delCards.error) return NextResponse.json({ error: delCards.error.message }, { status: 500 });

  if (heroes.length) {
    const insHeroes = await sb.from("deck_heroes").insert(
      heroes.map((code) => ({ deck_id: deckId, hero_code: code }))
    );
    if (insHeroes.error) return NextResponse.json({ error: insHeroes.error.message }, { status: 500 });
  }

  if (cards.length) {
    const insCards = await sb.from("deck_cards").insert(
      cards.map((c) => ({ deck_id: deckId, card_code: c.card_code, qty: c.qty }))
    );
    if (insCards.error) return NextResponse.json({ error: insCards.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
