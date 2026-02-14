import { NextResponse } from "next/server";
import { requireFamilySession } from "@/lib/familyAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  if (!(await requireFamilySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("campaign_summaries")
    .select("id,name,ruleset,created_at,updated_at,players,decks,score_total")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data ?? [] });
}
