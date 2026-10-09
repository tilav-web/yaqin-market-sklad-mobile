import { MessageSquare, Phone } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

interface CheckoutDoorDetailsProps {
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

export function CheckoutDoorDetails({
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
}: CheckoutDoorDetailsProps) {
  const { tr } = useTranslation();
  const [focused, setFocused] = useState<string | null>(null);

  return (
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
