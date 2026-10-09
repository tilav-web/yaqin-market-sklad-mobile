import { router } from 'expo-router';
import { ChevronRight, Map, Truck } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';
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
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={styles.toggleLabel}>{tr('shopSet.deliveryToggle')}</Text>
          <Text style={styles.toggleSub}>{tr('shopSet.deliveryToggleSub')}</Text>
        </View>
        <Switch
          value={isDeliveryEnabled}
          onValueChange={onToggleDeliveryEnabled}
          trackColor={{ true: colors.feedback.success }}
          thumbColor={colors.bg.surface}
        />
      </View>

      {!isDeliveryEnabled ? (
        <View style={styles.showcaseNoticeBox}>
          <Text style={styles.showcaseNoticeText}>
            ℹ️ {tr('shopSet.showcaseNotice')}
          </Text>
        </View>
      ) : (
        <>
          <Pressable
            style={styles.mapZoneBtn}
            onPress={() => router.push({ pathname: '/seller/[shopId]/delivery-zones', params: { shopId } } as never)}
          >
            <Map size={18} color={colors.brand.primary} strokeWidth={2} />
            <Text style={styles.mapZoneBtnText}>{tr('shopSet.drawZone')}</Text>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </Pressable>

          <Field label={tr('shopSet.minOrder')}>
            <TextInput
              style={styles.input}
              value={minOrder}
              onChangeText={onChangeMinOrder}
              keyboardType="number-pad"
            />
            <Text style={styles.hint}>{tr('shopSet.minOrderHint')}</Text>
          </Field>

          <Field label={tr('shopSet.maxKm')}>
            <TextInput
              style={styles.input}
              value={maxKm}
              onChangeText={onChangeMaxKm}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>{tr('shopSet.maxKmHint')}</Text>
          </Field>

          <Field label={tr('shopSet.freeKm')}>
            <TextInput
              style={styles.input}
              value={freeKm}
              onChangeText={onChangeFreeKm}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>{tr('shopSet.freeKmHint')}</Text>
          </Field>

          <Field label={tr('shopSet.pricingLabel')}>
            <View style={styles.chipRow}>
              {(['per_km', 'per_500m', 'per_100m', 'flat'] as Pricing[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => onChangePricingType(t)}
                  style={[styles.chip, pricingType === t && styles.chipActive]}
                >
                  <Text style={[styles.chipText, pricingType === t && styles.chipTextActive]}>
                    {pricingMeta(t).label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>{pricingMeta(pricingType).hint}</Text>
          </Field>

          <Field label={pricingMeta(pricingType).priceLabel}>
            <TextInput
              style={styles.input}
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
    <View style={styles.exampleBox}>
      <Text style={styles.exampleTitle}>{tr('shopSet.exampleTitle')}</Text>

      {freeKm > 0 ? (
        <View style={styles.exampleRow}>
          <Text style={styles.exampleDist}>0 – {freeKm} km</Text>
          <Text style={styles.exampleFree}>{tr('shopSet.free')}</Text>
        </View>
      ) : null}

      {freeKm < maxKm ? (
        <>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleDist}>{midDist.toFixed(1)} km</Text>
            <Text style={styles.exampleFee}>{fmtSom(midFee)} {tr('common.som')}</Text>
          </View>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleDist}>{tr('shopSet.edgeDist', { km: maxKm })}</Text>
            <Text style={styles.exampleFee}>{fmtSom(edgeFee)} {tr('common.som')}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.hint}>{tr('shopSet.allFree')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  toggleSub: { fontSize: 13, color: colors.text.tertiary, marginTop: 2 },
  showcaseNoticeBox: {
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  showcaseNoticeText: { ...typography.bodySmall, color: colors.brand.primary },
  mapZoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
  },
  mapZoneBtnText: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary, flex: 1 },
  input: {
    backgroundColor: colors.bg.canvas,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text.primary,
  },
  hint: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.canvas,
  },
  chipActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primarySurface },
  chipText: { ...typography.caption, fontWeight: '600', color: colors.text.secondary },
  chipTextActive: { color: colors.brand.primary, fontWeight: '700' },
  exampleBox: {
    backgroundColor: colors.bg.canvas,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  exampleTitle: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  exampleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exampleDist: { ...typography.caption, color: colors.text.tertiary },
  exampleFee: { ...typography.caption, fontWeight: '700', color: colors.text.primary },
  exampleFree: { ...typography.caption, fontWeight: '700', color: colors.feedback.success },
});
