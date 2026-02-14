import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: campaignId } = await context.params;

  const body = await req.json().catch(() => ({}));
  const scenarioId = String(body.scenario_id ?? "");
  const direction = String(body.direction ?? "up"); // up|down

  if (!scenarioId) return NextResponse.json({ error: "scenario_id required" }, { status: 400 });

  const sb = supabaseServer();
  const { data: scenarios, error } = await sb
    .from("campaign_scenarios")
    .select("id,position")
    .eq("campaign_id", campaignId)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const idx = (scenarios ?? []).findIndex(s => s.id === scenarioId);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const swapWith = direction === "down" ? idx + 1 : idx - 1;
  if (swapWith < 0 || swapWith >= (scenarios ?? []).length) return NextResponse.json({ ok: true });

  const a = scenarios![idx];
  const b = scenarios![swapWith];

  const ua = await sb.from("campaign_scenarios").update({ position: b.position }).eq("id", a.id);
  if (ua.error) return NextResponse.json({ error: ua.error.message }, { status: 500 });

  const ub = await sb.from("campaign_scenarios").update({ position: a.position }).eq("id", b.id);
  if (ub.error) return NextResponse.json({ error: ub.error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
