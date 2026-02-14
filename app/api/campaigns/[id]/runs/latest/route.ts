import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

type HeroInfo = { code: string; name: string | null };

async function fetchHeroName(code: string): Promise<HeroInfo> {
  try {
    const res = await fetch(
      `https://ringsdb.com/api/public/card/${encodeURIComponent(code)}`,
      { next: { revalidate: 60 * 60 } }
    );
    if (!res.ok) return { code, name: null };
    const j = await res.json().catch(() => null);
    return { code, name: j?.name ?? null };
  } catch {
    return { code, name: null };
  }
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await context.params;
  const sb = supabaseServer();

  const latestRunRes = await sb
    .from("campaign_runs")
    .select("id,played_at,result,scenario_id,created_at")
    .eq("campaign_id", campaignId)
    .order("played_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (latestRunRes.error) {
    return NextResponse.json({ error: latestRunRes.error.message }, { status: 500 });
  }

  const run = latestRunRes.data?.[0];
  if (!run) return NextResponse.json({ run: null, decks: [] });

  const deckLinkRes = await sb
    .from("campaign_run_decks")
    .select("deck_id,role")
    .eq("run_id", run.id);

  if (deckLinkRes.error) {
    return NextResponse.json({ error: deckLinkRes.error.message }, { status: 500 });
  }

  const deckLinks = (deckLinkRes.data ?? []).filter((r) => r.deck_id);
  const deckIds = deckLinks.map((r) => r.deck_id);

  if (!deckIds.length) return NextResponse.json({ run, decks: [] });

  const decksRes = await sb
    .from("deck_summaries")
    .select("id,name,heroes")
    .in("id", deckIds);

  if (decksRes.error) {
    return NextResponse.json({ error: decksRes.error.message }, { status: 500 });
  }

  const byId = new Map<string, any>();
  for (const d of decksRes.data ?? []) byId.set(d.id, d);

  const decksOrdered = deckLinks
    .map((link) => {
      const d = byId.get(link.deck_id);
      if (!d) return null;
      return {
        id: d.id,
        name: d.name,
        role: link.role ?? null,
        hero_codes: Array.isArray(d.heroes) ? (d.heroes as string[]) : [],
      };
    })
    .filter(Boolean) as any[];

  const uniqueHeroCodes = Array.from(
    new Set(decksOrdered.flatMap((d) => d.hero_codes))
  ).slice(0, 24);

  const heroInfos = await Promise.all(uniqueHeroCodes.map(fetchHeroName));
  const heroMap = new Map(heroInfos.map((h) => [h.code, h.name]));

  const decksWithHeroes = decksOrdered.map((d) => ({
    id: d.id,
    name: d.name,
    role: d.role,
    heroes: d.hero_codes.map((code: string) => ({
      code,
      name: heroMap.get(code) ?? null,
    })),
  }));

  return NextResponse.json({ run, decks: decksWithHeroes });
}
