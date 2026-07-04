import { SafeAreaView } from 'react-native-safe-area-context';

import { TelemetryHarness } from '@/components/dev/TelemetryHarness';
import { Text } from '@/components/ui/Text';

/**
 * Dev-only telemetry harness. Reachable at `/dev/telemetry` in a dev build; inert in
 * production. Renders the real <DriveTelemetrySection> against an entered drive UUID,
 * bypassing the still-mocked drive lookup — a representative test of the exact chart code
 * that ships (see components/dev/TelemetryHarness.tsx). Same convention as /dev/tokens:
 * `__DEV__`-gated, NOT linked from any screen (no typed Href, so no router.d.ts regen) —
 * open it by navigating to the path during development. Lives inside the `(app)` group, so
 * it goes through the auth guard: the real Supabase session is used and drive-level RLS on
 * `get_drive_telemetry` still applies (the harness skips only the mock, not any auth).
 */
export default function DevTelemetryScreen() {
  if (!__DEV__) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-canvas">
        <Text variant="body" className="text-fg-secondary">
          Not available in production.
        </Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView className="flex-1 bg-surface-canvas" edges={['top']}>
      <TelemetryHarness />
    </SafeAreaView>
  );
}
