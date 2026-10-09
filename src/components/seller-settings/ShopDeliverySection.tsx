import { router } from 'expo-router';
import { ChevronRight, Map, Truck } from 'lucide-react-native';
import React from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';
import { Field, Section } from './SectionAndField';
import { calcFee, fmtSom, pricingMeta, Pricing } from './types';

interface ShopDeliverySectionProps {
  shopId: string | undefined;
  isDeliveryEnabled: boolean;
  onToggleDeliveryEnabled: (enabled: boolean) => void;
  minOrder: string;
  onChangeMinOrder: (val: string) => void;
  maxKm: string;
  onChangeMaxKm: (val: string) => void;
  freeKm: string;
  onChangeFreeKm: (val: string) => void;
  pricingType: Pricing;
  onChangePricingType: (type: Pricing) => void;
  price: string;
  onChangePrice: (val: string) => void;
}

export function ShopDeliverySection({
  shopId,
  isDeliveryEnabled,
  onToggleDeliveryEnabled,
  minOrder,
  onChangeMinOrder,
  maxKm,
  onChangeMaxKm,
  freeKm,
  onChangeFreeKm,
  pricingType,
  onChangePricingType,
  price,
  onChangePrice,
}: ShopDeliverySectionProps) {
  const { tr } = useTranslation();

  return (
    <Section title={tr('shopSet.deliverySection')} icon={Truck}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-bold text-text-primary">{tr('shopSet.deliveryToggle')}</Text>
          <Text className="text-[13px] text-text-tertiary mt-0.5">{tr('shopSet.deliveryToggleSub')}</Text>
        </View>
        <Switch
          value={isDeliveryEnabled}
          onValueChange={onToggleDeliveryEnabled}
          trackColor={{ true: colors.feedback.success }}
          thumbColor={colors.bg.surface}
        />
      </View>

      {!isDeliveryEnabled ? (
        <View className="bg-brand-primary/10 rounded-xl p-4 border border-brand-primary/20">
          <Text className="text-sm text-brand-primary">
            ℹ️ {tr('shopSet.showcaseNotice')}
          </Text>
        </View>
      ) : (
        <>
          <Pressable
            className="flex-row items-center gap-2 py-3 px-4 rounded-2xl border border-brand-primary/20 bg-brand-primary/10 active:opacity-75"
            onPress={() => router.push({ pathname: '/seller/[shopId]/delivery-zones', params: { shopId } } as never)}
          >
            <Map size={18} color={colors.brand.primary} strokeWidth={2} />
            <Text className="text-sm font-bold text-brand-primary flex-1">{tr('shopSet.drawZone')}</Text>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </Pressable>

          <Field label={tr('shopSet.minOrder')}>
            <TextInput
              className="bg-bg-canvas rounded-xl border border-border-subtle px-3 py-2 text-base text-text-primary"
              value={minOrder}
              onChangeText={onChangeMinOrder}
              keyboardType="number-pad"
            />
            <Text className="text-xs text-text-tertiary mt-0.5">{tr('shopSet.minOrderHint')}</Text>
          </Field>

          <Field label={tr('shopSet.maxKm')}>
            <TextInput
              className="bg-bg-canvas rounded-xl border border-border-subtle px-3 py-2 text-base text-text-primary"
              value={maxKm}
              onChangeText={onChangeMaxKm}
              keyboardType="numeric"
            />
            <Text className="text-xs text-text-tertiary mt-0.5">{tr('shopSet.maxKmHint')}</Text>
          </Field>

          <Field label={tr('shopSet.freeKm')}>
            <TextInput
              className="bg-bg-canvas rounded-xl border border-border-subtle px-3 py-2 text-base text-text-primary"
              value={freeKm}
              onChangeText={onChangeFreeKm}
              keyboardType="numeric"
            />
            <Text className="text-xs text-text-tertiary mt-0.5">{tr('shopSet.freeKmHint')}</Text>
          </Field>

          <Field label={tr('shopSet.pricingLabel')}>
            <View className="flex-row flex-wrap gap-1.5">
              {(['per_km', 'per_500m', 'per_100m', 'flat'] as Pricing[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => onChangePricingType(t)}
                  className={`py-1 px-4 rounded-full border ${
                    pricingType === t
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-border-subtle bg-bg-canvas'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      pricingType === t ? 'text-brand-primary font-bold' : 'font-semibold text-text-secondary'
                    }`}
                  >
                    {pricingMeta(t).label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-xs text-text-tertiary mt-0.5">{pricingMeta(pricingType).hint}</Text>
          </Field>

          <Field label={pricingMeta(pricingType).priceLabel}>
            <TextInput
              className="bg-bg-canvas rounded-xl border border-border-subtle px-3 py-2 text-base text-text-primary"
              value={price}
              onChangeText={onChangePrice}
              keyboardType="number-pad"
            />
          </Field>

          <DeliveryExample
            maxKm={Number(maxKm) || 0}
            freeKm={Number(freeKm) || 0}
            pricingType={pricingType}
            price={Number(price) || 0}
          />
        </>
      )}
    </Section>
  );
}

function DeliveryExample({
  maxKm,
  freeKm,
  pricingType,
  price,
}: {
  maxKm: number;
  freeKm: number;
  pricingType: Pricing;
  price: number;
}) {
  const { tr } = useTranslation();
  if (maxKm <= 0) return null;

  const edgeFee = calcFee(maxKm, freeKm, pricingType, price);
  const midDist = freeKm >= maxKm ? maxKm : (freeKm + maxKm) / 2;
  const midFee = calcFee(midDist, freeKm, pricingType, price);

  return (
    <View className="bg-bg-canvas rounded-xl p-3 border border-border-subtle gap-1 mt-1">
      <Text className="text-xs font-bold text-text-secondary">{tr('shopSet.exampleTitle')}</Text>

      {freeKm > 0 ? (
        <View className="flex-row justify-between items-center">
          <Text className="text-xs text-text-tertiary">0 – {freeKm} km</Text>
          <Text className="text-xs font-bold text-feedback-success">{tr('shopSet.free')}</Text>
        </View>
      ) : null}

      {freeKm < maxKm ? (
        <>
          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-text-tertiary">{midDist.toFixed(1)} km</Text>
            <Text className="text-xs font-bold text-text-primary">{fmtSom(midFee)} {tr('common.som')}</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-text-tertiary">{tr('shopSet.edgeDist', { km: maxKm })}</Text>
            <Text className="text-xs font-bold text-text-primary">{fmtSom(edgeFee)} {tr('common.som')}</Text>
          </View>
        </>
      ) : (
        <Text className="text-xs text-text-tertiary mt-0.5">{tr('shopSet.allFree')}</Text>
      )}
    </View>
  );
}
