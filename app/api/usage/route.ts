import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const codes = url.searchParams.getAll("code");
  if (!codes.length) return NextResponse.json({ usage: {} });

  const sb = supabaseServer();

  const dc = await sb
    .from("deck_cards")
    .select("deck_id, card_code, qty")
    .in("card_code", codes);

  if (dc.error) return NextResponse.json({ error: dc.error.message }, { status: 500 });

  const deckIds = Array.from(new Set((dc.data ?? []).map(r => r.deck_id)));
  const decks = deckIds.length
    ? await sb.from("decks").select("id, name").in("id", deckIds)
    : { data: [], error: null as any };

  if (decks.error) return NextResponse.json({ error: decks.error.message }, { status: 500 });

  const nameById: Record<string, string> = {};
  for (const d of (decks.data ?? [])) nameById[d.id] = d.name;

  const usage: Record<string, { deck_id: string; deck_name: string; qty: number }[]> = {};
  for (const r of (dc.data ?? [])) {
    const arr = (usage[r.card_code] ||= []);
    arr.push({ deck_id: r.deck_id, deck_name: nameById[r.deck_id] ?? r.deck_id, qty: r.qty });
  }

  return NextResponse.json({ usage });
}
