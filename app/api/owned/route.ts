import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    if (!(await requireFamilySession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const codes = url.searchParams.getAll("code");
    if (!codes.length) return NextResponse.json({ owned: {} });

    const sb = supabaseServer();
    const sel = await sb
      .from("collection_cards")
      .select("card_code, owned_qty")
      .in("card_code", codes);

    if (sel.error) return NextResponse.json({ error: sel.error.message }, { status: 500 });

    const owned: Record<string, number> = {};
    for (const r of sel.data ?? []) owned[r.card_code] = r.owned_qty;
    return NextResponse.json({ owned });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireFamilySession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const card_code = String(body.card_code ?? "");
    const owned_qty = Number(body.owned_qty ?? 0);

    if (!card_code) return NextResponse.json({ error: "card_code required" }, { status: 400 });

    const sb = supabaseServer();
    const up = await sb
      .from("collection_cards")
      .upsert(
        { card_code, owned_qty: Math.max(0, Math.trunc(owned_qty)) },
        { onConflict: "card_code" }
      );

    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
