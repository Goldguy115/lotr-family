import "./globals.css";
import Link from "next/link";

export const metadata = { title: "LOTR LCG Family Deckbuilder" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
  <body suppressHydrationWarning>
        <header className="topbar">
          <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>LOTR LCG • Family</strong>
            <nav className="nav">
              <Link href="/collection">Collection</Link>
              <Link href="/decks">Decks</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
