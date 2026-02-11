"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setErr(null);
const res = await fetch("/api/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  credentials: "same-origin",        // <- add this
  body: JSON.stringify({ passcode }),
});


    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Login failed");
      return;
    }

    router.push("/collection");
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h1 style={{ marginTop: 0 }}>Family Login</h1>
      <p className="muted">Enter the shared passcode to use the family collection and decks.</p>
      <input
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Passcode"
        type="password"
        style={{ width: "100%" }}
      />
      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button className="btn" onClick={submit}>Login</button>
      </div>
      {err ? <p style={{ color: "salmon", marginTop: 12 }}>{err}</p> : null}
    </div>
  );
}
