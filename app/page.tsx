"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // If logged in, go to Collection; otherwise go to Login
      const res = await fetch("/api/me", { credentials: "same-origin" });
      router.replace(res.ok ? "/collection" : "/login");
    })();
  }, [router]);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Loading…</h2>
      <p className="muted">Redirecting…</p>
    </div>
  );
}
