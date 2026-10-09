import { Star } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { colors } from '@/theme';
import { CARD_BRAND_LABEL, CardBrand } from '@/utils/cardBrand';

interface Props {
  readonly brand: CardBrand;
  /** Formatted card number to display, e.g. "8600 12•• •••• 1234" or the live-typed value. */
  readonly numberText: string;
  readonly label?: string | null;
  readonly expiry?: string | null;
  readonly fallbackLabel: string;
  /** Shows a small badge on the card face */
  readonly isDefault?: boolean;
  /** 'full' — bank-card mockup. 'mini' — small pill badge. */
  readonly size?: 'full' | 'mini';
}

/** Realistic bank-card mockup whose color follows the detected Uzcard/Humo brand. */
export function CardVisual({ brand, numberText, label, expiry, fallbackLabel, isDefault, size = 'full' }: Props) {
  const tone = colors.cardBrand[brand ?? 'unknown'];
  const brandLabel = brand ? CARD_BRAND_LABEL[brand] : null;

  if (size === 'mini') {
    return (
      <View
        className="w-11 h-7.5 rounded-md items-center justify-center overflow-hidden"
        style={{ backgroundColor: tone.base }}
      >
        <View
          className="absolute w-10 h-10 rounded-full opacity-35 -top-4.5 -right-3"
          style={{ backgroundColor: tone.dark }}
        />
        <Text className="text-[8px] font-extrabold tracking-wide" style={{ color: tone.text }} numberOfLines={1}>
          {brandLabel ?? '••••'}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="rounded-3xl p-4 h-42 justify-between overflow-hidden relative"
      style={{ backgroundColor: tone.base }}
    >
      <View
        className="absolute w-56 h-56 rounded-full opacity-35 -top-28 -right-14"
        style={{ backgroundColor: tone.dark }}
      />
      <View className="flex-row items-start justify-between gap-2">
        <Text className="text-[15px] font-bold flex-shrink" style={{ color: tone.text }} numberOfLines={1}>
          {label || fallbackLabel}
        </Text>
        <View className="flex-row items-center gap-1.5">
          {isDefault && (
            <View className="w-5.5 h-5.5 rounded-full bg-white/95 items-center justify-center">
              <Star size={11} color={tone.base} fill={tone.base} />
            </View>
          )}
          {brandLabel && (
            <Text className="text-[15px] font-extrabold tracking-widest" style={{ color: tone.text }} numberOfLines={1}>
              {brandLabel}
            </Text>
          )}
        </View>
      </View>

      <View className="w-9 h-6.5 rounded-md bg-white/85 p-1 justify-center">
        <View className="h-0.5 rounded bg-black/25" />
        <View className="h-0.5 rounded bg-black/25 mt-1" />
      </View>

      <View className="flex-row items-end justify-between gap-2">
        <Text
          className="text-[17px] font-bold tracking-widest flex-shrink"
          style={{ color: tone.text }}
          numberOfLines={1}
        >
          {numberText}
        </Text>
        {!!expiry && (
          <Text className="text-[13px] font-bold opacity-90" style={{ color: tone.text }} numberOfLines={1}>
            {expiry}
          </Text>
        )}
      </View>
    </View>
  );
}
