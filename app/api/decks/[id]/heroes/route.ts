import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deckId = params.id;
  const body = await req.json().catch(() => ({}));
  const heroes: string[] = Array.isArray(body.heroes) ? body.heroes.map(String) : [];

  if (heroes.length < 1 || heroes.length > 3) {
    return NextResponse.json({ error: "heroes must be 1 to 3 card codes" }, { status: 400 });
  }

  const sb = supabaseServer();

  const del = await sb.from("deck_heroes").delete().eq("deck_id", deckId);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

  const ins = await sb.from("deck_heroes").insert(heroes.map(card_code => ({ deck_id: deckId, card_code })));
  if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
