// app/campaigns/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  ruleset: string;
  created_at: string;
  updated_at: string;
};

type Scenario = {
  id: string;
  campaign_id: string;
  title: string;
  pack_code: string | null;
  scenario_code: string | null;
  position: number;
  created_at: string;
};

type Run = {
  id: string;
  campaign_id: string;
  scenario_id: string | null;
  played_at: string;
  result: "win" | "loss" | "concede";
  score: number | null;
  threat_end: number | null;
  rounds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CampaignState = {
  campaign_id: string;

  player1: string | null;
  player2: string | null;
  player3: string | null;
  player4: string | null;

  heroes_p1: string | null;
  heroes_p2: string | null;
  heroes_p3: string | null;
  heroes_p4: string | null;

  fallen_heroes: string | null;
  threat_penalty: number;

  notes: string | null;

  boons: string | null;
  burdens: string | null;

  campaign_total_override: number | null;
  updated_at: string;
};

function fmtDate(isoOrDate: string) {
  try {
    return new Date(isoOrDate).toLocaleDateString();
  } catch {
    return isoOrDate;
  }
}

function formatHeroesBlock(deckName: string, heroes: { code: string; name: string | null }[]) {
  const lines = [`Deck: ${deckName}`];
  for (const h of heroes ?? []) {
    const label = h.name ? `${h.code} — ${h.name}` : h.code;
    lines.push(`- ${label}`);
  }
  return lines.join("\n");
}


function clampInt(n: any, def = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return def;
  return Math.trunc(x);
}

type LatestRunDecksResponse = {
  run: { id: string; played_at: string; result: string; scenario_id: string | null } | null;
  decks: {
    id: string;
    name: string;
    heroes: { code: string; name: string | null }[];
  }[];
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = params.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [state, setState] = useState<CampaignState | null>(null);

  // scenario add/reorder
  const [newScenarioTitle, setNewScenarioTitle] = useState("");
  const [busyScenario, setBusyScenario] = useState(false);

  // saving state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimer = useRef<number | null>(null);
  const saveAbortRef = useRef<AbortController | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function autofillHeroesFromLatestRun(opts?: { overwrite?: boolean }) {
  setErr(null);
  try {
    const res = await fetch(`/api/campaigns/${campaignId}/runs/latest`, {
      credentials: "same-origin",
    });
    const j = (await res.json().catch(() => ({}))) as Partial<LatestRunDecksResponse>;

    if (!res.ok) {
      setErr((j as any)?.error ?? "Failed to load latest run decks");
      return;
    }

    const decks = j.decks ?? [];
    if (!decks.length) {
      setErr("Latest run has no linked decks (or no runs yet).");
      return;
    }

    // Build up to 4 blocks (Player 1–4). If >4 decks, shove extras into P4.
    const blocks: string[] = [];
    for (const d of decks) blocks.push(formatHeroesBlock(d.name, d.heroes));

    const p = (state ?? {}) as any;

    const overwrite = !!opts?.overwrite;

    const nextPatch: any = {};

    // Only fill empty fields unless overwrite=true
    const slots: Array<keyof CampaignState> = ["heroes_p1", "heroes_p2", "heroes_p3", "heroes_p4"];

    for (let i = 0; i < Math.min(4, blocks.length); i++) {
      const k = slots[i];
      const cur = String(p[k] ?? "").trim();
      if (overwrite || !cur) nextPatch[k] = blocks[i];
    }

    if (blocks.length > 4) {
      const extras = blocks.slice(4);
      const k = "heroes_p4";
      const cur = String(p[k] ?? "").trim();
      const merged = (overwrite || !cur)
        ? [blocks[3], ...extras].join("\n\n")
        : [cur, ...extras].join("\n\n");
      nextPatch[k] = merged;
    }

    // Apply locally + autosave
    patchStateLocal(nextPatch);
  } catch (e: any) {
    setErr(e?.message ?? "Autofill failed");
  }
}

  async function loadAll() {
    setErr(null);
    setLoading(true);
    try {
      const [cRes, sRes, rRes, stRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`, { credentials: "same-origin" }),
        fetch(`/api/campaigns/${campaignId}/scenarios`, { credentials: "same-origin" }),
        fetch(`/api/campaigns/${campaignId}/runs`, { credentials: "same-origin" }),
        fetch(`/api/campaigns/${campaignId}/state`, { credentials: "same-origin" }),
      ]);

      const cj = await cRes.json().catch(() => ({}));
      const sj = await sRes.json().catch(() => ({}));
      const rj = await rRes.json().catch(() => ({}));
      const stj = await stRes.json().catch(() => ({}));

      if (!cRes.ok) throw new Error(cj.error ?? "Failed to load campaign");
      if (!sRes.ok) throw new Error(sj.error ?? "Failed to load scenarios");
      if (!rRes.ok) throw new Error(rj.error ?? "Failed to load runs");
      if (!stRes.ok) throw new Error(stj.error ?? "Failed to load campaign state");

      setCampaign(cj.campaign ?? null);
      setScenarios(sj.scenarios ?? []);
      setRuns(rj.runs ?? []);
      setState(stj.state ?? null);

      setSaveStatus("idle");
    } catch (e: any) {
      setErr(e?.message ?? "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const scenarioTitleById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of scenarios) m[s.id] = s.title;
    return m;
  }, [scenarios]);

  const scenariosSorted = useMemo(() => {
    return scenarios.slice().sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  }, [scenarios]);

  const runsSorted = useMemo(() => {
    // API already sorts newest first, but keep deterministic
    return runs.slice().sort((a, b) => (b.played_at ?? "").localeCompare(a.played_at ?? "") || b.created_at.localeCompare(a.created_at));
  }, [runs]);

  const computedTotalScore = useMemo(() => {
    // Sum scores that exist; you can refine later (exclude losses, etc.) if you want.
    let total = 0;
    for (const r of runs) {
      if (typeof r.score === "number" && Number.isFinite(r.score)) total += r.score;
    }
    // Threat penalty is a campaign log field; if you want it included, subtract here.
    // Right now we just show threat penalty separately and keep total = sum(scores).
    return total;
  }, [runs]);

  function patchStateLocal(patch: Partial<CampaignState>) {
    setState((prev) => (prev ? { ...prev, ...patch } : prev));
    scheduleAutosave();
  }

  function scheduleAutosave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = window.setTimeout(() => {
      void saveState();
    }, 800);
  }

async function saveState() {
  if (!state) return;

  if (saveTimer.current) {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
  }

  // Abort any in-flight save so older responses can't overwrite newer typing
  if (saveAbortRef.current) {
    saveAbortRef.current.abort();
  }
  const controller = new AbortController();
  saveAbortRef.current = controller;

  setSaveStatus("saving");
  setErr(null);

  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const payload = {
      player1: state.player1,
      player2: state.player2,
      player3: state.player3,
      player4: state.player4,

      heroes_p1: state.heroes_p1,
      heroes_p2: state.heroes_p2,
      heroes_p3: state.heroes_p3,
      heroes_p4: state.heroes_p4,

      fallen_heroes: state.fallen_heroes,
      threat_penalty: Number(state.threat_penalty ?? 0),

      notes: state.notes,
      boons: state.boons,
      burdens: state.burdens,
      campaign_total_override: state.campaign_total_override ?? null,
    };

    const res = await fetch(`/api/campaigns/${campaignId}/state`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      signal: controller.signal,
      body: JSON.stringify(payload),
    });

    window.clearTimeout(timeout);

    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaveStatus("error");
      setErr(j?.error ?? `Save failed: ${res.status}`);
      return;
    }

    // Only apply server state if this request wasn't aborted/replaced
    if (!controller.signal.aborted && j?.state?.updated_at) {
  // Only sync server timestamp; do NOT overwrite what the user is typing.
  setState((prev) => (prev ? { ...prev, updated_at: j.state.updated_at } : prev));
}

    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 900);
  } catch (e: any) {
    window.clearTimeout(timeout);

    // If we aborted because a newer save started, do nothing
    if (e?.name === "AbortError") return;

    setErr(e?.message ?? "Save failed");
    setSaveStatus("error");
  }
}


  async function addScenario() {
    const title = newScenarioTitle.trim();
    if (!title) return;
    setBusyScenario(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/scenarios`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? "Failed to add scenario");
        return;
      }
      setNewScenarioTitle("");
      await loadAll();
    } finally {
      setBusyScenario(false);
    }
  }

  async function reorderScenario(scenarioId: string, direction: "up" | "down") {
    const res = await fetch(`/api/campaigns/${campaignId}/scenarios/reorder`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ scenario_id: scenarioId, direction }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error ?? "Reorder failed");
      return;
    }
    await loadAll();
  }

  async function deleteCampaign() {
    if (!confirm("Delete this campaign? This removes all scenarios/runs/log/state for it.")) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE", credentials: "same-origin" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? "Delete failed");
        return;
      }
      router.push("/campaigns");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="text-sm opacity-70">Loading…</div>
      </div>
    );
  }

  const totalToShow = state?.campaign_total_override ?? computedTotalScore;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{campaign?.name ?? "Campaign"}</h1>
            <span className="text-xs px-2 py-1 rounded border opacity-70">
              {(campaign?.ruleset ?? "custom").toUpperCase()}
            </span>
          </div>
          {campaign?.description ? (
            <p className="mt-2 text-sm opacity-80 whitespace-pre-wrap">{campaign.description}</p>
          ) : (
            <p className="mt-2 text-sm opacity-60">No description.</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs opacity-70">
            <span>Updated: {campaign?.updated_at ? new Date(campaign.updated_at).toLocaleString() : "-"}</span>
            <span className="px-2 py-[2px] rounded border">
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                ? "Saved"
                : saveStatus === "error"
                ? "Save error"
                : "Idle"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">

  <Link
    href="/campaigns"
    className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 font-medium"
  >
    ← Back
  </Link>

  <Link
    href="/campaigns/rules"
    className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 font-medium"
  >
    📘 Campaign Rules
  </Link>

  <Link
    href={`/campaigns/${campaignId}/runs/new`}
    className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-sm"
  >
    ➕ Log Run
  </Link>

  <button
    onClick={saveState}
    className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 font-medium"
    disabled={!state || saveStatus === "saving"}
  >
    💾 Save Log
  </button>

  <button
    onClick={deleteCampaign}
    disabled={deleteBusy}
    className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 font-semibold shadow-sm disabled:opacity-50"
  >
    🗑 Delete Campaign
  </button>

</div>

      </div>

      {err && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800">
          {err}
        </div>
      )}

      {/* Sheet-style layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Campaign Log */}
        <div className="p-4 rounded border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Campaign Log</h2>
            <span className="text-xs opacity-60">Sheet-style</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Players */}
            <div className="p-3 rounded border">
              <div className="font-medium mb-2">Players</div>
              <div className="space-y-2">
                {(["player1", "player2", "player3", "player4"] as const).map((k, idx) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-16 text-xs opacity-70">Player {idx + 1}</div>
                    <input
                      className="flex-1 border rounded px-2 py-1"
                      value={(state?.[k] ?? "") as string}
                      onChange={(e) => patchStateLocal({ [k]: e.target.value } as any)}
                      placeholder="Name"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Threat Penalty */}
            <div className="p-3 rounded border">
              <div className="font-medium mb-2">Threat Penalty</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-28 border rounded px-2 py-1"
                  value={String(state?.threat_penalty ?? 0)}
                  onChange={(e) => patchStateLocal({ threat_penalty: clampInt(e.target.value, 0) } as any)}
                />
                <div className="text-xs opacity-70">
                  Use this as your “campaign-level penalty” reminder.
                </div>
              </div>
            </div>

            {/* Heroes */}
            <div className="p-3 rounded border md:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-2">
  <div className="font-medium">Heroes</div>
  <div className="flex flex-wrap items-center gap-3 mt-2">

  <button
    className="px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm font-medium shadow-sm"
    onClick={() => autofillHeroesFromLatestRun({ overwrite: false })}
  >
    🔄 Autofill From Latest Run
  </button>

  <button
    className="px-3 py-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 text-sm font-medium shadow-sm"
    onClick={() => {
      if (confirm("Overwrite Heroes fields from latest run?")) {
        autofillHeroesFromLatestRun({ overwrite: true });
      }
    }}
  >
    ⚠ Overwrite Heroes
  </button>

</div>

</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(
                  [
                    ["heroes_p1", "Player 1 Heroes"],
                    ["heroes_p2", "Player 2 Heroes"],
                    ["heroes_p3", "Player 3 Heroes"],
                    ["heroes_p4", "Player 4 Heroes"],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k}>
                    <div className="text-xs opacity-70 mb-1">{label}</div>
                    <textarea
                      className="w-full border rounded px-2 py-1 min-h-[64px]"
                      value={(state?.[k] ?? "") as string}
                      onChange={(e) => patchStateLocal({ [k]: e.target.value } as any)}
                      placeholder="Type hero names (or later we can auto-fill from linked decks)"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Fallen Heroes */}
            <div className="p-3 rounded border md:col-span-2">
              <div className="font-medium mb-2">Fallen Heroes</div>
              <textarea
                className="w-full border rounded px-2 py-1 min-h-[90px]"
                value={state?.fallen_heroes ?? ""}
                onChange={(e) => patchStateLocal({ fallen_heroes: e.target.value } as any)}
                placeholder="List any fallen heroes here"
              />
            </div>

            {/* Notes */}
            <div className="p-3 rounded border md:col-span-2">
              <div className="font-medium mb-2">Campaign Notes</div>
              <textarea
                className="w-full border rounded px-2 py-1 min-h-[120px]"
                value={state?.notes ?? ""}
                onChange={(e) => patchStateLocal({ notes: e.target.value } as any)}
                placeholder="House rules, reminders, story notes, etc."
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Scenarios Completed + Campaign Pool + Total */}
        <div className="space-y-4">
          {/* Scenarios Completed */}
          <div className="p-4 rounded border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Scenarios Completed</h2>
              <span className="text-xs opacity-60">From your logged runs</span>
            </div>

            {runsSorted.length === 0 ? (
              <div className="text-sm opacity-70">No runs logged yet.</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left opacity-70">
                    <tr>
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 pr-2">Scenario</th>
                      <th className="py-2 pr-2">Result</th>
                      <th className="py-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runsSorted.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(r.played_at)}</td>
                        <td className="py-2 pr-2">
                          {r.scenario_id ? scenarioTitleById[r.scenario_id] ?? "Scenario" : "Unlinked"}
                        </td>
                        <td className="py-2 pr-2">
                          <span
                            className={
                              r.result === "win"
                                ? "text-green-700"
                                : r.result === "loss"
                                ? "text-red-700"
                                : ""
                            }
                          >
                            {r.result.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 text-right">{r.score ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs opacity-70">
              <span>Computed total score: {computedTotalScore}</span>
              <span>Threat penalty (separate): {state?.threat_penalty ?? 0}</span>
            </div>
          </div>

          {/* Campaign Pool */}
          <div className="p-4 rounded border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Campaign Pool</h2>
              <span className="text-xs opacity-60">Boons / Burdens</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="font-medium mb-1">Boons</div>
                <textarea
                  className="w-full border rounded px-2 py-1 min-h-[140px]"
                  value={state?.boons ?? ""}
                  onChange={(e) => patchStateLocal({ boons: e.target.value } as any)}
                  placeholder="List boons here"
                />
              </div>
              <div>
                <div className="font-medium mb-1">Burdens</div>
                <textarea
                  className="w-full border rounded px-2 py-1 min-h-[140px]"
                  value={state?.burdens ?? ""}
                  onChange={(e) => patchStateLocal({ burdens: e.target.value } as any)}
                  placeholder="List burdens here"
                />
              </div>
            </div>
          </div>

          {/* Campaign Total */}
          <div className="p-4 rounded border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Campaign Total</h2>
              <span className="text-xs opacity-60">Score summary</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="text-2xl font-semibold tabular-nums">{totalToShow}</div>
              {state?.campaign_total_override != null ? (
                <div className="text-sm opacity-70">
                  (Override set — computed: {computedTotalScore})
                </div>
              ) : (
                <div className="text-sm opacity-70">(Computed from run scores)</div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-sm opacity-80">Override total:</label>
              <input
                type="number"
                className="w-32 border rounded px-2 py-1"
                value={state?.campaign_total_override == null ? "" : String(state.campaign_total_override)}
                onChange={(e) =>
                  patchStateLocal({
                    campaign_total_override: e.target.value === "" ? null : clampInt(e.target.value, 0),
                  } as any)
                }
                placeholder="(none)"
              />
              <button
                className="px-3 py-2 rounded border hover:bg-gray-50"
                onClick={() => patchStateLocal({ campaign_total_override: null } as any)}
                disabled={state?.campaign_total_override == null}
              >
                Clear override
              </button>
            </div>

            <div className="mt-2 text-xs opacity-70">
              Tip: If your family tracks campaign scoring differently, set an override.
            </div>
          </div>
        </div>
      </div>

      {/* Scenarios list (still useful for planning + choosing in Log Run dropdown) */}
      <div className="mt-4 p-4 rounded border">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold">Scenario Plan</h2>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-3 py-2 w-[280px] max-w-full"
              placeholder='Add scenario title (e.g. "The Hill Troll")'
              value={newScenarioTitle}
              onChange={(e) => setNewScenarioTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addScenario();
              }}
            />
            <button
              onClick={addScenario}
              disabled={busyScenario || !newScenarioTitle.trim()}
              className="px-3 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-50"
            >
              {busyScenario ? "Adding…" : "Add"}
            </button>
          </div>
        </div>

        {scenariosSorted.length === 0 ? (
          <div className="text-sm opacity-70">No scenarios yet.</div>
        ) : (
          <div className="space-y-2">
            {scenariosSorted.map((s, idx) => (
              <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded border">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {idx + 1}. {s.title}
                  </div>
                  {(s.pack_code || s.scenario_code) && (
                    <div className="text-xs opacity-70 truncate">
                      {s.pack_code ? `pack: ${s.pack_code}` : ""}
                      {s.pack_code && s.scenario_code ? " • " : ""}
                      {s.scenario_code ? `code: ${s.scenario_code}` : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => reorderScenario(s.id, "up")}
                    className="px-2 py-1 rounded border hover:bg-gray-50"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => reorderScenario(s.id, "down")}
                    className="px-2 py-1 rounded border hover:bg-gray-50"
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 text-xs opacity-70">
          This list controls the scenario dropdown in <b>Log Run</b>. Runs can still be logged even if the scenario isn’t listed.
        </div>
      </div>
    </div>
  );
}
