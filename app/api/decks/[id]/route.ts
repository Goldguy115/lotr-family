import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: deckId } = await context.params;
  const sb = supabaseServer();

  const deck = await sb.from("decks").select("id, name").eq("id", deckId).single();
  if (deck.error) return NextResponse.json({ error: deck.error.message }, { status: 500 });

  const heroes = await sb.from("deck_heroes").select("card_code").eq("deck_id", deckId);
  if (heroes.error) return NextResponse.json({ error: heroes.error.message }, { status: 500 });

  const cards = await sb.from("deck_cards").select("card_code, qty").eq("deck_id", deckId);
  if (cards.error) return NextResponse.json({ error: cards.error.message }, { status: 500 });

  return NextResponse.json({
    deck: deck.data,
    heroes: (heroes.data ?? []).map(r => r.card_code),
    cards: cards.data ?? [],
  });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: deckId } = await context.params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const sb = supabaseServer();
  const upd = await sb.from("decks").update({ name }).eq("id", deckId);
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
