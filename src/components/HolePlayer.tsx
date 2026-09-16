"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import HoleMap from "@/components/HoleMap";
import { ScorePill } from "@/components/ScorePill";
import { slugForDay } from "@/lib/golf/course";
import { formatToPar } from "@/lib/golf/scoring";
import {
  OUTCOMES,
  OUTCOME_SPECS,
  SLOTS,
  SLOT_OUTCOMES,
  SLOT_SPECS,
  type OutcomeKey,
  type SlotKey,
} from "@/lib/golf/shots";
import type { Card } from "@/lib/game";
import { prettyDate } from "@/lib/time";

export default function HolePlayer({ card: initial, dayIndex }: { card: Card; dayIndex: number }) {
  const router = useRouter();
  const [card, setCard] = useState(initial);
  const [open, setOpen] = useState<SlotKey | null>(null);
  const [busy, setBusy] = useState<SlotKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => setCard(initial), [initial]);

  const holeCard = card.holes[dayIndex];
  const { hole, result } = holeCard;
  const bySlot = new Map(holeCard.shots.map((shot) => [shot.slot, shot]));
  const locked = result.status === "future" || !card.editable;

  useEffect(() => {
    setNotes(Object.fromEntries(holeCard.shots.map((shot) => [shot.slot, shot.note ?? ""])));
    setOpen(null);
    // Reload note drafts whenever we move to a different hole.
  }, [dayIndex, holeCard.shots]);

  async function send(method: "POST" | "DELETE", slot: SlotKey, body: Record<string, unknown>) {
    setBusy(slot);
    setError(null);
    try {
      const response = await fetch("/api/shots", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dayIndex, slot, weekKey: card.course.weekKey, ...body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Couldn't save that shot.");
        return;
      }
      setCard(data.card as Card);
      router.refresh();
    } catch {
      setError("Couldn't reach the clubhouse. Your shot wasn't saved.");
    } finally {
      setBusy(null);
    }
  }

  function pick(slot: SlotKey, outcome: OutcomeKey) {
    void send("POST", slot, { outcome, note: notes[slot] ?? null });
    setOpen(null);
  }

  function saveNote(slot: SlotKey) {
    const shot = bySlot.get(slot);
    if (!shot) return;
    const note = notes[slot] ?? "";
    if ((shot.note ?? "") === note.trim()) return;
    void send("POST", slot, { outcome: shot.outcome, note });
  }

  function clear(slot: SlotKey) {
    void send("DELETE", slot, {});
    setOpen(null);
  }

  const prev = dayIndex > 0 ? slugForDay(dayIndex - 1) : null;
  const next = dayIndex < 6 ? slugForDay(dayIndex + 1) : null;

  return (
    <AppShell
      title={`${hole.name}`}
      subtitle={`${card.course.name} · ${prettyDate(hole.date)}`}
      action={
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">Round</div>
          <div className="font-display text-2xl font-bold leading-none text-gold-400">
            {formatToPar(card.summary.thru === 0 ? null : card.summary.toPar)}
          </div>
          <div className="text-[10px] text-white/60">thru {card.summary.thru}</div>
        </div>
      }
    >
      {/* Week strip */}
      <nav aria-label="Holes this week" className="-mx-4 mb-4 overflow-x-auto px-4 no-scrollbar">
        <ul className="flex gap-1.5">
          {card.holes.map((entry) => {
            const active = entry.hole.dayIndex === dayIndex;
            const future = entry.result.status === "future";
            return (
              <li key={entry.hole.dayIndex}>
                <Link
                  href={`/play/${slugForDay(entry.hole.dayIndex)}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-[3.1rem] flex-col items-center rounded-lg border px-1 py-1.5 text-center transition ${
                    active
                      ? "border-masters-500 bg-masters-500 text-white"
                      : "border-[color:var(--line)] surface"
                  } ${future ? "opacity-50" : ""}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {entry.hole.short}
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      entry.result.status === "no-return" ? "opacity-50 italic" : ""
                    }`}
                    title={entry.result.status === "no-return" ? "No return" : undefined}
                  >
                    {entry.result.strokes ?? "–"}
                  </span>
                  <span className={`text-[9px] ${active ? "text-white/70" : "muted"}`}>
                    par {entry.hole.par}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Hole header */}
      <section className="surface rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold">Hole {dayIndex + 1}</span>
              <span className="text-sm font-semibold muted">{hole.day}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold muted">
              <span>Par {hole.par}</span>
              <span>S.I. {hole.strokeIndex}</span>
              <span>{hole.yards} yds</span>
              {result.shotsReceived > 0 && (
                <span className="text-masters-500">
                  {result.shotsReceived} shot{result.shotsReceived > 1 ? "s" : ""} given
                </span>
              )}
            </div>
            {hole.amenCorner && (
              <span className="mt-2 inline-block rounded-full bg-gold-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-masters-800">
                Amen Corner
              </span>
            )}
          </div>
          <div className="text-right">
            <ScorePill toPar={result.toPar} size="lg" />
            <div className="mt-1 text-xs font-semibold muted">
              {result.status === "no-return" && !locked ? "No return — still open" : result.label}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <HoleMap
            seed={hole.designSeed}
            par={hole.par}
            outcomes={holeCard.shots.map((shot) => shot.outcome)}
            holedOut={result.status === "played"}
            className="h-56 w-auto shrink-0 rounded-xl shadow-inner"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider muted">Shot tracker</h2>
            {holeCard.shots.length === 0 ? (
              <p className="mt-2 text-sm muted">
                {locked
                  ? "Nothing played here yet."
                  : result.status === "no-return"
                    ? "Nothing logged for this day yet. Fill it in and the no return disappears."
                    : "Nothing logged yet. Start with breakfast off the tee."}
              </p>
            ) : (
              <ol className="mt-2 space-y-2">
                {holeCard.shots.map((shot, i) => {
                  const spec = OUTCOME_SPECS[shot.outcome];
                  return (
                    <li key={shot.slot} className="flex gap-2 text-xs">
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-masters-900"
                        style={{ background: spec.color }}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug">
                          {SLOT_OUTCOMES[shot.slot][shot.outcome].title}
                        </span>
                        <span className="block muted">
                          {SLOT_SPECS[shot.slot].label}
                          {shot.note ? ` · ${shot.note}` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            {result.status === "played" && (
              <p className="mt-3 text-xs font-semibold text-masters-500">
                Holed out in {result.strokes} for a {result.label.toLowerCase()}.
              </p>
            )}
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-[var(--color-under)] px-3 py-2 text-sm font-semibold text-white">
          {error}
        </p>
      )}

      {/* Shot entry */}
      <section className="mt-5">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider muted">
          {locked ? "Card" : "Play your shots"}
        </h2>

        {result.status === "future" && (
          <p className="surface mb-3 rounded-xl px-4 py-3 text-sm muted">
            This hole opens on {prettyDate(hole.date)}. No playing ahead.
          </p>
        )}
        {!card.editable && (
          <p className="surface mb-3 rounded-xl px-4 py-3 text-sm muted">
            This week&apos;s card is closed. Head to the current course to keep playing.
          </p>
        )}

        <ul className="space-y-2">
          {SLOTS.map((slot) => {
            const spec = SLOT_SPECS[slot];
            const shot = bySlot.get(slot);
            const outcome = shot ? OUTCOME_SPECS[shot.outcome] : null;
            const expanded = open === slot;
            return (
              <li key={slot} className="surface overflow-hidden rounded-xl">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setOpen(expanded ? null : slot)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-60"
                >
                  <span aria-hidden className="text-xl">
                    {spec.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-sm font-bold">{spec.label}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider muted">
                        {spec.shot}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs">
                      {shot ? (
                        <span className="font-semibold">
                          {SLOT_OUTCOMES[slot][shot.outcome].title}
                        </span>
                      ) : (
                        <span className="muted">{locked ? "Not played" : "Tap to log this shot"}</span>
                      )}
                    </span>
                  </span>
                  {outcome && (
                    <span
                      className="shrink-0 rounded-md px-2 py-1 text-[11px] font-bold text-masters-900"
                      style={{ background: outcome.color }}
                    >
                      {outcome.delta > 0 ? `+${outcome.delta}` : outcome.delta === 0 ? "E" : outcome.delta}
                    </span>
                  )}
                  <span aria-hidden className={`shrink-0 muted transition-transform ${expanded ? "rotate-90" : ""}`}>
                    ›
                  </span>
                </button>

                {expanded && !locked && (
                  <div className="border-t border-[color:var(--line)] px-3 pb-3 pt-3">
                    <div className="grid grid-cols-1 gap-1.5">
                      {OUTCOMES.map((key) => {
                        const option = SLOT_OUTCOMES[slot][key];
                        const optionSpec = OUTCOME_SPECS[key];
                        const selected = shot?.outcome === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={busy === slot}
                            onClick={() => pick(slot, key)}
                            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                              selected
                                ? "border-masters-500 bg-masters-50 dark:bg-masters-800"
                                : "border-[color:var(--line)]"
                            }`}
                          >
                            <span
                              aria-hidden
                              className="h-7 w-2 shrink-0 rounded-full"
                              style={{ background: optionSpec.color }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold leading-snug">
                                {optionSpec.emoji} {option.title}
                              </span>
                              <span className="block text-xs muted">{option.hint}</span>
                            </span>
                            <span className="shrink-0 text-xs font-bold tabular-nums muted">
                              {optionSpec.delta > 0 ? `+${optionSpec.delta}` : optionSpec.delta === 0 ? "E" : optionSpec.delta}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <label className="mt-3 block">
                      <span className="text-[11px] font-bold uppercase tracking-wider muted">
                        What happened?
                      </span>
                      <textarea
                        value={notes[slot] ?? ""}
                        onChange={(e) => setNotes({ ...notes, [slot]: e.target.value.slice(0, 280) })}
                        onBlur={() => saveNote(slot)}
                        rows={2}
                        placeholder="Hit one into the trees, as I had a burger for lunch"
                        className="mt-1 w-full resize-none rounded-lg border border-[color:var(--line)] bg-transparent px-3 py-2 text-sm focus:border-masters-500 focus:outline-none"
                      />
                    </label>

                    {shot && (
                      <button
                        type="button"
                        onClick={() => clear(slot)}
                        disabled={busy === slot}
                        className="mt-1 text-xs font-semibold text-[var(--color-under)] underline"
                      >
                        Remove this shot
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <nav className="mt-6 flex items-center justify-between text-sm font-semibold">
        {prev ? (
          <Link href={`/play/${prev}`} className="text-masters-500">
            ← Previous hole
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/play/${next}`} className="text-masters-500">
            Next hole →
          </Link>
        ) : (
          <Link href="/card" className="text-masters-500">
            See the card →
          </Link>
        )}
      </nav>
    </AppShell>
  );
}
