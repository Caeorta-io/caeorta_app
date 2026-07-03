import { SafeAreaView } from 'react-native-safe-area-context';

import { TokensPreview } from '@/components/dev/TokensPreview';
import { Text } from '@/components/ui/Text';

/**
 * Dev-only design-system preview. Reachable at `/dev/tokens` in a dev build; inert
 * in production. Deliberately NOT linked from any screen (no typed Href, so no
 * router.d.ts regen) — open it by navigating to the path during development.
 */
export default function DevTokensScreen() {
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
      <TokensPreview />
    </SafeAreaView>
  );
}
