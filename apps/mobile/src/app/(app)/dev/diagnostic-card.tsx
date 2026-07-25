import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosticCardHarness } from '@/components/dev/DiagnosticCardHarness';
import { Text } from '@/components/ui/Text';

/**
 * Dev-only Diagnostic Card harness. Reachable at `/dev/diagnostic-card` in a dev
 * build; inert in production. Renders the real <DiagnosticCard> for all 8 variants
 * (4 states × collapsed/expanded) against typed mock fixtures — a representative view
 * of the exact atom that ships (see components/dev/DiagnosticCardHarness.tsx). Same
 * convention as /dev/telemetry and /dev/tokens: `__DEV__`-gated, NOT linked from any
 * screen (no typed Href, so no router.d.ts regen) — open it by navigating to the path
 * during development. Lives inside the `(app)` group so it goes through the auth guard,
 * but reads/writes nothing live (mock fixtures + mock action seams only).
 */
export default function DevDiagnosticCardScreen() {
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
      <DiagnosticCardHarness />
    </SafeAreaView>
  );
}
