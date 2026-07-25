/**
 * Write-action seam for the Diagnostic Card (design §5.1) — feedback + mark-seen.
 *
 * The card fires two writes: a thumbs up/down feedback signal and a status change
 * (mark-seen, or the critical "I've got it" acknowledgement). Both are the mirror
 * of the READ seam in `./source.ts`: a typed boundary the component calls, backed
 * by a mock no-op today and swapped for the live Supabase write later.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WEEK-6 LIVE WIRING POINT. This week the card is a standalone atom built against
 * mocks only — {@link mockDiagnosticActions} deliberately performs NO Supabase I/O:
 *   • feedback  → the live impl inserts a `diagnostic_feedback` row
 *                 ({ diagnostic_id, user_id, rating, comment }) — see docs/06
 *                 "User feedback signal". NOT wired here.
 *   • markSeen  → the live impl UPDATEs `diagnostic_outputs.status`
 *                 ('new' → 'seen', or → 'actioned' for the critical acknowledge)
 *                 for the signed-in owner. NOT wired here.
 * Neither table is touched in this PR (per the task brief). When Week 6 wires the
 * live path, add a `mode: 'mock' | 'live'` switch here (same shape as
 * {@link DATA_SOURCE}) and implement the Supabase writes behind the 'live' branch.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Thumbs up/down rating written to `diagnostic_feedback.rating` (docs/06). */
export type FeedbackRating = 'up' | 'down';

/** Input to the feedback write. `comment` is reserved for a future free-text field. */
export interface SubmitFeedbackInput {
  diagnosticId: string;
  rating: FeedbackRating;
  comment?: string | null;
}

/**
 * The target status for a mark-seen write. Critical uses `'actioned'` (a single
 * calm acknowledgement, principle #7); everything else uses `'seen'`. Values track
 * the contract's `status` vocabulary (new/seen/dismissed/actioned, docs/06).
 */
export type SeenStatus = 'seen' | 'actioned';

/** Input to the mark-seen / acknowledge write. */
export interface MarkSeenInput {
  diagnosticId: string;
  status: SeenStatus;
}

/**
 * The typed action surface the Diagnostic Card depends on. The card takes handler
 * props (not this object directly) so a screen can inject the mock today and the
 * live impl in Week 6 without the card changing.
 */
export interface DiagnosticActions {
  submitFeedback(input: SubmitFeedbackInput): Promise<void>;
  markSeen(input: MarkSeenInput): Promise<void>;
}

/**
 * Mock, never-throws implementation. No Supabase I/O — resolves immediately so the
 * card's optimistic UI (active thumb, "seen" state) has a settled promise to await
 * without any live write. Replaced at the Week-6 wiring point above.
 */
export const mockDiagnosticActions: DiagnosticActions = {
  async submitFeedback(_input: SubmitFeedbackInput): Promise<void> {
    // no-op mock seam — see WEEK-6 LIVE WIRING POINT above.
  },
  async markSeen(_input: MarkSeenInput): Promise<void> {
    // no-op mock seam — see WEEK-6 LIVE WIRING POINT above.
  },
};
