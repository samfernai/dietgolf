/**
 * Turns a hole's play into something the map can draw. Kept free of any
 * database imports so client components can use it.
 */
import type { Grade } from "./calories";
import { GRADE_LIE } from "./checkpoints";
import { OUTCOME_SPECS, type OutcomeKey } from "./shots";

export type MapShot = {
  color: string;
  advance: number;
  spread: number;
  label?: string;
};

/** Calorie weeks: one shot per checkpoint the clock has actually reached. */
export function shotsFromCheckpoints(
  checkpoints: { grade: Grade; reached: boolean; label: string }[],
): MapShot[] {
  return checkpoints
    .filter((checkpoint) => checkpoint.reached)
    .map((checkpoint) => {
      const lie = GRADE_LIE[checkpoint.grade];
      return { color: lie.color, advance: lie.advance, spread: lie.spread, label: checkpoint.label };
    });
}

/** Legacy rating weeks: one shot per meal logged. */
export function shotsFromOutcomes(outcomes: OutcomeKey[]): MapShot[] {
  return outcomes.map((outcome) => {
    const spec = OUTCOME_SPECS[outcome];
    return { color: spec.color, advance: spec.advance, spread: spec.spread, label: spec.short };
  });
}
