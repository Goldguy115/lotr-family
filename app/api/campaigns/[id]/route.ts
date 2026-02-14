import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const sb = supabaseServer();

  const { data, error } = await sb
    .from("campaigns")
    .select("id,name,description,ruleset,created_at,updated_at")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ campaign: data });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const patch: any = {};
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.description !== undefined) patch.description = body.description == null ? null : String(body.description);
  if (body.ruleset != null) patch.ruleset = String(body.ruleset).trim() || "custom";

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("campaigns")
    .update(patch)
    .eq("id", id)
    .select("id,name,description,ruleset,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("campaign_log").insert({
    campaign_id: id,
    type: "campaign_updated",
    message: `Campaign updated`,
    meta: patch,
  });

  return NextResponse.json({ campaign: data });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const sb = supabaseServer();

  const { error } = await sb.from("campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
