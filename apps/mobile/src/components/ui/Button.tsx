import { ActivityIndicator, Pressable, Text } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
}

// Visual tokens live here so the in-progress Figma can be reconciled in one place
// rather than across every screen. Colors track the auth screens (blue-600 primary)
// until the design system lands.
const container: Record<ButtonVariant, string> = {
  primary: 'rounded-xl bg-blue-600 py-4',
  secondary: 'rounded-xl border border-neutral-300 py-4',
  ghost: 'py-2',
};

const label: Record<ButtonVariant, string> = {
  primary: 'text-base font-semibold text-white',
  secondary: 'text-base font-semibold text-neutral-900',
  ghost: 'text-sm font-medium text-blue-600',
};

/**
 * The app's single button primitive. `loading` swaps the label for a spinner and
 * disables the press; `variant` selects the visual treatment. Keep new pairing
 * (and future) screens routed through this so styling stays centralized.
 */
export function Button({
  label: text,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      className={`items-center ${container[variant]} ${isDisabled ? 'opacity-50' : 'active:opacity-80'}`}
      disabled={isDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#2563eb'} />
      ) : (
        <Text className={label[variant]}>{text}</Text>
      )}
    </Pressable>
  );
}
