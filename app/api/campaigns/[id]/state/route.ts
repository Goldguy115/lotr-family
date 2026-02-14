// app/api/campaigns/[id]/state/route.ts
import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

// GET: return/create campaign_state row
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const sb = supabaseServer();

  const existing = await sb.from("campaign_state").select("*").eq("campaign_id", id).maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });

  if (!existing.data) {
    const ins = await sb.from("campaign_state").insert({ campaign_id: id }).select("*").single();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    return NextResponse.json({ state: ins.data });
  }

  return NextResponse.json({ state: existing.data });
}

// PATCH: update (or insert if missing) campaign_state
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const patch: any = {};
  const textFields = [
    "player1","player2","player3","player4",
    "heroes_p1","heroes_p2","heroes_p3","heroes_p4",
    "fallen_heroes","notes","boons","burdens"
  ];
  for (const f of textFields) if (Object.prototype.hasOwnProperty.call(body, f)) patch[f] = body[f] === null ? null : String(body[f]);

  if (Object.prototype.hasOwnProperty.call(body, "threat_penalty")) patch.threat_penalty = Number(body.threat_penalty) || 0;
  if (Object.prototype.hasOwnProperty.call(body, "campaign_total_override")) {
    patch.campaign_total_override = body.campaign_total_override == null ? null : Number(body.campaign_total_override);
  }

  const sb = supabaseServer();

  // Try update
  const { data: updated, error: updateErr } = await sb
    .from("campaign_state")
    .update(patch)
    .eq("campaign_id", id)
    .select("*")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (updated) return NextResponse.json({ state: updated });

  // Fallback insert
  const insertObj = { campaign_id: id, ...patch };
  const { data: inserted, error: insertErr } = await sb.from("campaign_state").insert(insertObj).select("*").single();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ state: inserted });
}
