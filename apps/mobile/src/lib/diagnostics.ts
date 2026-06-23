/**
 * Pure diagnostics ordering for the vehicle dashboard.
 *
 * The data seam hands diagnostics back newest-first by `generated_at` (see
 * `fetchRecentDiagnostics`); the preview panel wants them surfaced by SEVERITY
 * first. That re-ordering is a presentation concern, so it lives here as a pure,
 * client-side sort — NOT a new data-source capability (the brief is explicit:
 * sort after the hook returns, don't push it into `source.ts`/the mocks).
 *
 * No React-Native / React imports, so the rule is unit-testable in plain
 * Node/vitest (mirrors `connectionState.ts`).
 */
import type { Tables } from '@caeorta/supabase';

/**
 * Sort rank per severity (lower = more urgent, surfaces first). `severity` is a
 * plain `text` column (no DB enum), so an unrecognised value sorts AFTER all the
 * known tiers rather than crashing — defensive against vocabulary drift from the
 * AI-agent contract (see docs/06_AI_Agent_Contract.md).
 */
export const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const UNKNOWN_SEVERITY_RANK = Number.MAX_SAFE_INTEGER;

function severityRank(severity: string): number {
  return SEVERITY_RANK[severity] ?? UNKNOWN_SEVERITY_RANK;
}

/**
 * Order diagnostics for the preview: by severity (critical → warning → info →
 * unknown), then most-recent `generated_at` first within each severity tier.
 *
 * Returns a NEW array (does not mutate the input). An unparseable `generated_at`
 * is treated as oldest so a malformed row never jumps to the top of its tier.
 */
export function sortDiagnosticsByPriority(
  diagnostics: readonly Tables<'diagnostic_outputs'>[],
): Tables<'diagnostic_outputs'>[] {
  return [...diagnostics].sort((a, b) => {
    const bySeverity = severityRank(a.severity) - severityRank(b.severity);
    if (bySeverity !== 0) return bySeverity;

    // Newest first. Date.parse → NaN for bad input; coerce to -Infinity (oldest).
    const aTime = Date.parse(a.generated_at);
    const bTime = Date.parse(b.generated_at);
    const aSafe = Number.isNaN(aTime) ? -Infinity : aTime;
    const bSafe = Number.isNaN(bTime) ? -Infinity : bTime;
    return bSafe - aSafe;
  });
}
