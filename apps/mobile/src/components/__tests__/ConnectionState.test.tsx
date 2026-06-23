import { describe, expect, it } from 'vitest';

import { deriveConnectionState, SYNCED_THRESHOLD_MS } from '@/lib/connectionState';

// A fixed reference "now" so every age computation is deterministic.
const NOW = Date.parse('2026-06-22T12:00:00.000Z');
const isoAgo = (ms: number) => new Date(NOW - ms).toISOString();

describe('deriveConnectionState', () => {
  it("channelStatus 'connecting' wins over everything → 'connecting'", () => {
    // Even with a fresh sync timestamp, a connecting channel reports 'connecting'.
    expect(
      deriveConnectionState({
        channelStatus: 'connecting',
        currentStateUpdatedAt: isoAgo(0),
        now: NOW,
      }),
    ).toBe('connecting');
  });

  it("channelStatus 'open' → 'live'", () => {
    expect(
      deriveConnectionState({
        channelStatus: 'open',
        currentStateUpdatedAt: null,
        now: NOW,
      }),
    ).toBe('live');
  });

  it("recent updated_at (within threshold) with no channel → 'synced'", () => {
    expect(
      deriveConnectionState({
        channelStatus: null,
        currentStateUpdatedAt: isoAgo(SYNCED_THRESHOLD_MS - 1),
        now: NOW,
      }),
    ).toBe('synced');
  });

  it("'closed' channel with recent sync → 'synced' (closed = not live, not connecting)", () => {
    expect(
      deriveConnectionState({
        channelStatus: 'closed',
        currentStateUpdatedAt: isoAgo(60_000),
        now: NOW,
      }),
    ).toBe('synced');
  });

  it("stale updated_at (older than threshold) → 'offline'", () => {
    expect(
      deriveConnectionState({
        channelStatus: null,
        currentStateUpdatedAt: isoAgo(SYNCED_THRESHOLD_MS + 60_000),
        now: NOW,
      }),
    ).toBe('offline');
  });

  // ── Boundary conditions ──────────────────────────────────────────────────
  it("exactly SYNCED_THRESHOLD_MS old → 'offline' (threshold is strict)", () => {
    expect(
      deriveConnectionState({
        channelStatus: null,
        currentStateUpdatedAt: isoAgo(SYNCED_THRESHOLD_MS),
        now: NOW,
      }),
    ).toBe('offline');
  });

  it("null updatedAt with no channel → 'offline'", () => {
    expect(
      deriveConnectionState({
        channelStatus: null,
        currentStateUpdatedAt: null,
        now: NOW,
      }),
    ).toBe('offline');
  });

  it("null channelStatus falls through to the timestamp rule", () => {
    expect(
      deriveConnectionState({
        channelStatus: null,
        currentStateUpdatedAt: isoAgo(0),
        now: NOW,
      }),
    ).toBe('synced');
  });

  it("future timestamp (negative age) → 'offline'", () => {
    expect(
      deriveConnectionState({
        channelStatus: null,
        currentStateUpdatedAt: isoAgo(-60_000),
        now: NOW,
      }),
    ).toBe('offline');
  });
});
