import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  /** Vertically center the content (intro/result screens) vs. top-align (forms). */
  center?: boolean;
}

/**
 * Standard white, safe-area-inset, horizontally padded screen frame. Factors out
 * the `SafeAreaView` + `px-6` wrapper repeated across screens so the pairing flow
 * reads as content, not chrome. Full-bleed screens (the camera) don't use this.
 */
export function Screen({ children, center = false }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className={`flex-1 px-6 ${center ? 'justify-center' : ''}`}>{children}</View>
    </SafeAreaView>
  );
}
