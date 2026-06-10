import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Send, Zap } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@/components/ui/Toast';
import { api, extractErrorMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ChatMessage, ChatTemplate } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function ChatScreen() {
  const { orderId, shopId } = useLocalSearchParams<{ orderId: string; shopId?: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const myId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const templatesQuery = useQuery({
    queryKey: ['chat-templates', shopId],
    queryFn: async () => {
      const res = await api.get<ChatTemplate[]>(`/seller/shops/${shopId}/chat-templates`);
      return res.data;
    },
    enabled: !!shopId && templatesOpen,
    staleTime: 5 * 60_000,
  });

  const messagesQuery = useQuery({
    queryKey: ['chat', orderId],
    queryFn: async () => {
      const res = await api.get<ChatMessage[]>(`/orders/${orderId}/messages`);
      return res.data;
    },
    enabled: !!orderId,
  });

  // Live updates: append incoming messages for this order to the cache.
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void getSocket().then((socket) => {
      if (cancelled) return;
      const onMessage = (m: ChatMessage) => {
        if (m.orderId !== orderId) return;
        qc.setQueryData<ChatMessage[]>(['chat', orderId], (prev) => {
          if (!prev) return [m];
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
      };
      socket.on('chat:message', onMessage);
      cleanup = () => socket.off('chat:message', onMessage);
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [orderId, qc]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post<ChatMessage>(`/orders/${orderId}/messages`, { text: body });
      return res.data;
    },
    onSuccess: (m) => {
      qc.setQueryData<ChatMessage[]>(['chat', orderId], (prev) => {
        if (!prev) return [m];
        if (prev.some((x) => x.id === m.id)) return prev;
        return [...prev, m];
      });
      setText('');
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  const handleSend = () => {
    const body = text.trim();
    if (!body || send.isPending) return;
    haptics.light();
    send.mutate(body);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        {messagesQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.empty}>Hali xabar yo‘q. Birinchi bo‘lib yozing.</Text>
            }
            renderItem={({ item }) => {
              const mine = item.senderUserId === myId;
              return (
                <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                      {item.text}
                    </Text>
                    <Text style={[styles.time, mine && styles.timeMine]}>
                      {new Date(item.createdAt).toLocaleTimeString('uz-UZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {templatesOpen && shopId && (
          <View style={styles.templatesPanel}>
            {templatesQuery.isLoading ? (
              <ActivityIndicator color={colors.brand.primary} style={{ margin: spacing.md }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesList}>
                {(templatesQuery.data ?? []).map((t) => (
                  <Pressable
                    key={t.id}
                    style={styles.templateChip}
                    onPress={() => { setText(t.text); setTemplatesOpen(false); }}>
                    <Text style={styles.templateChipText} numberOfLines={2}>{t.text}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}
        <View style={styles.inputBar}>
          {shopId && (
            <Pressable
              style={[styles.templateBtn, templatesOpen && styles.templateBtnActive]}
              onPress={() => setTemplatesOpen((v) => !v)}>
              <Zap size={18} color={templatesOpen ? colors.text.onPrimary : colors.brand.primary} strokeWidth={2.2} />
            </Pressable>
          )}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Xabar yozing…"
            placeholderTextColor={colors.text.hint}
            multiline
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || send.isPending}>
            <Send size={20} color={colors.text.onPrimary} strokeWidth={2.4} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: layout.screenPadding, gap: spacing.sm, flexGrow: 1 },
  empty: { ...typography.bodySmall, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing['4xl'] },
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg },
  bubbleMine: { backgroundColor: colors.brand.primary, borderBottomRightRadius: radius.xs },
  bubbleTheirs: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderBottomLeftRadius: radius.xs,
  },
  bubbleText: { ...typography.body, color: colors.text.primary },
  bubbleTextMine: { color: colors.text.onPrimary },
  time: { ...typography.caption, fontSize: 10, color: colors.text.tertiary, marginTop: 2, alignSelf: 'flex-end' },
  timeMine: { color: colors.text.onPrimary, opacity: 0.8 },
  templatesPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surfaceMuted,
    paddingVertical: spacing.sm,
  },
  templatesList: { paddingHorizontal: layout.screenPadding, gap: spacing.sm },
  templateChip: {
    maxWidth: 200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  templateChipText: { ...typography.bodySmall, color: colors.text.primary, lineHeight: 18 },
  templateBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBtnActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  input: {
    flex: 1,
    ...typography.body,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.text.hint },
});
