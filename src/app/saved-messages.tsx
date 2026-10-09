import { router } from 'expo-router';
import { ArrowLeft, ListChecks, Plus, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuickProductSearchModal } from '@/components/saved-messages/QuickProductSearchModal';
import { SavedItemRow } from '@/components/saved-messages/SavedItemRow';
import { useToast } from '@/components/ui';
import { useShoppingListStore } from '@/stores/shoppingList';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

export default function SavedMessagesScreen() {
  const { colors: activeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const items = useShoppingListStore((s) => s.items);
  const addItem = useShoppingListStore((s) => s.addItem);
  const toggleItem = useShoppingListStore((s) => s.toggleItem);
  const removeItem = useShoppingListStore((s) => s.removeItem);
  const clearCompleted = useShoppingListStore((s) => s.clearCompleted);

  const [inputText, setInputText] = useState('');
  const [searchTargetQuery, setSearchTargetQuery] = useState<string | null>(null);

  const activeCount = useMemo(() => items.filter((i) => !i.completed).length, [items]);
  const completedCount = useMemo(() => items.filter((i) => i.completed).length, [items]);

  const handleAdd = () => {
    if (!inputText.trim()) return;
    haptics.medium();
    addItem(inputText.trim());
    setInputText('');
  };

  const handleSearchItem = (query: string) => {
    setSearchTargetQuery(query);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg-canvas">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-3 py-2.5 border-b border-border-subtle bg-bg-surface">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full items-center justify-center bg-surface-muted active:opacity-70"
            hitSlop={8}
          >
            <ArrowLeft size={20} color={activeColors.text.primary} />
          </Pressable>
          <View>
            <Text className="text-base font-extrabold text-text-primary">
              Xarid ro'yxati
            </Text>
            <Text className="text-xs text-text-secondary">
              {activeCount > 0 ? `${activeCount} ta xarid rejalashtirilgan` : 'Barcha xaridlar bajarildi'}
            </Text>
          </View>
        </View>

        {completedCount > 0 && (
          <Pressable
            onPress={() => {
              haptics.warning();
              clearCompleted();
              toast.info('Bajarilgan xaridlar tozalandi');
            }}
            className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface-muted active:opacity-70"
          >
            <Trash2 size={13} color={activeColors.text.secondary} />
            <Text className="text-xs font-semibold text-text-secondary">Tozalash</Text>
          </Pressable>
        )}
      </View>

      {/* Checklist Items */}
      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-3 bg-brand-surface">
            <ListChecks size={32} color={activeColors.brand.primary} />
          </View>
          <Text className="text-lg font-bold text-text-primary text-center">Xarid ro'yxati bo'sh</Text>
          <Text className="text-sm text-text-secondary text-center mt-1 max-w-[260px]">
            Kerakli mahsulotlarni yozib qo'ying va bitta bosishda do'konlardan savatga qo'shing.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item }) => (
            <SavedItemRow
              item={item}
              onToggle={toggleItem}
              onDelete={removeItem}
              onSearch={handleSearchItem}
            />
          )}
        />
      )}

      {/* Bottom Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
      >
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="px-3 pt-2 bg-bg-surface border-t border-border-subtle"
        >
          <View className="flex-row items-center rounded-2xl px-3 py-1.5 bg-surface-muted border border-border-subtle gap-2">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Masalan: 2 ta non, sut, 1 kg olma..."
              placeholderTextColor={activeColors.text.hint}
              className="flex-1 text-sm py-1.5 text-text-primary"
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <Pressable
              onPress={handleAdd}
              disabled={!inputText.trim()}
              className={`w-9 h-9 rounded-xl items-center justify-center ${
                inputText.trim() ? 'bg-brand-primary active:scale-95' : 'bg-border-default'
              }`}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={2.6} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Quick Catalog Search Modal */}
      {searchTargetQuery && (
        <QuickProductSearchModal
          visible={!!searchTargetQuery}
          initialQuery={searchTargetQuery}
          onClose={() => setSearchTargetQuery(null)}
          onAddedToCart={() => {
            toast.success("Mahsulot savatga qo'shildi!");
          }}
        />
      )}
    </SafeAreaView>
  );
}
