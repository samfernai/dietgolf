"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_HANDICAP } from "@/lib/golf/scoring";

type Mode = "register" | "signin";

export default function JoinForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [handicap, setHandicap] = useState("18");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, pin, handicap: Number(handicap) || 0 }),
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

  return (
    <div className="min-h-dvh bg-masters-600 text-white">
      <div className="mx-auto w-full max-w-lg px-4 pb-16 pt-[calc(env(safe-area-inset-top,0px)+2rem)]">
        <Link href="/" className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-400">
          ← Diet Golf
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold">
          {mode === "register" ? "Register your name" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-white/80">
          {mode === "register"
            ? "Pick a name your group will recognise on the board, and a 4-digit PIN so only you can fill in your card."
            : "Your name and PIN, and you're back on the course."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
              Player name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
              autoCapitalize="words"
              maxLength={30}
              required
              placeholder="Sam F"
              className="mt-1.5 w-full rounded-xl border border-white/20 bg-masters-700/70 px-4 py-3.5 text-base text-white placeholder:text-white/40 focus:border-gold-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
              4-digit PIN
            </span>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              pattern="\d{4}"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
              placeholder="0000"
              className="mt-1.5 w-full rounded-xl border border-white/20 bg-masters-700/70 px-4 py-3.5 text-2xl tracking-[0.6em] tabular-nums text-white placeholder:text-white/30 focus:border-gold-400 focus:outline-none"
            />
          </label>

          {mode === "register" && (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                Handicap
              </span>
              <input
                value={handicap}
                onChange={(e) => setHandicap(e.target.value.replace(/\D/g, "").slice(0, 2))}
                inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-white/20 bg-masters-700/70 px-4 py-3.5 text-base tabular-nums text-white focus:border-gold-400 focus:outline-none"
              />
              <span className="mt-1.5 block text-xs text-white/60">
                0 to {MAX_HANDICAP}. Used for the net leaderboard, so everyone gets a game.
                Change it later if it flatters you.
              </span>
            </label>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-[var(--color-under)] px-3 py-2 text-sm font-semibold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gold-400 px-5 py-4 text-base font-bold text-masters-800 shadow-lg shadow-black/20 active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "One moment…" : mode === "register" ? "Tee off" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "register" ? "signin" : "register");
            setError(null);
          }}
          className="mt-6 w-full text-center text-sm text-white/75 underline"
        >
          {mode === "register" ? "Already registered? Sign in" : "New player? Register"}
        </button>
      </div>
    </div>
  );
}
