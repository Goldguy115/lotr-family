"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Deck = { id: string; name: string };

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/decks", { credentials: "same-origin" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? "Failed to load decks");
    setDecks(j.decks ?? []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create() {
    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? "Failed to create deck");
    setName("");
    await load();
  }

  async function del(deckId: string, deckName: string) {
    if (!confirm(`Delete "${deckName}"?\n\nThis cannot be undone.`)) return;

    const res = await fetch(`/api/decks/${deckId}/delete`, {
      method: "POST",
      credentials: "same-origin",
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j.error ?? "Delete failed");
      return;
    }
    await load();
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Decks</h2>

      <div className="row" style={{ gap: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New deck name…"
        />
        <button className="btn" onClick={create}>Create</button>
      </div>

      <hr className="sep" />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {decks.map((d) => (
          <div key={d.id} className="row" style={{ justifyContent: "space-between", gap: 10 }}>
            <Link
              href={`/decks/${d.id}`}
              className="row"
              style={{ justifyContent: "space-between", flex: "1 1 auto" }}
            >
              <span style={{ fontWeight: 650 }}>{d.name}</span>
              <span className="small">Open →</span>
            </Link>

            <button className="btn secondary" onClick={() => del(d.id, d.name)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
