import {
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
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  readonly address: UserAddress | undefined;
  readonly loading: boolean;
  /** The account has at least one saved address — decides whether the empty
   *  state opens the picker sheet or sends the customer to add their first one. */
  readonly hasSavedAddresses: boolean;
  readonly onChangeAddress: () => void;
  readonly onAddAddress: () => void;
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
 * Checkout's "where to" block: the picked address (with a static map preview,
 * and an unmissable empty state when nothing is picked yet) fused into one
 * card with everything the courier needs to reach the door —
 * entrance/floor/apartment/intercom, phone and a note.
 */
export function CheckoutDeliveryCard({
  address,
  loading,
  hasSavedAddresses,
  onChangeAddress,
  onAddAddress,
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
      <View className="bg-surface rounded-2xl p-4 border border-border-subtle items-center py-8">
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (!address) {
    return (
      <View className="bg-surface rounded-2xl p-4 border-[1.5px] border-feedback-warning">
        <View className="items-center gap-2 py-2">
          <View className="w-13 h-13 rounded-full bg-feedback-warning/10 items-center justify-center">
            <MapPinOff size={26} color={colors.feedback.warning} strokeWidth={2.2} />
          </View>
          <Text className="text-lg font-bold text-text-primary mt-0.5">{tr('checkout.noAddressTitle')}</Text>
          {!hasSavedAddresses && <Text className="text-sm text-text-secondary">{tr('checkout.noAddressEmptyBody')}</Text>}
          <Pressable
            className="flex-row items-center justify-center gap-2 self-stretch h-12 rounded-xl bg-brand-primary mt-1"
            onPress={() => {
              haptics.selection();
              if (hasSavedAddresses) onChangeAddress();
              else onAddAddress();
            }}>
            <MapPin size={17} color={colors.text.onPrimary} strokeWidth={2.4} />
            <Text className="text-sm font-bold text-white">
              {tr(hasSavedAddresses ? 'checkout.chooseAddressBtn' : 'checkout.addAddressBtn')}
            </Text>
          </Pressable>

          <View className="flex-row items-center gap-1.5 mt-1">
            {gpsLoading ? (
              <ActivityIndicator size="small" color={colors.text.tertiary} />
            ) : gpsAvailable ? (
              <LocateFixed size={14} color={colors.feedback.success} strokeWidth={2.4} />
            ) : (
              <Crosshair size={14} color={colors.text.hint} strokeWidth={2.4} />
            )}
            <Text className={`text-xs ${gpsAvailable ? 'text-feedback-success' : 'text-text-hint'}`}>
              {tr(gpsAvailable ? 'checkout.gpsFound' : 'checkout.gpsMissing')}
            </Text>
            {!gpsAvailable && !gpsLoading && (
              <Pressable hitSlop={8} onPress={onEnableGps}>
                <Text className="text-xs font-bold text-brand-primary">{tr('checkout.gpsEnable')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-surface rounded-2xl p-4 gap-3.5 border border-border-subtle shadow-xs">
      <Pressable
        className="flex-row items-center gap-3.5 active:opacity-60"
        onPress={() => {
          haptics.selection();
          onChangeAddress();
        }}>
        <MapThumb latitude={address.latitude} longitude={address.longitude} />
        <View className="flex-1 gap-1">
          <Text className="text-base font-bold text-text-primary" numberOfLines={1}>
            {address.label}
          </Text>
          <Text className="text-xs text-text-secondary" numberOfLines={2}>
            {address.address}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.4} />
      </Pressable>

      {/* Door details, phone, courier comment */}
      <View className="border border-border rounded-xl bg-surface-muted overflow-hidden">
        <View className="flex-row items-stretch">
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
          <View className="w-[1px] bg-border" />
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
        <View className="h-[1px] bg-border" />
        <View className="flex-row items-stretch">
          <DetailField
            name="apartment"
            label={tr('addr.apartment')}
            value={apartment}
            onChange={onApartment}
            focused={focused}
            setFocused={setFocused}
            maxLength={10}
          />
          <View className="w-[1px] bg-border" />
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
        <View className="h-[1px] bg-border" />
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
        <View className="h-[1px] bg-border" />
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
    <View className="w-17 h-17 rounded-xl overflow-hidden bg-surface-muted border border-border-subtle items-center justify-center" pointerEvents="none">
      <MapView
        key={`${latitude},${longitude}`}
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
      <View className="mb-1.5">
        <MapPin size={20} color={colors.brand.primary} fill={colors.brand.primarySurface} strokeWidth={2.4} />
      </View>
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
    <View className={`flex-1 px-3.5 pt-2 pb-1.5 ${active ? 'bg-surface' : ''}`}>
      <Text className={`text-[11px] font-semibold ${active ? 'text-brand-primary' : 'text-text-tertiary'}`}>{label}</Text>
      <TextInput
        className="text-sm font-semibold text-text-primary p-0 mt-0.5 min-h-[24px]"
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
    <View
      className={`flex-row items-center gap-2.5 px-3.5 min-h-[48px] ${
        multiline ? 'items-start py-3' : ''
      } ${active ? 'bg-surface' : ''}`}>
      {icon}
      <TextInput
        className="flex-1 text-base text-text-primary p-0"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(name)}
        onBlur={() => setFocused(null)}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.text.hint}
        multiline={multiline}
        returnKeyType={multiline ? undefined : 'done'}
      />
    </View>
  );
}
