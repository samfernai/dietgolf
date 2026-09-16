"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_HANDICAP } from "@/lib/golf/scoring";

export default function SettingsForm({ handicap: initial }: { handicap: number }) {
  const router = useRouter();
  const [handicap, setHandicap] = useState(String(initial));
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/player", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handicap: Number(handicap) || 0 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(data.error ?? "Couldn't save that.");
        return;
      }
      setHandicap(String(data.handicap));
      setStatus("Handicap updated.");
      router.refresh();
    } catch {
      setStatus("Couldn't reach the clubhouse.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={save} className="surface rounded-2xl p-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider muted">Handicap</span>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={MAX_HANDICAP}
              value={Number(handicap) || 0}
              onChange={(e) => setHandicap(e.target.value)}
              className="h-2 flex-1 accent-[var(--color-masters-500)]"
            />
            <input
              value={handicap}
              onChange={(e) => setHandicap(e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              className="w-16 rounded-lg border border-[color:var(--line)] bg-transparent px-2 py-2 text-center text-lg font-bold tabular-nums focus:border-masters-500 focus:outline-none"
            />
          </div>
        </label>
        <p className="mt-2 text-xs muted">
          Changing your handicap updates this week&apos;s card too. Finished weeks keep the handicap
          you played them off.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-masters-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save handicap"}
        </button>
        {status && <p className="mt-2 text-center text-xs font-semibold muted">{status}</p>}
      </form>

      <button
        type="button"
        onClick={signOut}
        className="mt-4 w-full rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm font-bold text-[var(--color-under)]"
      >
        Sign out
      </button>
    </>
  );
}
