/**
 * Goal Gradient Effect — PRD FR-8, §12.
 *
 * Front-loads perceived progress so early stages visibly move the bar,
 * and counts down remaining steps near completion instead of raw percentage.
 * This is a display-layer reweighting only — actual job status remains
 * truthfully tracked server-side (Job.status in schema.prisma).
 */

export interface Stage {
  key: string;
  label: string;
  displayWeight: number;
}

export const STAGES: Stage[] = [
  { key: 'queued', label: 'Getting ready…', displayWeight: 0.05 },
  { key: 'analyzing', label: 'Analyzing your media…', displayWeight: 0.20 },
  { key: 'encoding', label: 'Making it sharp…', displayWeight: 0.60 },
  { key: 'verifying', label: 'Double-checking quality…', displayWeight: 0.10 },
  { key: 'done', label: 'Done!', displayWeight: 0.05 },
];

export function cumulativeDisplayPercent(stageKey: string): number {
  let cumulative = 0;
  for (const stage of STAGES) {
    cumulative += stage.displayWeight;
    if (stage.key === stageKey) return Math.round(cumulative * 100);
  }
  throw new Error(`Unknown stage: ${stageKey}`);
}

export function stepsRemaining(stageKey: string): number {
  const idx = STAGES.findIndex((s) => s.key === stageKey);
  if (idx === -1) throw new Error(`Unknown stage: ${stageKey}`);
  return STAGES.length - 1 - idx;
}

export function stageLabel(stageKey: string): string | null {
  const stage = STAGES.find((s) => s.key === stageKey);
  return stage ? stage.label : null;
}
