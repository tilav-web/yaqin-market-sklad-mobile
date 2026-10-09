import { Clock, Tag, X } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { Category } from '@/lib/types';
import { colors, typography } from '@/theme';

const SCREEN_W = Dimensions.get('window').width;

interface SearchLandingProps {
  history: string[];
  onRunTerm: (t: string) => void;
  onRemoveTerm: (t: string) => void;
  onClearHistory: () => void;
  categories: Category[];
  onPickCategory: (id: string) => void;
}

export function SearchLanding({
  history,
  onRunTerm,
  onRemoveTerm,
  onClearHistory,
  categories,
  onPickCategory,
}: SearchLandingProps) {
  const { tr, catName } = useTranslation();

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {history.length > 0 && (
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-1.5">
              <Clock size={15} color={colors.text.secondary} strokeWidth={2.4} />
              <Text style={[typography.bodyStrong, { color: colors.text.primary }]}>
                {tr('search.recent')}
              </Text>
            </View>
            <Pressable onPress={onClearHistory} hitSlop={8}>
              <Text className="font-bold" style={[typography.caption, { color: colors.brand.primary }]}>
                {tr('search.clear')}
              </Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {history.map((term) => (
              <View
                key={term}
                className="flex-row items-center rounded-full border pl-3 pr-2 h-9"
                style={{
                  backgroundColor: colors.bg.surface,
                  borderColor: colors.border.default,
                  maxWidth: SCREEN_W * 0.6,
                }}
              >
                <Pressable
                  className="flex-row items-center gap-1.5 flex-shrink"
                  onPress={() => onRunTerm(term)}
                  hitSlop={6}
                >
                  <Clock size={12} color={colors.text.tertiary} strokeWidth={2.4} />
                  <Text
                    className="font-semibold flex-shrink"
                    style={[typography.bodySmall, { color: colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {term}
                  </Text>
                </Pressable>
                <Pressable onPress={() => onRemoveTerm(term)} hitSlop={8} className="pl-2">
                  <X size={13} color={colors.text.tertiary} strokeWidth={2.6} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="mb-6">
        <View className="flex-row items-center gap-1.5 mb-3">
          <Tag size={15} color={colors.text.secondary} strokeWidth={2.4} />
          <Text style={[typography.bodyStrong, { color: colors.text.primary }]}>
            {tr('search.categories')}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {categories.map((c) => (
            <Pressable
              key={c.id}
              className="px-3.5 py-2 rounded-full border"
              style={{
                borderColor: colors.border.default,
                backgroundColor: colors.bg.surface,
              }}
              onPress={() => onPickCategory(c.id)}
            >
              <Text className="font-bold" style={[typography.caption, { color: colors.text.secondary }]}>
                {catName(c)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
