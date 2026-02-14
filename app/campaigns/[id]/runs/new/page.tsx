"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Scenario = { id: string; title: string; position: number };
type DeckSummary = { id: string; name: string };

export default function NewRunPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = params.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [decks, setDecks] = useState<DeckSummary[]>([]);

  const [scenarioId, setScenarioId] = useState<string>("");
  const [playedAt, setPlayedAt] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [result, setResult] = useState<"win" | "loss" | "concede">("win");
  const [score, setScore] = useState<string>("");
  const [rounds, setRounds] = useState<string>("");
  const [threatEnd, setThreatEnd] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [deckRoleById, setDeckRoleById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, dRes] = await Promise.all([
          fetch(`/api/campaigns/${campaignId}/scenarios`, { credentials: "same-origin" }),
          fetch(`/api/decks/summary`, { credentials: "same-origin" }),
        ]);

        const sj = await sRes.json();
        const dj = await dRes.json();

        if (!sRes.ok) throw new Error(sj.error);
        if (!dRes.ok) throw new Error(dj.error);

        setScenarios((sj.scenarios ?? []).sort((a: any, b: any) => a.position - b.position));
        setDecks((dj.decks ?? []).map((x: any) => ({ id: x.id, name: x.name })));
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  async function save() {
    setBusy(true);
    try {
      const deck_links = Object.entries(deckRoleById)
        .filter(([_, role]) => role)
        .map(([deck_id, role]) => ({ deck_id, role }));

      const payload: any = {
        scenario_id: scenarioId || null,
        played_at: playedAt,
        result,
        notes: notes.trim() || null,
        deck_links,
      };

      if (score) payload.score = Number(score);
      if (rounds) payload.rounds = Number(rounds);
      if (threatEnd) payload.threat_end = Number(threatEnd);

      const res = await fetch(`/api/campaigns/${campaignId}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error);

      router.push(`/campaigns/${campaignId}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Log Run</h1>

      {err && <div className="p-2 bg-red-100 border border-red-300">{err}</div>}

      <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="border rounded p-2 w-full">
        <option value="">Select scenario</option>
        {scenarios.map((s) => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>

      <input type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} className="border rounded p-2 w-full" />

      <select value={result} onChange={(e) => setResult(e.target.value as any)} className="border rounded p-2 w-full">
        <option value="win">Win</option>
        <option value="loss">Loss</option>
        <option value="concede">Concede</option>
      </select>

      <input placeholder="Score" value={score} onChange={(e) => setScore(e.target.value)} className="border rounded p-2 w-full" />
      <input placeholder="Rounds" value={rounds} onChange={(e) => setRounds(e.target.value)} className="border rounded p-2 w-full" />
      <input placeholder="End Threat" value={threatEnd} onChange={(e) => setThreatEnd(e.target.value)} className="border rounded p-2 w-full" />

      <div>
        <h2 className="font-semibold mb-2">Decks Used</h2>
        {decks.map((d) => (
          <div key={d.id} className="flex justify-between items-center border p-2 rounded mb-2">
            <span>{d.name}</span>
            <select
              className="border rounded p-1"
              value={deckRoleById[d.id] ?? ""}
              onChange={(e) =>
                setDeckRoleById((prev) => ({ ...prev, [d.id]: e.target.value }))
              }
            >
              <option value="">Not used</option>
              <option value="p1">Player 1</option>
              <option value="p2">Player 2</option>
              <option value="p3">Player 3</option>
              <option value="p4">Player 4</option>
            </select>
          </div>
        ))}
      </div>

      <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="border rounded p-2 w-full" />

      <button onClick={save} disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded">
        {busy ? "Saving..." : "Save Run"}
      </button>

      <Link href={`/campaigns/${campaignId}`} className="block text-sm underline">
        Cancel
      </Link>
    </div>
  );
}
