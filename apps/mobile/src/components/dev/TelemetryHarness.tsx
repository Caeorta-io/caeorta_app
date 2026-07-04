import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { DriveTelemetrySection } from '@/components/DriveTelemetrySection';
import { Text } from '@/components/ui/Text';
import { colorsDark, FONT_FAMILY } from '@/design';

// ─────────────────────────────────────────────────────────────────────────────
// Dev-only telemetry harness. Renders the REAL <DriveTelemetrySection> against an
// entered drive UUID, bypassing the still-mocked drive / driveDiagnostics lookups
// that block the full drive-detail screen from reaching a real seeded drive. This is
// a representative test of the exact rendering code that ships — not a reimplementation
// (same component, so the two can't drift). It skips ONLY the mock drive lookup, not any
// real security boundary: it uses the same Supabase client + session as everywhere else,
// so drive-level RLS on `get_drive_telemetry` still applies. Not a shipping screen; see
// docs/conventions.md and the /dev/tokens precedent.
//
// Defaults to the seeded drive (supabase/seed.sql, 361 samples) so it's useful with no
// typing: coolant crosses the provisional 105 °C amber threshold (~108.2 °C peak), boost
// is omitted for the first few samples (line starts a few points in, not at zero), and
// 361 rows exercises the function's ≤300 server-side downsample path. Any other drive
// UUID works too — this is a permanent tool, not a throwaway for one seed row.
// ─────────────────────────────────────────────────────────────────────────────

/** The seeded dev drive from supabase/seed.sql — pre-filled so the harness is useful immediately. */
const SEED_DRIVE_ID = '00000000-0000-0000-0000-000000000030';

export function TelemetryHarness() {
  const [driveId, setDriveId] = useState(SEED_DRIVE_ID);
  const trimmed = driveId.trim();

  return (
    <ScrollView className="flex-1 bg-surface-canvas" contentContainerClassName="p-5">
      <Text variant="h1" className="mb-1 text-fg-primary">
        Drive telemetry
      </Text>
      <Text variant="body-sm" className="mb-5 text-fg-secondary">
        Dev harness · real get_drive_telemetry read, keyed by driveId alone (no drive mock)
      </Text>

      <Text variant="label" className="mb-2 text-fg-tertiary">
        Drive UUID
      </Text>
      <TextInput
        className="rounded-ds-md border border-border-default bg-surface-elevated px-4 py-3 text-fg-primary"
        value={driveId}
        onChangeText={setDriveId}
        placeholder={SEED_DRIVE_ID}
        placeholderTextColor={colorsDark.fg.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
        // Monospace so a UUID is legible and column-aligned.
        style={{ fontFamily: FONT_FAMILY.mono }}
      />

      {trimmed.length > 0 ? (
        <DriveTelemetrySection driveId={trimmed} />
      ) : (
        <Text variant="body-sm" className="mt-6 text-fg-tertiary">
          Enter a drive UUID to load its telemetry.
        </Text>
      )}

      <View className="h-10" />
    </ScrollView>
  );
}
