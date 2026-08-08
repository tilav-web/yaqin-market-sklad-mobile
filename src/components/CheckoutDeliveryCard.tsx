import {
  Check,
  ChevronRight,
  Crosshair,
  LocateFixed,
  MapPin,
  MapPinOff,
  MessageSquare,
  Phone,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import { useTranslation } from '@/i18n';
import { UserAddress } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

/** Delivery-zone verdict for the picked address, as reported by the shop query. */
export type ZoneState = 'checking' | 'in' | 'out' | 'unknown';

interface Props {
  readonly address: UserAddress | undefined;
  readonly loading: boolean;
  /** The account has at least one saved address — decides whether the empty
   *  state opens the picker sheet or sends the customer to add their first one. */
  readonly hasSavedAddresses: boolean;
  readonly onChangeAddress: () => void;
  readonly onAddAddress: () => void;
  readonly zone: ZoneState;
  readonly distanceKm?: number;
  /** Device GPS — surfaced so an unresolved location is visible rather than silent. */
  readonly gpsAvailable: boolean;
  readonly gpsLoading: boolean;
  readonly onEnableGps: () => void;
  readonly entrance: string;
  readonly floor: string;
  readonly apartment: string;
  readonly intercom: string;
  readonly phone: string;
  readonly comment: string;
  readonly onEntrance: (v: string) => void;
  readonly onFloor: (v: string) => void;
  readonly onApartment: (v: string) => void;
  readonly onIntercom: (v: string) => void;
  readonly onPhone: (v: string) => void;
  readonly onComment: (v: string) => void;
}

/**
 * Checkout's "where to" block: the picked address (with a static map preview
 * and an unmistakable selected/not-selected state) fused into one card with
 * everything the courier needs to reach the door — entrance/floor/apartment/
 * intercom, phone and a note. They live in a single hairline-divided group
 * because none of them mean anything apart from the address above them.
 */
export function CheckoutDeliveryCard({
  address,
  loading,
  hasSavedAddresses,
  onChangeAddress,
  onAddAddress,
  zone,
  distanceKm,
  gpsAvailable,
  gpsLoading,
  onEnableGps,
  entrance,
  floor,
  apartment,
  intercom,
  phone,
  comment,
  onEntrance,
  onFloor,
  onApartment,
  onIntercom,
  onPhone,
  onComment,
}: Props) {
  const { tr } = useTranslation();
  const [focused, setFocused] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.brand.primary} />
        </View>
      </View>
    );
  }

  if (!address) {
    return (
      <View style={[styles.card, styles.cardEmpty]}>
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}>
            <MapPinOff size={26} color={colors.feedback.warning} strokeWidth={2.2} />
          </View>
          <Text style={styles.emptyTitle}>{tr('checkout.noAddressTitle')}</Text>
          {!hasSavedAddresses && <Text style={styles.emptyBody}>{tr('checkout.noAddressEmptyBody')}</Text>}
          <Pressable
            style={styles.emptyBtn}
            onPress={() => {
              haptics.selection();
              if (hasSavedAddresses) onChangeAddress();
              else onAddAddress();
            }}>
            <MapPin size={17} color={colors.text.onPrimary} strokeWidth={2.4} />
            <Text style={styles.emptyBtnText}>
              {tr(hasSavedAddresses ? 'checkout.chooseAddressBtn' : 'checkout.addAddressBtn')}
            </Text>
          </Pressable>

          {/* The device's own location is reported either way — a missing GPS
              fix is a state the customer should see, not silence. */}
          <View style={styles.gpsRow}>
            {gpsLoading ? (
              <ActivityIndicator size="small" color={colors.text.tertiary} />
            ) : gpsAvailable ? (
              <LocateFixed size={14} color={colors.feedback.success} strokeWidth={2.4} />
            ) : (
              <Crosshair size={14} color={colors.text.hint} strokeWidth={2.4} />
            )}
            <Text style={[styles.gpsText, gpsAvailable && styles.gpsTextOk]}>
              {tr(gpsAvailable ? 'checkout.gpsFound' : 'checkout.gpsMissing')}
            </Text>
            {!gpsAvailable && !gpsLoading && (
              <Pressable hitSlop={8} onPress={onEnableGps}>
                <Text style={styles.gpsAction}>{tr('checkout.gpsEnable')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.addressRow, pressed && styles.addressRowPressed]}
        onPress={() => {
          haptics.selection();
          onChangeAddress();
        }}>
        <MapThumb latitude={address.latitude} longitude={address.longitude} />
        <View style={styles.addressBody}>
          <View style={styles.labelRow}>
            <Text style={styles.addressLabel} numberOfLines={1}>
              {address.label}
            </Text>
            <View style={styles.selectedChip}>
              <Check size={10} color={colors.text.onPrimary} strokeWidth={3.4} />
              <Text style={styles.selectedChipText}>{tr('checkout.selectedBadge')}</Text>
            </View>
          </View>
          <Text style={styles.addressText} numberOfLines={2}>
            {address.address}
          </Text>
          <ZonePill zone={zone} distanceKm={distanceKm} />
        </View>
        <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.4} />
      </Pressable>

      {/* One bordered group split by hairlines — door details, phone and note
          read as part of the address above, not as loose inputs. */}
      <View style={styles.group}>
        <View style={styles.groupRow}>
          <DetailField
            name="entrance"
            label={tr('addr.entrance')}
            value={entrance}
            onChange={onEntrance}
            focused={focused}
            setFocused={setFocused}
            keyboardType="number-pad"
            maxLength={6}
          />
          <View style={styles.vDivider} />
          <DetailField
            name="floor"
            label={tr('addr.floor')}
            value={floor}
            onChange={onFloor}
            focused={focused}
            setFocused={setFocused}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
        <View style={styles.hDivider} />
        <View style={styles.groupRow}>
          <DetailField
            name="apartment"
            label={tr('addr.apartment')}
            value={apartment}
            onChange={onApartment}
            focused={focused}
            setFocused={setFocused}
            maxLength={10}
          />
          <View style={styles.vDivider} />
          <DetailField
            name="intercom"
            label={tr('addr.intercom')}
            value={intercom}
            onChange={onIntercom}
            focused={focused}
            setFocused={setFocused}
            maxLength={12}
          />
        </View>
        <View style={styles.hDivider} />
        <IconField
          name="phone"
          icon={<Phone size={17} color={colors.text.tertiary} strokeWidth={2.2} />}
          placeholder={tr('checkout.recipientPhone')}
          value={phone}
          onChange={onPhone}
          focused={focused}
          setFocused={setFocused}
          keyboardType="phone-pad"
        />
        <View style={styles.hDivider} />
        <IconField
          name="comment"
          icon={<MessageSquare size={17} color={colors.text.tertiary} strokeWidth={2.2} />}
          placeholder={tr('checkout.courierComment')}
          value={comment}
          onChange={onComment}
          focused={focused}
          setFocused={setFocused}
          multiline
        />
      </View>
    </View>
  );
}

/** Non-interactive map preview of the delivery point (lite/static on Android). */
function MapThumb({ latitude, longitude }: { readonly latitude: number; readonly longitude: number }) {
  return (
    <View style={styles.mapThumb} pointerEvents="none">
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        liteMode={Platform.OS === 'android'}
        region={{ latitude, longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      />
      <View style={styles.mapPin}>
        <MapPin size={20} color={colors.brand.primary} fill={colors.brand.primarySurface} strokeWidth={2.4} />
      </View>
    </View>
  );
}

function ZonePill({ zone, distanceKm }: { readonly zone: ZoneState; readonly distanceKm?: number }) {
  const { tr } = useTranslation();
  if (zone === 'unknown') return null;

  if (zone === 'checking') {
    return (
      <View style={[styles.pill, styles.pillNeutral]}>
        <ActivityIndicator size="small" color={colors.text.tertiary} />
        <Text style={[styles.pillText, { color: colors.text.tertiary }]}>{tr('checkout.zoneChecking')}</Text>
      </View>
    );
  }

  const out = zone === 'out';
  return (
    <View style={[styles.pill, out ? styles.pillDanger : styles.pillSuccess]}>
      {out ? (
        <MapPinOff size={12} color={colors.feedback.danger} strokeWidth={2.6} />
      ) : (
        <Check size={12} color={colors.feedback.success} strokeWidth={3} />
      )}
      <Text style={[styles.pillText, { color: out ? colors.feedback.danger : colors.feedback.success }]}>
        {tr(out ? 'checkout.zoneOut' : 'checkout.zoneIn')}
        {!out && distanceKm != null ? ` · ${tr('checkout.distance', { km: distanceKm.toFixed(1) })}` : ''}
      </Text>
    </View>
  );
}

interface FieldProps {
  readonly name: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly focused: string | null;
  readonly setFocused: (v: string | null) => void;
  readonly keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  readonly maxLength?: number;
}

/** Half-width labelled cell — the four door details. */
function DetailField({
  name,
  label,
  value,
  onChange,
  focused,
  setFocused,
  keyboardType = 'default',
  maxLength,
}: FieldProps & { readonly label: string }) {
  const active = focused === name;
  return (
    <View style={[styles.cell, active && styles.cellActive]}>
      <Text style={[styles.cellLabel, active && styles.cellLabelActive]}>{label}</Text>
      <TextInput
        style={styles.cellInput}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(name)}
        onBlur={() => setFocused(null)}
        keyboardType={keyboardType}
        maxLength={maxLength}
        placeholder="—"
        placeholderTextColor={colors.text.hint}
        returnKeyType="done"
      />
    </View>
  );
}

/** Full-width icon + input row — phone and courier note. */
function IconField({
  name,
  icon,
  placeholder,
  value,
  onChange,
  focused,
  setFocused,
  keyboardType = 'default',
  multiline,
}: FieldProps & {
  readonly icon: React.ReactNode;
  readonly placeholder: string;
  readonly multiline?: boolean;
}) {
  const active = focused === name;
  return (
    <View style={[styles.iconRow, multiline && styles.iconRowMultiline, active && styles.cellActive]}>
      {icon}
      <TextInput
        style={styles.iconRowInput}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(name)}
        onBlur={() => setFocused(null)}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.text.hint}
        multiline={multiline}
        // A wrapping note must not submit on Enter, but the single-line phone
        // row should still close the keyboard.
        returnKeyType={multiline ? undefined : 'done'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  cardEmpty: { borderColor: colors.feedback.warning, borderWidth: 1.5 },
  loadingBox: { paddingVertical: spacing.xl, alignItems: 'center' },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addressRowPressed: { opacity: 0.6 },
  addressBody: { flex: 1, gap: 3 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addressLabel: { ...typography.h4, color: colors.text.primary, flexShrink: 1 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.feedback.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  selectedChipText: { ...typography.caption, fontSize: 10, color: colors.text.onPrimary, fontWeight: '800' },
  addressText: { ...typography.bodySmall, color: colors.text.secondary },

  mapThumb: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bg.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPin: { marginBottom: 6 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 2,
  },
  pillSuccess: { backgroundColor: colors.feedback.successSurface },
  pillDanger: { backgroundColor: colors.feedback.dangerSurface },
  pillNeutral: { backgroundColor: colors.bg.surfaceMuted },
  pillText: { ...typography.caption, fontWeight: '700' },

  group: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surfaceMuted,
    overflow: 'hidden',
  },
  groupRow: { flexDirection: 'row', alignItems: 'stretch' },
  vDivider: { width: 1, backgroundColor: colors.border.default },
  hDivider: { height: 1, backgroundColor: colors.border.default },
  cell: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 6 },
  cellActive: { backgroundColor: colors.bg.surface },
  cellLabel: { ...typography.caption, fontSize: 11, color: colors.text.tertiary, fontWeight: '600' },
  cellLabelActive: { color: colors.brand.primary },
  cellInput: { ...typography.bodyStrong, color: colors.text.primary, padding: 0, marginTop: 1, minHeight: 24 },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  iconRowMultiline: { alignItems: 'flex-start', paddingVertical: spacing.md },
  iconRowInput: { flex: 1, ...typography.body, color: colors.text.primary, padding: 0 },

  emptyBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.warningSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.h4, color: colors.text.primary, marginTop: 2 },
  emptyBody: { ...typography.bodySmall, color: colors.text.secondary },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    marginTop: spacing.xs,
  },
  emptyBtnText: { ...typography.button, fontSize: 15, color: colors.text.onPrimary },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  gpsText: { ...typography.caption, color: colors.text.hint },
  gpsTextOk: { color: colors.feedback.success },
  gpsAction: { ...typography.caption, color: colors.brand.primary, fontWeight: '800' },
});
