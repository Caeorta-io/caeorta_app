import { useEffect, useRef } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { parseDeviceQr } from '@/lib/pairing';

export default function PairScan() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  // Guards against the camera firing the handler many times for one physical scan,
  // and against navigating twice while the screen tears down.
  const handledRef = useRef(false);
  // Ensures we auto-prompt for permission at most once per mount.
  const requestedRef = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !requestedRef.current) {
      requestedRef.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  function handleBarcode(result: BarcodeScanningResult) {
    if (handledRef.current) return;
    handledRef.current = true;
    const secret = parseDeviceQr(result.data);
    // `replace` so the back gesture from the result doesn't reopen the camera.
    router.replace({ pathname: '/pair/result', params: { secret } });
  }

  // Permission state still resolving.
  if (!permission) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      </Screen>
    );
  }

  // Permission denied — offer the manual path, plus re-ask or deep-link to Settings.
  if (!permission.granted) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          <Text className="text-2xl font-bold text-neutral-900">{t('pair.cameraDeniedTitle')}</Text>
          <Text className="mt-3 text-base leading-6 text-neutral-500">
            {t('pair.cameraDeniedBody')}
          </Text>
        </View>
        <View className="gap-3 pb-4">
          <Button
            label={t('pair.manualCta')}
            onPress={() => router.replace('/pair/manual')}
          />
          {permission.canAskAgain ? (
            <Button
              label={t('pair.allowCamera')}
              variant="secondary"
              onPress={() => void requestPermission()}
            />
          ) : (
            <Button
              label={t('pair.openSettings')}
              variant="secondary"
              onPress={() => void Linking.openSettings()}
            />
          )}
        </View>
      </Screen>
    );
  }

  // Permission granted — live camera with a framing overlay and a manual escape hatch.
  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcode}
      />

      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <View className="h-64 w-64 rounded-3xl border-2 border-white/80" />
      </View>

      <SafeAreaView className="absolute inset-x-0 top-0">
        <Text className="px-6 pt-4 text-center text-base font-medium text-white">
          {t('pair.scanHint')}
        </Text>
      </SafeAreaView>

      <SafeAreaView className="absolute inset-x-0 bottom-0">
        <View className="items-center px-6 pb-4">
          <Button
            label={t('pair.manualCta')}
            variant="ghost"
            onPress={() => router.replace('/pair/manual')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
