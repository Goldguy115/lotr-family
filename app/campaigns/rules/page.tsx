// app/campaigns/rules/page.tsx
"use client";

import Link from "next/link";

const OFFICIAL_RULES_PDF =
  "https://images-cdn.fantasyflightgames.com/filer_public/f2/87/f28704b2-5f25-4fd8-be7a-18d4a5d2c1c4/mec101_core_set_rules_reference_v10c-compressed.pdf";

export default function CampaignRulesPage() {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-semibold">Campaign Rules</h1>
        <Link href="/campaigns" className="px-3 py-2 rounded border hover:bg-gray-50">
          Back to Campaigns
        </Link>
      </div>

      <div className="p-4 rounded border space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={OFFICIAL_RULES_PDF}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded bg-black text-white hover:opacity-90"
          >
            Open Official Rules PDF
          </a>
          <span className="text-sm opacity-70">
            This page is a quick reference + link to the official PDF.
          </span>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Quick Reference (for starting/running a campaign)</h2>

          <div className="p-3 rounded border bg-gray-50">
            <div className="font-medium mb-1">What we track in this app</div>
            <ul className="list-disc pl-5 text-sm space-y-1 opacity-90">
              <li>
                <b>Campaign Log</b> fields (Players, Heroes, Fallen Heroes, Threat Penalty, Notes)
              </li>
              <li>
                <b>Scenarios Completed</b> table built from your logged runs (date/result/score)
              </li>
              <li>
                <b>Campaign Pool</b> (Boons / Burdens) and a <b>Campaign Total</b> score
              </li>
            </ul>
          </div>

          <div className="p-3 rounded border">
            <div className="font-medium mb-1">How to use it (simple flow)</div>
            <ol className="list-decimal pl-5 text-sm space-y-1 opacity-90">
              <li>Create a campaign (name + optional description).</li>
              <li>Add scenarios you plan to play (or skip and just log runs).</li>
              <li>Before playing, check Campaign Log + Boons/Burdens.</li>
              <li>After playing, log a run (win/loss, score, notes, decks used).</li>
              <li>Update Fallen Heroes / Threat Penalty / Notes if needed.</li>
            </ol>
          </div>

          <div className="p-3 rounded border">
            <div className="font-medium mb-1">House rules (optional)</div>
            <div className="text-sm opacity-80">
              If your family uses house rules, put them in the Campaign Notes box on the campaign page
              so everyone sees them before logging a new run.
            </div>
          </div>

          <div className="text-sm opacity-70">
            For full definitions, timing rules, and official wording, use the PDF link above.
          </div>
        </div>
      </div>
    </div>
  );
}
