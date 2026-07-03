import { ScrollView, View } from 'react-native';
import { Activity, AlertTriangle, Check, Gauge, Wifi } from 'lucide-react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colorsDark, ELEVATION, type TextVariant } from '@/design';

// ─────────────────────────────────────────────────────────────────────────────
// Dev-only smoke test for the design foundation. Renders the semantic colour
// tokens (via LITERAL classNames so NativeWind actually generates them), the 12
// named type styles, elevation recipes, and a few icons. Not a shipping screen —
// it exists to prove the layer resolves end-to-end. See docs/conventions.md.
//
// Swatch classNames are hand-written literals (not built dynamically) because
// Tailwind/NativeWind only generate classes it can see as source text.
// ─────────────────────────────────────────────────────────────────────────────

/** One colour chip; `className` must be a literal so NativeWind emits it. */
function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <View className="mb-2 mr-2 w-24">
      <View className={`h-12 rounded-md border border-border-default ${className}`} />
      <Text variant="caption" className="mt-1 text-fg-tertiary">
        {label}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-8">
      <Text variant="label" className="mb-3 text-fg-tertiary">
        {title}
      </Text>
      {children}
    </View>
  );
}

const TYPE_SPECIMENS: { variant: TextVariant; sample: string }[] = [
  { variant: 'display', sample: 'Display 34' },
  { variant: 'h1', sample: 'Heading H1 26' },
  { variant: 'h2', sample: 'Heading H2 21' },
  { variant: 'h3', sample: 'Heading H3 17' },
  { variant: 'body-lg', sample: 'Body Large 16 — primary reading copy' },
  { variant: 'body', sample: 'Body Base 15 — standard body' },
  { variant: 'body-sm', sample: 'Body Small 13 — secondary' },
  { variant: 'caption', sample: 'Caption 12 — timestamps, meta' },
  { variant: 'label', sample: 'Label 11 uppercase' },
  { variant: 'data-xl', sample: '11.2' },
  { variant: 'data-lg', sample: '2 480' },
  { variant: 'data', sample: '92 kph · 1.4 bar' },
];

/** Full-bleed dark canvas so the dark tokens read correctly. */
export function TokensPreview() {
  return (
    <ScrollView className="flex-1 bg-surface-canvas" contentContainerClassName="p-5">
      <Text variant="h1" className="mb-1 text-fg-primary">
        Design tokens
      </Text>
      <Text variant="body-sm" className="mb-8 text-fg-secondary">
        Dark theme · smoke test for §4 foundations
      </Text>

      <Section title="Surface">
        <View className="flex-row flex-wrap">
          <Swatch className="bg-surface-canvas" label="canvas" />
          <Swatch className="bg-surface-primary" label="primary" />
          <Swatch className="bg-surface-elevated" label="elevated" />
          <Swatch className="bg-surface-sunken" label="sunken" />
        </View>
      </Section>

      <Section title="Brand & interactive">
        <View className="flex-row flex-wrap">
          <Swatch className="bg-brand-default" label="brand/default" />
          <Swatch className="bg-brand-pressed" label="brand/pressed" />
          <Swatch className="bg-brand-tint" label="brand/tint" />
          <Swatch className="bg-interactive-disabled" label="int/disabled" />
        </View>
      </Section>

      <Section title="Severity (temperature = urgency)">
        <View className="flex-row flex-wrap">
          <Swatch className="bg-severity-info" label="info" />
          <Swatch className="bg-severity-warning" label="warning" />
          <Swatch className="bg-severity-warning-tint" label="warning-tint" />
          <Swatch className="bg-severity-critical" label="critical" />
          <Swatch className="bg-severity-critical-tint" label="critical-tint" />
          <Swatch className="bg-severity-insufficient" label="insufficient" />
        </View>
      </Section>

      <Section title="Status (never severity colours)">
        <View className="flex-row flex-wrap">
          <Swatch className="bg-status-success" label="success" />
          <Swatch className="bg-status-live" label="live" />
          <Swatch className="bg-status-offline" label="offline" />
        </View>
      </Section>

      <Section title="Text on canvas">
        <Text variant="body" className="text-fg-primary">
          fg/primary — F2F5F7 (not pure white)
        </Text>
        <Text variant="body" className="text-fg-secondary">
          fg/secondary
        </Text>
        <Text variant="body" className="text-fg-tertiary">
          fg/tertiary
        </Text>
        <Text variant="body" className="text-brand-text">
          brand/text — links
        </Text>
      </Section>

      <Section title="Typography (Geist / Geist Mono)">
        {TYPE_SPECIMENS.map(({ variant, sample }) => (
          <Text key={variant} variant={variant} className="mb-2 text-fg-primary">
            {sample}
          </Text>
        ))}
      </Section>

      <Section title="Elevation (surface-step + border)">
        <View className={`mb-3 rounded-lg p-4 ${ELEVATION[1]}`}>
          <Text variant="body-sm" className="text-fg-secondary">
            elev-1 — surface/primary + border/subtle
          </Text>
        </View>
        <View className={`rounded-lg p-4 ${ELEVATION[2]}`}>
          <Text variant="body-sm" className="text-fg-secondary">
            elev-2 — surface/elevated + border/default
          </Text>
        </View>
      </Section>

      <Section title="Icons (lucide · 18-in-36 · token colour)">
        <View className="flex-row">
          {[Activity, Gauge, AlertTriangle, Wifi, Check].map((glyph, i) => (
            <View
              key={i}
              className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-surface-elevated"
            >
              <Icon icon={glyph} color={i === 2 ? colorsDark.severity.warning : undefined} />
            </View>
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}
