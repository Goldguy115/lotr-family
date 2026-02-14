import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: campaignId } = await context.params;

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("campaign_scenarios")
    .select("id,campaign_id,title,pack_code,scenario_code,position,created_at")
    .eq("campaign_id", campaignId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scenarios: data ?? [] });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: campaignId } = await context.params;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const sb = supabaseServer();

  // position = max + 1
  const maxPos = await sb
    .from("campaign_scenarios")
    .select("position")
    .eq("campaign_id", campaignId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = (maxPos.data?.[0]?.position ?? -1) + 1;

  const { data, error } = await sb
    .from("campaign_scenarios")
    .insert({
      campaign_id: campaignId,
      title,
      pack_code: body.pack_code ?? null,
      scenario_code: body.scenario_code ?? null,
      position: nextPos,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("campaign_log").insert({
    campaign_id: campaignId,
    type: "scenario_added",
    message: `Scenario added: ${title}`,
    meta: { scenario_id: data.id },
  });

  return NextResponse.json({ scenario: data });
}
