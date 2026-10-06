"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import HoleMap from "@/components/HoleMap";
import { ScorePill } from "@/components/ScorePill";
import type { Card, IntakeView } from "@/lib/game";
import {
  CATEGORY_LABELS,
  INTAKE_CATEGORIES,
  gradeLabel,
  type IntakeCategory,
} from "@/lib/golf/calories";
import { GRADE_LIE, minutesFromTime, timeFromMinutes } from "@/lib/golf/checkpoints";
import { slugForDay } from "@/lib/golf/course";
import { shotsFromCheckpoints, shotsFromOutcomes } from "@/lib/golf/mapping";
import { formatToPar } from "@/lib/golf/scoring";
import { SLOT_OUTCOMES, SLOT_SPECS } from "@/lib/golf/shots";
import { prettyDate } from "@/lib/time";

type Panel = IntakeCategory | "burn";

type FormState = { calories: string; text: string; time: string; entryId: string | null };

const BLANK: FormState = { calories: "", text: "", time: "12:00", entryId: null };

export default function HolePlayer({ card: initial, dayIndex }: { card: Card; dayIndex: number }) {
  const router = useRouter();
  const [card, setCard] = useState(initial);
  const [open, setOpen] = useState<Panel | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCard(initial), [initial]);
  useEffect(() => {
    setOpen(null);
    setError(null);
  }, [dayIndex]);

  const holeCard = card.holes[dayIndex];
  const { hole, result, evaluation } = holeCard;
  const locked = result.status === "future" || !card.editable || holeCard.mode === "ratings";

  const mapShots = useMemo(
    () =>
      holeCard.mode === "calories"
        ? shotsFromCheckpoints(evaluation?.checkpoints ?? [])
        : shotsFromOutcomes(holeCard.shots.map((shot) => shot.outcome)),
    [holeCard, evaluation],
  );

  const byCategory = useMemo(() => {
    const map = new Map<IntakeCategory, IntakeView[]>();
    for (const entry of holeCard.intake) {
      map.set(entry.category, [...(map.get(entry.category) ?? []), entry]);
    }
    return map;
  }, [holeCard.intake]);

  async function send(method: "POST" | "DELETE", url: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dayIndex, weekKey: card.course.weekKey, ...body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Couldn't save that.");
        return false;
      }
      setCard(data.card as Card);
      router.refresh();
      return true;
    } catch {
      setError("Couldn't reach the clubhouse. Nothing was saved.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openPanel(panel: Panel) {
    if (open === panel) {
      setOpen(null);
      return;
    }
    setOpen(panel);
    setForm({
      ...BLANK,
      time:
        panel === "burn"
          ? timeFromMinutes(card.nowMinutes)
          : timeFromMinutes(CATEGORY_LABELS[panel].defaultMinutes),
    });
  }

  async function submit(panel: Panel) {
    const calories = Number(form.calories);
    if (!Number.isFinite(calories) || calories <= 0) {
      setError("Put a calorie figure in first.");
      return;
    }
    const payload =
      panel === "burn"
        ? { kind: "burn", calories, activity: form.text, minutes: minutesFromTime(form.time) }
        : { category: panel, calories, note: form.text, minutes: minutesFromTime(form.time) };

    const saved = await send("POST", "/api/entries", { ...payload, entryId: form.entryId });
    if (saved) setForm({ ...BLANK, time: form.time });
  }

  function editEntry(panel: Panel, entry: { id: string; calories: number; minutes: number; note?: string | null; activity?: string | null }) {
    setOpen(panel);
    setForm({
      calories: String(entry.calories),
      text: entry.note ?? entry.activity ?? "",
      time: timeFromMinutes(entry.minutes),
      entryId: entry.id,
    });
  }

  const prev = dayIndex > 0 ? slugForDay(dayIndex - 1) : null;
  const next = dayIndex < 6 ? slugForDay(dayIndex + 1) : null;
  const balance = evaluation?.balance ?? 0;

  return (
    <AppShell
      title={hole.name}
      subtitle={`${card.course.tournament ?? card.course.name} · ${prettyDate(hole.date)}`}
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
                    active ? "border-masters-500 bg-masters-500 text-white" : "border-[color:var(--line)] surface"
                  } ${future ? "opacity-50" : ""}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">{entry.hole.short}</span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      entry.result.status === "no-return" ? "italic opacity-50" : ""
                    }`}
                  >
                    {entry.result.strokes ?? "–"}
                  </span>
                  <span className={`text-[9px] ${active ? "text-white/70" : "muted"}`}>par {entry.hole.par}</span>
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
              {holeCard.completed
                ? result.label
                : evaluation && result.status !== "future"
                  ? `${gradeLabel(hole.par, evaluation.grade)} pace`
                  : result.label}
            </div>
          </div>
        </div>

        {/* Calorie running total */}
        {holeCard.mode === "calories" && result.status !== "future" && evaluation && (
          <dl className="mt-4 grid grid-cols-4 gap-1 text-center">
            {[
              { label: "Eaten", value: evaluation.intake },
              { label: "Burned", value: evaluation.burn },
              { label: "Needs", value: holeCard.maintenance },
              { label: "Balance", value: balance, highlight: true },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-cream-100 px-1 py-2 dark:bg-masters-800">
                <dt className="text-[10px] font-bold uppercase tracking-wider muted">{item.label}</dt>
                <dd
                  className={`text-sm font-bold tabular-nums ${
                    item.highlight ? (balance <= 0 ? "text-[var(--color-under)]" : "text-masters-500") : ""
                  }`}
                >
                  {item.highlight && balance > 0 ? "+" : ""}
                  {item.value.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-4 flex gap-4">
          <HoleMap
            seed={hole.designSeed}
            par={hole.par}
            shots={mapShots}
            holedOut={result.status === "played"}
            className="h-56 w-auto shrink-0 rounded-xl shadow-inner"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider muted">Shot tracker</h2>

            {holeCard.mode === "ratings" ? (
              <ol className="mt-2 space-y-2">
                {holeCard.shots.map((shot, i) => (
                  <li key={shot.slot} className="text-xs">
                    <span className="font-bold tabular-nums muted">{i + 1}. </span>
                    <span className="font-semibold">{SLOT_OUTCOMES[shot.slot][shot.outcome].title}</span>
                    <span className="block pl-4 muted">{SLOT_SPECS[shot.slot].label}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="mt-2 space-y-2">
                {evaluation?.checkpoints.map((checkpoint) => (
                  <li
                    key={checkpoint.time}
                    className={`flex gap-2 text-xs ${checkpoint.reached ? "" : "opacity-40"}`}
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-masters-900"
                      style={{ background: checkpoint.reached ? GRADE_LIE[checkpoint.grade].color : "transparent", border: checkpoint.reached ? "none" : "1px dashed currentColor" }}
                    >
                      {checkpoint.index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-snug">
                        {checkpoint.time} · {checkpoint.label}
                      </span>
                      <span className="block muted">
                        {checkpoint.reached
                          ? `${GRADE_LIE[checkpoint.grade].label} · ${checkpoint.balance > 0 ? "+" : ""}${checkpoint.balance.toLocaleString()}`
                          : "Still to come"}
                      </span>
                    </span>
                  </li>
                ))}
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

      {!card.player.hasBody && (
        <p className="surface mt-3 rounded-xl px-4 py-3 text-sm">
          <Link href="/settings" className="font-semibold text-masters-500 underline">
            Add your height, weight and age
          </Link>{" "}
          — until then scoring uses a stand-in of {holeCard.maintenance.toLocaleString()} calories a day.
        </p>
      )}

      {holeCard.mode === "ratings" && (
        <p className="surface mt-3 rounded-xl px-4 py-3 text-sm muted">
          This week was played on the old meal ratings, before calorie scoring. It is read-only.
        </p>
      )}

      {result.status === "future" && (
        <p className="surface mt-3 rounded-xl px-4 py-3 text-sm muted">
          This hole opens on {prettyDate(hole.date)}. No playing ahead.
        </p>
      )}

      {/* Logging */}
      {holeCard.mode === "calories" && !locked && (
        <>
          <section className="mt-5">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider muted">What you ate</h2>
            <ul className="space-y-2">
              {INTAKE_CATEGORIES.map((category) => {
                const spec = CATEGORY_LABELS[category];
                const entries = byCategory.get(category) ?? [];
                const total = entries.reduce((sum, entry) => sum + entry.calories, 0);
                return (
                  <li key={category} className="surface overflow-hidden rounded-xl">
                    <button
                      type="button"
                      onClick={() => openPanel(category)}
                      aria-expanded={open === category}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span aria-hidden className="text-xl">{spec.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{spec.label}</span>
                        <span className="block truncate text-xs muted">
                          {entries.length === 0
                            ? "Nothing logged"
                            : entries.map((entry) => entry.note || `${entry.calories} cal`).join(" · ")}
                        </span>
                      </span>
                      {total > 0 && (
                        <span className="shrink-0 rounded-md bg-cream-200 px-2 py-1 text-[11px] font-bold tabular-nums text-masters-800 dark:bg-masters-700 dark:text-white">
                          {total.toLocaleString()}
                        </span>
                      )}
                      <span aria-hidden className={`shrink-0 muted transition-transform ${open === category ? "rotate-90" : ""}`}>›</span>
                    </button>

                    {open === category && (
                      <EntryPanel
                        form={form}
                        setForm={setForm}
                        busy={busy}
                        textLabel="What was it?"
                        textPlaceholder="Chicken salad"
                        onSubmit={() => submit(category)}
                        entries={entries.map((entry) => ({
                          id: entry.id,
                          calories: entry.calories,
                          minutes: entry.minutes,
                          text: entry.note,
                        }))}
                        onEdit={(entry) => editEntry(category, { ...entry, note: entry.text })}
                        onDelete={(id) => send("DELETE", "/api/entries", { entryId: id, kind: "intake" })}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-5">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider muted">What you burned</h2>
            <div className="surface overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => openPanel("burn")}
                aria-expanded={open === "burn"}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span aria-hidden className="text-xl">🚴</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">Exercise</span>
                  <span className="block truncate text-xs muted">
                    {holeCard.burn.length === 0
                      ? "Nothing logged"
                      : holeCard.burn.map((entry) => entry.activity || `${entry.calories} cal`).join(" · ")}
                  </span>
                </span>
                {evaluation && evaluation.burn > 0 && (
                  <span className="shrink-0 rounded-md bg-masters-500 px-2 py-1 text-[11px] font-bold tabular-nums text-white">
                    −{evaluation.burn.toLocaleString()}
                  </span>
                )}
                <span aria-hidden className={`shrink-0 muted transition-transform ${open === "burn" ? "rotate-90" : ""}`}>›</span>
              </button>

              {open === "burn" && (
                <EntryPanel
                  form={form}
                  setForm={setForm}
                  busy={busy}
                  textLabel="What did you do?"
                  textPlaceholder="Bike ride"
                  onSubmit={() => submit("burn")}
                  entries={holeCard.burn.map((entry) => ({
                    id: entry.id,
                    calories: entry.calories,
                    minutes: entry.minutes,
                    text: entry.activity,
                  }))}
                  onEdit={(entry) => editEntry("burn", { ...entry, activity: entry.text })}
                  onDelete={(id) => send("DELETE", "/api/entries", { entryId: id, kind: "burn" })}
                />
              )}
            </div>
          </section>

          <section className="mt-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => send("POST", "/api/day", { complete: !holeCard.completed })}
              className={`w-full rounded-xl px-4 py-4 text-sm font-bold disabled:opacity-60 ${
                holeCard.completed
                  ? "border border-[color:var(--line)] text-[var(--color-under)]"
                  : "bg-masters-500 text-white"
              }`}
            >
              {holeCard.completed ? "Reopen this day" : "Close out the day"}
            </button>
            <p className="mt-2 text-center text-xs muted">
              {holeCard.completed
                ? "This hole is on the card. Reopen it if you need to add something."
                : "The hole only counts once you close the day out. Unclosed past days go down as a no return."}
            </p>
          </section>
        </>
      )}

      <nav className="mt-6 flex items-center justify-between text-sm font-semibold">
        {prev ? <Link href={`/play/${prev}`} className="text-masters-500">← Previous hole</Link> : <span />}
        {next ? (
          <Link href={`/play/${next}`} className="text-masters-500">Next hole →</Link>
        ) : (
          <Link href="/card" className="text-masters-500">See the card →</Link>
        )}
      </nav>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

type PanelEntry = { id: string; calories: number; minutes: number; text: string | null };

function EntryPanel({
  form,
  setForm,
  busy,
  textLabel,
  textPlaceholder,
  entries,
  onSubmit,
  onEdit,
  onDelete,
}: {
  form: FormState;
  setForm: (form: FormState) => void;
  busy: boolean;
  textLabel: string;
  textPlaceholder: string;
  entries: PanelEntry[];
  onSubmit: () => void;
  onEdit: (entry: PanelEntry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border-t border-[color:var(--line)] px-3 pb-3 pt-3">
      {entries.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 rounded-lg bg-cream-100 px-2.5 py-2 text-xs dark:bg-masters-800">
              <span className="w-10 shrink-0 tabular-nums muted">{timeFromMinutes(entry.minutes)}</span>
              <span className="min-w-0 flex-1 truncate">{entry.text || "—"}</span>
              <span className="shrink-0 font-bold tabular-nums">{entry.calories.toLocaleString()}</span>
              <button type="button" onClick={() => onEdit(entry)} className="shrink-0 px-1 font-semibold text-masters-500">
                Edit
              </button>
              <button type="button" onClick={() => onDelete(entry.id)} className="shrink-0 px-1 font-semibold text-[var(--color-under)]">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <label className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider muted">Calories</span>
          <input
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value.replace(/\D/g, "").slice(0, 5) })}
            inputMode="numeric"
            placeholder="520"
            className="mt-1 w-full rounded-lg border border-[color:var(--line)] bg-transparent px-3 py-2.5 text-base font-bold tabular-nums focus:border-masters-500 focus:outline-none"
          />
        </label>
        <label className="w-28">
          <span className="text-[10px] font-bold uppercase tracking-wider muted">Time</span>
          <input
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value || "12:00" })}
            className="mt-1 w-full rounded-lg border border-[color:var(--line)] bg-transparent px-2 py-2.5 text-base tabular-nums focus:border-masters-500 focus:outline-none"
          />
        </label>
      </div>

      <label className="mt-2 block">
        <span className="text-[10px] font-bold uppercase tracking-wider muted">{textLabel}</span>
        <input
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value.slice(0, 280) })}
          placeholder={textPlaceholder}
          className="mt-1 w-full rounded-lg border border-[color:var(--line)] bg-transparent px-3 py-2.5 text-sm focus:border-masters-500 focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className="mt-2.5 w-full rounded-lg bg-masters-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {form.entryId ? "Save changes" : "Add"}
      </button>
    </div>
  );
}
