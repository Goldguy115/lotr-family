"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  ruleset?: string;
  created_at?: string;
  updated_at?: string;
  players?: string[];
  decks?: string[];
  score_total?: number;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sortBy, setSortBy] = useState("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/campaigns/summary", { credentials: "same-origin" });
      const j = await res.json();
      setCampaigns(j.campaigns ?? []);
    }
    load();
  }, []);

  const sorted = useMemo(() => {
    const list = [...campaigns];
    const alpha = (arr?: string[]) => (arr ?? []).join(", ").toLowerCase();

    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.name ?? "").localeCompare(b.name ?? "");
        case "players_alpha":
          return alpha(a.players).localeCompare(alpha(b.players));
        case "players_count":
          return (a.players?.length ?? 0) - (b.players?.length ?? 0);
        case "decks_alpha":
          return alpha(a.decks).localeCompare(alpha(b.decks));
        case "decks_count":
          return (a.decks?.length ?? 0) - (b.decks?.length ?? 0);
        case "score":
          return (a.score_total ?? 0) - (b.score_total ?? 0);
        default:
          return (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
      }
    });

    if (sortDir === "desc") list.reverse();
    return list;
  }, [campaigns, sortBy, sortDir]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Campaigns</h1>

        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="updated">Last updated</option>
            <option value="name">Name (A→Z)</option>
            <option value="players_alpha">Players (A→Z)</option>
            <option value="players_count">Players (Count)</option>
            <option value="decks_alpha">Decks (A→Z)</option>
            <option value="decks_count">Decks (Count)</option>
            <option value="score">Score</option>
          </select>

          <button
            className="px-2 py-1 border rounded text-sm"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* New Campaign Tile */}
        <Link
          href="/campaigns/new"
          className="block rounded-xl border-2 border-dashed p-6 hover:shadow-md transition"
        >
          <div className="text-lg font-semibold">＋ New Campaign</div>
          <div className="text-sm opacity-70 mt-1">
            Start a new campaign log
          </div>
        </Link>

        {sorted.map((c) => (
          <Link
            key={c.id}
            href={`/campaigns/${c.id}`}
            className="block rounded-xl border p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between">
              <div className="font-semibold text-lg">{c.name}</div>
              <div className="text-sm font-medium">Score: {c.score_total ?? 0}</div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {(c.players ?? []).map((p) => (
                <span key={p} className="text-xs px-2 py-1 rounded border bg-gray-50">
                  {p}
                </span>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {(c.decks ?? []).slice(0, 3).map((d) => (
                <span key={d} className="text-xs px-2 py-1 rounded border bg-white">
                  {d}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
