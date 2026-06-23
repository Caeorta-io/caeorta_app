import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

/**
 * Screen 3 of the add-vehicle flow — the error state. Presentational: the form ran
 * `lib/vehicles.ts`'s `createVehicle`, got a failure, and routed here with the
 * `VehicleCreateError` `code` plus the entered values (so back-to-form / retry can
 * re-seed the form). Each code maps to a human-readable message and the recovery
 * affordance appropriate to it — retry for transient, back-to-pairing for device
 * problems, back-to-form for the (rare, inline-caught) validation case.
 *
 * In mock mode the seam always succeeds, so this screen is exercised by unit tests
 * and reachable only once the live `create_vehicle` Edge Function is wired. It is
 * "built, not E2E-verified" until then (carried like Wi-Fi provisioning).
 */

const KNOWN_CODES = [
  'not_device_owner',
  'device_not_claimed',
  'device_not_active',
  'duplicate_vehicle',
  'validation_error',
  'network',
] as const;

type ErrorCode = (typeof KNOWN_CODES)[number];

function asErrorCode(value: unknown): ErrorCode {
  // Anything we don't recognise is treated as a transport-level failure.
  return typeof value === 'string' && (KNOWN_CODES as readonly string[]).includes(value)
    ? (value as ErrorCode)
    : 'network';
}

const MESSAGE_KEY: Record<ErrorCode, string> = {
  not_device_owner: 'vehicles.add.errNotDeviceOwner',
  device_not_claimed: 'vehicles.add.errDeviceNotClaimed',
  device_not_active: 'vehicles.add.errDeviceNotActive',
  duplicate_vehicle: 'vehicles.add.errDuplicateVehicle',
  validation_error: 'vehicles.add.errValidation',
  network: 'vehicles.add.errNetwork',
};

export default function AddVehicleError() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    device_id?: string;
    make?: string;
    model?: string;
    year?: string;
    nickname?: string;
    ecu_type?: string;
    fields?: string;
  }>();

  const code = asErrorCode(params.code);
  const deviceId = typeof params.device_id === 'string' ? params.device_id : '';
  const fields = typeof params.fields === 'string' ? params.fields : '';

  // Re-seed the form with whatever the user typed (for retry / back-to-form).
  const backToForm = () =>
    router.replace({
      pathname: '/vehicles/add',
      params: {
        device_id: deviceId,
        make: typeof params.make === 'string' ? params.make : '',
        model: typeof params.model === 'string' ? params.model : '',
        year: typeof params.year === 'string' ? params.year : '',
        nickname: typeof params.nickname === 'string' ? params.nickname : '',
        ecu_type: typeof params.ecu_type === 'string' ? params.ecu_type : '',
      },
    });
  const backToPairing = () => router.replace('/pair');
  const goToGarage = () => router.replace('/vehicles');

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-neutral-900">{t('vehicles.add.errTitle')}</Text>
        <Text className="mt-3 text-base leading-6 text-neutral-500">{t(MESSAGE_KEY[code])}</Text>
        {code === 'validation_error' && fields ? (
          <Text className="mt-2 text-sm text-neutral-400">
            {t('vehicles.add.errValidationFields', { fields })}
          </Text>
        ) : null}
      </View>
      <View className="gap-3 pb-4">{renderActions(code, { backToForm, backToPairing, goToGarage, t })}</View>
    </Screen>
  );
}

function renderActions(
  code: ErrorCode,
  deps: {
    backToForm: () => void;
    backToPairing: () => void;
    goToGarage: () => void;
    t: (key: string) => string;
  },
) {
  const { backToForm, backToPairing, goToGarage, t } = deps;
  switch (code) {
    case 'network':
      // Transient — retry by returning to the form, which keeps the entered values.
      return <Button label={t('common.retry')} onPress={backToForm} />;
    case 'validation_error':
      return <Button label={t('vehicles.add.backToForm')} onPress={backToForm} />;
    case 'not_device_owner':
    case 'device_not_claimed':
    case 'device_not_active':
      // The device itself is the problem; re-pairing is the only path forward.
      return <Button label={t('vehicles.add.backToPairing')} onPress={backToPairing} />;
    case 'duplicate_vehicle':
      // Retrying/re-pairing won't help — the vehicle already exists; show the garage.
      return <Button label={t('vehicles.add.successCta')} onPress={goToGarage} />;
  }
}
