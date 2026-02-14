"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleset, setRuleset] = useState("custom");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          ruleset,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? "Failed to create campaign");
        return;
      }

      const id = j.campaign?.id;
      if (id) router.push(`/campaigns/${id}`);
      else router.push("/campaigns");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">New Campaign</h1>
        <Link href="/campaigns" className="text-sm hover:underline">
          Back to Campaigns
        </Link>
      </div>

      {err && (
        <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800">
          {err}
        </div>
      )}

      <div className="p-4 rounded border space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Saga Playthrough 2026"'
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ruleset</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={ruleset}
            onChange={(e) => setRuleset(e.target.value)}
          >
            <option value="custom">custom</option>
            <option value="saga">saga</option>
            <option value="cycle">cycle</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[90px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes about this campaign, house rules, who plays, etc."
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link href="/campaigns" className="px-3 py-2 rounded border hover:bg-gray-50">
            Cancel
          </Link>
          <button
            className="px-3 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-50"
            disabled={busy || !name.trim()}
            onClick={create}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
