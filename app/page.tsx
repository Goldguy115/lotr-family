import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      padding: 16,
      border: "1px solid rgba(255,255,255,.12)",
      borderRadius: 14,
      background: "rgba(17,26,46,.75)"
    }}>
      <h1 style={{ marginTop: 0 }}>LOTR LCG Family Deckbuilder</h1>
      <p style={{ opacity: 0.8 }}>
        If you can see this, your edits are working. Next we’ll connect Supabase and add Collection/Deck pages.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link href="/collection">Collection</Link>
        <Link href="/decks">Decks</Link>
      </div>
    </div>
  );
}
