import { useCallback, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { VEHICLE_YEAR_BOUNDS } from '@caeorta/types';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { createVehicle } from '@/lib/vehicles';

/**
 * Screen 1 of the add-vehicle flow — the form. Orchestrated by `lib/vehicles.ts`
 * against the Platform-track `create_vehicle` Edge Function (built, not E2E-verified
 * until that lands — carried like Wi-Fi provisioning; see
 * docs/create_vehicle_contract.md).
 *
 * `device_id` is NOT a form field: it arrives as a navigation param (the pairing
 * flow will route here with the freshly claimed device's id). Absent it, we can't
 * create a vehicle, so the screen short-circuits to a "pair first" dead-end.
 *
 * Field validation mirrors `createVehicleInputSchema` exactly (one schema, three
 * consumers) and surfaces inline on blur — required fields don't wait for submit.
 */

type FieldKey = 'make' | 'model' | 'year' | 'nickname' | 'ecu_type';

const MAX_LEN: Record<Exclude<FieldKey, 'year'>, number> = {
  make: 100,
  model: 100,
  nickname: 60,
  ecu_type: 60,
};

export default function AddVehicleForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    device_id?: string;
    make?: string;
    model?: string;
    year?: string;
    nickname?: string;
    ecu_type?: string;
  }>();

  const deviceId = typeof params.device_id === 'string' ? params.device_id : '';

  // Seed from params so a round-trip through the error screen (back-to-form) keeps
  // what the user already typed. Read once on mount.
  const [values, setValues] = useState<Record<FieldKey, string>>(() => ({
    make: typeof params.make === 'string' ? params.make : '',
    model: typeof params.model === 'string' ? params.model : '',
    year: typeof params.year === 'string' ? params.year : '',
    nickname: typeof params.nickname === 'string' ? params.nickname : '',
    ecu_type: typeof params.ecu_type === 'string' ? params.ecu_type : '',
  }));
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Returns a localized error for a single field, or null. Mirrors the Zod rules
  // (length-based, no trim) so the client never disagrees with the orchestrator.
  const fieldError = useCallback(
    (key: FieldKey, value: string): string | null => {
      if (key === 'year') {
        if (value.length === 0) return t('vehicles.add.fieldRequired');
        const n = Number(value);
        if (
          !Number.isInteger(n) ||
          n < VEHICLE_YEAR_BOUNDS.min ||
          n > VEHICLE_YEAR_BOUNDS.max
        ) {
          return t('vehicles.add.yearInvalid', VEHICLE_YEAR_BOUNDS);
        }
        return null;
      }
      if (value.length === 0) return t('vehicles.add.fieldRequired');
      if (value.length > MAX_LEN[key]) return t('vehicles.add.fieldTooLong', { max: MAX_LEN[key] });
      return null;
    },
    [t],
  );

  const setField = (key: FieldKey) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));
  const markTouched = (key: FieldKey) => () =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  const isValid = (Object.keys(values) as FieldKey[]).every((k) => fieldError(k, values[k]) === null);

  const onSubmit = useCallback(async () => {
    // Surface every field's error at once if the user submits without blurring.
    setTouched({ make: true, model: true, year: true, nickname: true, ecu_type: true });
    if (!isValid || submitting) return;

    setSubmitting(true);
    const result = await createVehicle({
      make: values.make,
      model: values.model,
      year: Number(values.year),
      nickname: values.nickname,
      ecu_type: values.ecu_type,
      device_id: deviceId,
    });

    if (result.ok) {
      router.replace({
        pathname: '/vehicles/add/success',
        params: {
          nickname: result.vehicle.nickname ?? '',
          make: result.vehicle.make ?? '',
          model: result.vehicle.model ?? '',
          year: String(result.vehicle.year ?? ''),
        },
      });
      return;
    }

    // Carry the code + the entered values forward so the error screen can route
    // back-to-form without losing what the user typed.
    router.replace({
      pathname: '/vehicles/add/error',
      params: {
        code: result.error.code,
        device_id: deviceId,
        ...values,
        ...(result.error.code === 'validation_error'
          ? { fields: Object.keys(result.error.fieldErrors).join(', ') }
          : {}),
      },
    });
  }, [deviceId, isValid, router, submitting, values]);

  if (!deviceId) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          <Text className="text-3xl font-bold text-neutral-900">
            {t('vehicles.add.noDeviceTitle')}
          </Text>
          <Text className="mt-3 text-base leading-6 text-neutral-500">
            {t('vehicles.add.noDeviceBody')}
          </Text>
        </View>
        <View className="pb-4">
          <Button label={t('vehicles.add.noDeviceCta')} onPress={() => router.replace('/pair')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="pb-2 pt-4">
          <Text className="text-3xl font-bold text-neutral-900">{t('vehicles.add.title')}</Text>
          <Text className="mt-2 text-base text-neutral-500">{t('vehicles.add.subtitle')}</Text>
        </View>

        <View className="mt-6">
          <Field
            label={t('vehicles.add.makeLabel')}
            placeholder={t('vehicles.add.makePlaceholder')}
            value={values.make}
            onChangeText={setField('make')}
            onBlur={markTouched('make')}
            error={touched.make ? fieldError('make', values.make) : null}
            autoCapitalize="words"
            editable={!submitting}
          />
          <Field
            label={t('vehicles.add.modelLabel')}
            placeholder={t('vehicles.add.modelPlaceholder')}
            value={values.model}
            onChangeText={setField('model')}
            onBlur={markTouched('model')}
            error={touched.model ? fieldError('model', values.model) : null}
            autoCapitalize="words"
            editable={!submitting}
          />
          <Field
            label={t('vehicles.add.yearLabel')}
            placeholder={t('vehicles.add.yearPlaceholder')}
            value={values.year}
            onChangeText={setField('year')}
            onBlur={markTouched('year')}
            error={touched.year ? fieldError('year', values.year) : null}
            keyboardType="number-pad"
            editable={!submitting}
          />
          <Field
            label={t('vehicles.add.nicknameLabel')}
            placeholder={t('vehicles.add.nicknamePlaceholder')}
            value={values.nickname}
            onChangeText={setField('nickname')}
            onBlur={markTouched('nickname')}
            error={touched.nickname ? fieldError('nickname', values.nickname) : null}
            autoCapitalize="sentences"
            editable={!submitting}
          />
          <Field
            label={t('vehicles.add.ecuLabel')}
            placeholder={t('vehicles.add.ecuPlaceholder')}
            value={values.ecu_type}
            onChangeText={setField('ecu_type')}
            onBlur={markTouched('ecu_type')}
            error={touched.ecu_type ? fieldError('ecu_type', values.ecu_type) : null}
            hint={t('vehicles.add.ecuHint')}
            autoCapitalize="none"
            editable={!submitting}
          />
        </View>

        <View className="pb-6 pt-2">
          <Button label={t('vehicles.add.submitCta')} onPress={onSubmit} loading={submitting} />
        </View>
      </ScrollView>
    </Screen>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  error: string | null;
  hint?: string;
  keyboardType?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  editable?: boolean;
}

/** One labelled text input with inline error + optional hint. Local to this screen. */
function Field({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  hint,
  keyboardType = 'default',
  autoCapitalize = 'none',
  editable = true,
}: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-neutral-700">{label}</Text>
      <TextInput
        className={`rounded-xl border px-4 py-3 text-base text-neutral-900 ${
          error ? 'border-red-400' : 'border-neutral-300'
        }`}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor="#a3a3a3"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
      />
      {hint && !error ? <Text className="mt-1 text-xs text-neutral-400">{hint}</Text> : null}
      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
