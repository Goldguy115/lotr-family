import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: campaignId } = await context.params;

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("campaign_runs")
    .select("id,campaign_id,scenario_id,played_at,result,score,threat_end,rounds,notes,created_at,updated_at")
    .eq("campaign_id", campaignId)
    .order("played_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ runs: data ?? [] });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await context.params;
  const body = await req.json().catch(() => ({}));

  const scenario_id = body.scenario_id ?? null;
  const result = String(body.result ?? "").trim();
  if (!result) {
    return NextResponse.json({ error: "result required" }, { status: 400 });
  }

  const sb = supabaseServer();

  // 1️⃣ Insert the run
  const { data: run, error: runErr } = await sb
    .from("campaign_runs")
    .insert({
      campaign_id: campaignId,
      scenario_id,
      played_at: body.played_at ?? undefined,
      result,
      score: body.score ?? null,
      threat_end: body.threat_end ?? null,
      rounds: body.rounds ?? null,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (runErr) {
    return NextResponse.json({ error: runErr.message }, { status: 500 });
  }

  // 2️⃣ Insert deck links (with roles)
  const deck_links: { deck_id: string; role?: string | null }[] =
    Array.isArray(body.deck_links)
      ? body.deck_links.map((x: any) => ({
          deck_id: String(x.deck_id ?? ""),
          role: x.role ?? null,
        }))
      : [];

  const cleaned = deck_links.filter((x) => x.deck_id);

  if (cleaned.length) {
    const rows = cleaned.map((x) => ({
      run_id: run.id,
      deck_id: x.deck_id,
      role: x.role ?? null,
      notes: null,
    }));

    const linkInsert = await sb.from("campaign_run_decks").insert(rows);
    if (linkInsert.error) {
      return NextResponse.json({ error: linkInsert.error.message }, { status: 500 });
    }
  }

  // 3️⃣ Campaign log entry
  const deck_ids = cleaned.map((d) => d.deck_id);

  await sb.from("campaign_log").insert({
    campaign_id: campaignId,
    run_id: run.id,
    type: "run_created",
    message: `Run logged: ${result}`,
    meta: {
      scenario_id: run.scenario_id,
      deck_ids,
      deck_links: cleaned,
    },
  });

  return NextResponse.json({ run });
}

