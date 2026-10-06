"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BODY_LIMITS, SEXES, maintenanceCalories, type Sex } from "@/lib/golf/calories";
import { MAX_HANDICAP } from "@/lib/golf/scoring";

type Mode = "register" | "signin";

const SEX_LABELS: Record<Sex, string> = {
  male: "Male",
  female: "Female",
  unspecified: "Rather not say",
};

const FIELD = "mt-1.5 w-full rounded-xl border border-white/20 bg-masters-700/70 px-4 py-3.5 text-base text-white placeholder:text-white/40 focus:border-gold-400 focus:outline-none";
const LABEL = "text-xs font-bold uppercase tracking-wider text-gold-400";

export default function JoinForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [handicap, setHandicap] = useState("18");
  const [sex, setSex] = useState<Sex>("unspecified");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [age, setAge] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const numbers = { heightCm: Number(heightCm), weightKg: Number(weightKg), age: Number(age) };
  const complete =
    Number.isFinite(numbers.heightCm) &&
    Number.isFinite(numbers.weightKg) &&
    Number.isFinite(numbers.age) &&
    numbers.heightCm >= BODY_LIMITS.heightCm.min &&
    numbers.weightKg >= BODY_LIMITS.weightKg.min &&
    numbers.age >= BODY_LIMITS.age.min;

  const maintenance = complete ? maintenanceCalories({ sex, ...numbers }) : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "register" && step === 1) {
      if (name.trim().length < 2 || pin.length !== 4) {
        setError("A name and a four-digit PIN, please.");
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          pin,
          handicap: Number(handicap) || 0,
          sex,
          ...numbers,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      router.replace("/play");
      router.refresh();
    } catch {
      setError("Couldn't reach the clubhouse. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === "register";

  return (
    <div className="min-h-dvh bg-masters-600 text-white">
      <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-[calc(env(safe-area-inset-top,0px)+2rem)]">
        <Link href="/" className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-400">
          ← Diet Golf
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold">
          {!registering ? "Welcome back" : step === 1 ? "Register your name" : "Your numbers"}
        </h1>
        <p className="mt-2 text-sm text-white/80">
          {!registering
            ? "Your name and PIN, and you're back on the course."
            : step === 1
              ? "Pick a name your group will recognise on the board, and a 4-digit PIN so only you can fill in your card."
              : "Scoring works from the calories your body needs to hold its weight, so it needs a few numbers to work that out."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          {(!registering || step === 1) && (
            <>
              <label className="block">
                <span className={LABEL}>Player name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="words"
                  maxLength={30}
                  required
                  placeholder="Sam F"
                  className={FIELD}
                />
              </label>

              <label className="block">
                <span className={LABEL}>4-digit PIN</span>
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  pattern="\d{4}"
                  autoComplete={registering ? "new-password" : "current-password"}
                  required
                  placeholder="0000"
                  className={`${FIELD} text-2xl tracking-[0.6em] tabular-nums`}
                />
              </label>

              {registering && (
                <label className="block">
                  <span className={LABEL}>Handicap</span>
                  <input
                    value={handicap}
                    onChange={(e) => setHandicap(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    inputMode="numeric"
                    className={`${FIELD} tabular-nums`}
                  />
                  <span className="mt-1.5 block text-xs text-white/60">
                    0 to {MAX_HANDICAP}. Used for the net leaderboard, so everyone gets a game.
                  </span>
                </label>
              )}
            </>
          )}

          {registering && step === 2 && (
            <>
              <fieldset>
                <legend className={LABEL}>Sex</legend>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {SEXES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSex(option)}
                      className={`rounded-xl border px-2 py-3 text-sm font-semibold transition ${
                        sex === option
                          ? "border-gold-400 bg-gold-400 text-masters-800"
                          : "border-white/20 bg-masters-700/70 text-white"
                      }`}
                    >
                      {SEX_LABELS[option]}
                    </button>
                  ))}
                </div>
                <span className="mt-1.5 block text-xs text-white/60">
                  Sets both your calorie needs and the scoring bands — women play off bands 15%
                  tighter. &ldquo;Rather not say&rdquo; uses the base table.
                </span>
              </fieldset>

              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className={LABEL}>Height</span>
                  <input
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    inputMode="numeric"
                    required
                    placeholder="180"
                    className={`${FIELD} tabular-nums`}
                  />
                  <span className="mt-1 block text-[11px] text-white/60">cm</span>
                </label>
                <label className="block">
                  <span className={LABEL}>Weight</span>
                  <input
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    inputMode="numeric"
                    required
                    placeholder="82"
                    className={`${FIELD} tabular-nums`}
                  />
                  <span className="mt-1 block text-[11px] text-white/60">kg</span>
                </label>
                <label className="block">
                  <span className={LABEL}>Age</span>
                  <input
                    value={age}
                    onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                    inputMode="numeric"
                    required
                    placeholder="41"
                    className={`${FIELD} tabular-nums`}
                  />
                  <span className="mt-1 block text-[11px] text-white/60">years</span>
                </label>
              </div>

              <div
                aria-live="polite"
                className="rounded-xl border border-gold-400/40 bg-masters-700/70 px-4 py-4 text-center"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-gold-400">
                  Your maintenance
                </div>
                <div className="mt-1 font-display text-4xl font-bold tabular-nums">
                  {maintenance ? maintenance.toLocaleString() : "—"}
                </div>
                <div className="text-xs text-white/70">calories a day to hold your weight</div>
                <p className="mt-3 text-left text-xs leading-relaxed text-white/60">
                  Eat around this and you make par. It assumes a sedentary baseline, because the
                  exercise you log gets subtracted separately — otherwise your bike ride would count
                  twice.
                </p>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-[var(--color-under)] px-3 py-2 text-sm font-semibold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || (registering && step === 2 && !complete)}
            className="w-full rounded-xl bg-gold-400 px-5 py-4 text-base font-bold text-masters-800 shadow-lg shadow-black/20 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "One moment…" : registering ? (step === 1 ? "Next" : "Tee off") : "Sign in"}
          </button>

          {registering && step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-sm text-white/70 underline"
            >
              Back
            </button>
          )}
        </form>

        {step === 1 && (
          <button
            type="button"
            onClick={() => {
              setMode(registering ? "signin" : "register");
              setError(null);
            }}
            className="mt-6 w-full text-center text-sm text-white/75 underline"
          >
            {registering ? "Already registered? Sign in" : "New player? Register"}
          </button>
        )}
      </div>
    </div>
  );
}
