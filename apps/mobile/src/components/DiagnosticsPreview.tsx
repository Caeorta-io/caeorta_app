import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@caeorta/supabase';

import { sortDiagnosticsByPriority } from '@/lib/diagnostics';

interface DiagnosticsPreviewProps {
  diagnostics: Tables<'diagnostic_outputs'>[];
  /** Owning vehicle — used to build the "View all" route. */
  vehicleId: string;
}

const PREVIEW_LIMIT = 3;

/** Severity → colour-dot Tailwind class. Unknown severities fall back to neutral. */
const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

/**
 * The "Recent diagnostics" preview panel on the vehicle-detail screen. Sorts the
 * incoming rows by severity then recency (pure {@link sortDiagnosticsByPriority}),
 * shows up to three, and links to the full list. `status` is deliberately not
 * shown here — it belongs to the full diagnostics screen (future work).
 */
export function DiagnosticsPreview({ diagnostics, vehicleId }: DiagnosticsPreviewProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const top = sortDiagnosticsByPriority(diagnostics).slice(0, PREVIEW_LIMIT);

  return (
    <View className="mt-6">
      <Text className="text-sm font-medium text-neutral-500">{t('vehicles.detail.diagnostics')}</Text>

      {top.length === 0 ? (
        <Text className="mt-2 text-sm text-neutral-400">{t('vehicles.detail.noDiagnostics')}</Text>
      ) : (
        <View className="mt-2">
          {top.map((d) => (
            <DiagnosticRow key={d.id} diagnostic={d} />
          ))}
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              router.push({ pathname: '/vehicles/[id]/diagnostics', params: { id: vehicleId } })
            }
            className="mt-1 self-start py-2 active:opacity-70"
          >
            <Text className="text-sm font-medium text-blue-600">
              {t('vehicles.detail.viewAll')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

interface DiagnosticRowProps {
  diagnostic: Tables<'diagnostic_outputs'>;
}

/** A single preview row: severity dot + title + urgency chip. */
function DiagnosticRow({ diagnostic }: DiagnosticRowProps) {
  const { t } = useTranslation();
  const dotClass = SEVERITY_DOT[diagnostic.severity] ?? 'bg-neutral-400';

  return (
    <View className="flex-row items-center border-b border-neutral-100 py-3">
      <View
        className={`mr-3 h-2.5 w-2.5 rounded-full ${dotClass}`}
        aria-label={t(`vehicles.detail.severity.${diagnostic.severity}`, diagnostic.severity)}
      />
      <Text className="flex-1 pr-3 text-sm text-neutral-800" numberOfLines={1}>
        {diagnostic.title}
      </Text>
      <View className="rounded-full bg-neutral-100 px-2 py-0.5">
        <Text className="text-xs font-medium text-neutral-600">
          {t(`vehicles.detail.urgency.${diagnostic.urgency}`, diagnostic.urgency)}
        </Text>
      </View>
    </View>
  );
}
