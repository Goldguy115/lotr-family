import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("campaigns")
    .select("id,name,description,ruleset,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await requireFamilySession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const description = body.description == null ? null : String(body.description);
  const ruleset = String(body.ruleset ?? "custom").trim() || "custom";

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("campaigns")
    .insert({ name, description, ruleset })
    .select("id,name,description,ruleset,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // optional log
  await sb.from("campaign_log").insert({
    campaign_id: data.id,
    type: "campaign_created",
    message: `Campaign created: ${data.name}`,
    meta: { ruleset: data.ruleset },
  });

  return NextResponse.json({ campaign: data });
}
