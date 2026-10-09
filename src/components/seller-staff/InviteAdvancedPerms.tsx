import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import { PERMISSION_GROUPS } from '@/constants/staffPermissions';
import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

interface InviteAdvancedPermsProps {
  show: boolean;
  onToggleShow: () => void;
  permissions: string[];
  onTogglePerm: (key: string) => void;
  saveAsPreset: boolean;
  onToggleSaveAsPreset: (val: boolean) => void;
  presetName: string;
  onChangePresetName: (val: string) => void;
}

export function InviteAdvancedPerms({
  show,
  onToggleShow,
  permissions,
  onTogglePerm,
  saveAsPreset,
  onToggleSaveAsPreset,
  presetName,
  onChangePresetName,
}: InviteAdvancedPermsProps) {
  const { tr } = useTranslation();

  return (
    <>
      <Pressable
        className="flex-row items-center justify-between border-t border-border-subtle pt-3"
        onPress={onToggleShow}
      >
        <Text className="text-xs font-bold text-brand-primary">
          Batafsil huquqlar ({permissions.length} ta yoqilgan)
        </Text>
        {show ? (
          <ChevronUp size={18} color={colors.brand.primary} />
        ) : (
          <ChevronDown size={18} color={colors.brand.primary} />
        )}
      </Pressable>

      {show && (
        <View className="gap-3">
          {PERMISSION_GROUPS.map((group) => (
            <View key={group.titleKey} className="gap-0.5">
              <Text className="text-xs font-extrabold text-brand-primary uppercase mt-1">
                {tr(group.titleKey)}
              </Text>
              {group.items.map((item) => (
                <View key={item.key} className="flex-row justify-between items-center py-1.5">
                  <Text className="text-xs text-text-primary flex-1 pr-3">{tr(item.labelKey)}</Text>
                  <Switch
                    value={permissions.includes(item.key)}
                    onValueChange={() => onTogglePerm(item.key)}
                    trackColor={{ true: colors.feedback.success }}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      <Pressable
        className="flex-row items-center gap-2 mt-1"
        onPress={() => onToggleSaveAsPreset(!saveAsPreset)}
      >
        <Switch
          value={saveAsPreset}
          onValueChange={onToggleSaveAsPreset}
          trackColor={{ true: colors.feedback.success }}
        />
        <Text className="text-xs text-text-primary font-medium flex-1">
          Ushbu rolni yangi shablon sifatida saqlash
        </Text>
      </Pressable>

      {saveAsPreset && (
        <TextInput
          className="bg-bg-canvas rounded-xl border border-border-default px-3 py-2 text-sm text-text-primary"
          value={presetName}
          onChangeText={onChangePresetName}
          placeholder="Shablon nomi (masalan: 1-kassir)"
          placeholderTextColor={colors.text.hint}
        />
      )}
    </>
  );
}
