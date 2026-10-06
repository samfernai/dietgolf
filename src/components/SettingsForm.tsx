"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BODY_LIMITS, SEXES, maintenanceCalories, type Sex } from "@/lib/golf/calories";
import { MAX_HANDICAP } from "@/lib/golf/scoring";
import type { PlayerView } from "@/lib/game";

const SEX_LABELS: Record<Sex, string> = {
  male: "Male",
  female: "Female",
  unspecified: "Rather not say",
};

const FIELD =
  "mt-1 w-full rounded-lg border border-[color:var(--line)] bg-transparent px-3 py-2.5 text-base tabular-nums focus:border-masters-500 focus:outline-none";
const LABEL = "text-[11px] font-bold uppercase tracking-wider muted";

export default function SettingsForm({ player }: { player: PlayerView }) {
  const router = useRouter();
  const [handicap, setHandicap] = useState(String(player.handicap));
  const [sex, setSex] = useState<Sex>(player.sex);
  const [heightCm, setHeightCm] = useState(player.heightCm ? String(player.heightCm) : "");
  const [weightKg, setWeightKg] = useState(player.weightKg ? String(player.weightKg) : "");
  const [age, setAge] = useState(player.age ? String(player.age) : "");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const numbers = { heightCm: Number(heightCm), weightKg: Number(weightKg), age: Number(age) };
  const complete =
    numbers.heightCm >= BODY_LIMITS.heightCm.min &&
    numbers.weightKg >= BODY_LIMITS.weightKg.min &&
    numbers.age >= BODY_LIMITS.age.min;
  const maintenance = complete ? maintenanceCalories({ sex, ...numbers }) : null;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/player", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handicap: Number(handicap) || 0, sex, ...numbers }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(data.error ?? "Couldn't save that.");
        return;
      }
      setStatus("Saved.");
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
        <h2 className="text-sm font-bold">Your numbers</h2>
        <p className="mt-1 text-xs muted">
          These set the calories you need to hold your weight, which is the line every hole is scored
          against.
        </p>

        <fieldset className="mt-3">
          <legend className={LABEL}>Sex</legend>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {SEXES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSex(option)}
                className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition ${
                  sex === option
                    ? "border-masters-500 bg-masters-500 text-white"
                    : "border-[color:var(--line)]"
                }`}
              >
                {SEX_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="block">
            <span className={LABEL}>Height (cm)</span>
            <input
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              className={FIELD}
            />
          </label>
          <label className="block">
            <span className={LABEL}>Weight (kg)</span>
            <input
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              className={FIELD}
            />
          </label>
          <label className="block">
            <span className={LABEL}>Age</span>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              className={FIELD}
            />
          </label>
        </div>

        <div className="mt-3 rounded-lg bg-cream-100 px-3 py-3 text-center dark:bg-masters-800">
          <div className={LABEL}>Maintenance</div>
          <div className="font-display text-3xl font-bold tabular-nums">
            {maintenance ? maintenance.toLocaleString() : "—"}
          </div>
          <div className="text-xs muted">calories a day</div>
        </div>

        <label className="mt-4 block">
          <span className={LABEL}>Handicap</span>
          <div className="mt-1 flex items-center gap-3">
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
          Changing any of this updates the current week. Days you have already closed out keep the
          figures you played them off.
        </p>

        <button
          type="submit"
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-masters-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
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
