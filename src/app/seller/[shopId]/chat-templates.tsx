import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { GripVertical, Plus, Trash2, Zap } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, extractErrorMessage } from '@/lib/api';
import { ChatTemplate } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

export default function ChatTemplatesScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChatTemplate | null>(null);
  const [text, setText] = useState('');

  const templatesQuery = useQuery({
    queryKey: ['chat-templates', shopId],
    queryFn: async () => {
      const res = await api.get<ChatTemplate[]>(`/seller/shops/${shopId}/chat-templates`);
      return res.data;
    },
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: async () => {
      await api.post(`/seller/shops/${shopId}/chat-templates`, { text: text.trim() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-templates', shopId] });
      setCreateOpen(false);
      setText('');
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      await api.put(`/seller/shops/${shopId}/chat-templates/${editTarget.id}`, { text: text.trim() });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-templates', shopId] });
      setEditTarget(null);
      setText('');
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/seller/shops/${shopId}/chat-templates/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-templates', shopId] }),
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const templates = templatesQuery.data ?? [];
  const system = templates.filter((t) => t.isSystem);
  const custom = templates.filter((t) => !t.isSystem);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {templatesQuery.isLoading ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[...system, ...custom]}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.hint}>
              Chat ekranidagi ⚡ tugmasini bosib tez javob shablonlarini ishlating.
              Tizim shablonlarini tahrirlab bo'lmaydi.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.isSystem && styles.cardSystem]}>
              {!item.isSystem && (
                <GripVertical size={18} color={colors.text.tertiary} strokeWidth={2} />
              )}
              {item.isSystem && (
                <Zap size={16} color={colors.brand.primary} strokeWidth={2} />
              )}
              <Text style={styles.templateText} numberOfLines={3}>{item.text}</Text>
              {!item.isSystem && (
                <View style={styles.actions}>
                  <Pressable
                    style={styles.editBtn}
                    onPress={() => { setEditTarget(item); setText(item.text); }}>
                    <Text style={styles.editBtnText}>Tahrir</Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() =>
                      Alert.alert("O'chirish", "Ushbu shablonni o'chirasizmi?", [
                        { text: 'Bekor', style: 'cancel' },
                        { text: "O'chirish", style: 'destructive', onPress: () => remove.mutate(item.id) },
                      ])
                    }>
                    <Trash2 size={16} color={colors.feedback.danger} strokeWidth={2.2} />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => { setText(''); setCreateOpen(true); }}>
        <Plus size={20} color={colors.text.onPrimary} strokeWidth={2.8} />
        <Text style={styles.fabText}>Shablon</Text>
      </Pressable>

      <Modal
        visible={createOpen || !!editTarget}
        transparent
        animationType="slide"
        onRequestClose={() => { setCreateOpen(false); setEditTarget(null); }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editTarget ? 'Shablonni tahrirlash' : "Yangi shablon qo'shish"}</Text>
            <TextInput
              style={styles.textArea}
              value={text}
              onChangeText={setText}
              placeholder="Masalan: Assalomu alaykum! Buyurtmangiz qabul qilindi."
              placeholderTextColor={colors.text.hint}
              multiline
              autoFocus
            />
            <Pressable
              style={[styles.confirmBtn, (create.isPending || update.isPending) && { opacity: 0.6 }]}
              onPress={() => editTarget ? update.mutate() : create.mutate()}
              disabled={create.isPending || update.isPending || !text.trim()}>
              {(create.isPending || update.isPending) ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={styles.confirmBtnText}>{editTarget ? 'Saqlash' : "Qo'shish"}</Text>
              )}
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { setCreateOpen(false); setEditTarget(null); }}>
              <Text style={styles.cancelBtnText}>Bekor qilish</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, paddingBottom: 96, gap: spacing.sm },
  hint: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  cardSystem: { borderColor: colors.brand.primaryBorder, backgroundColor: colors.brand.primarySurface },
  templateText: { ...typography.body, color: colors.text.primary, flex: 1, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  editBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  editBtnText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    ...shadow.lg,
  },
  fabText: { ...typography.body, fontWeight: '800', color: colors.text.onPrimary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  sheetTitle: { ...typography.h3, color: colors.text.primary },
  textArea: {
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg.surfaceMuted,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { ...typography.button, color: colors.text.onPrimary },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelBtnText: { ...typography.body, color: colors.text.secondary },
});
