import { Stack } from 'expo-router';

// sign-in is the entry point of the public auth flow; verify is pushed on top.
export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
