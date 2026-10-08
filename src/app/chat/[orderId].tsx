import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Package,
  Send,
  Store,
  Zap,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ChatMessage, ChatTemplate, ConversationMessage, PublicProductVariant } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { formatMoney } from '@/utils/formatMoney';
import { haptics } from '@/utils/haptics';

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    orderId: string;
    conversationId?: string;
    shopId?: string;
    title?: string;
    productId?: string;
  }>();

  const effectiveId = params.conversationId || params.orderId;
  const shopId = params.shopId;
  const chatTitle = params.title;
  const productId = params.productId;

  const { tr } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const myId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const listRef = useRef<FlatList<any>>(null);

  // If a product was attached when entering chat
  const productQuery = useQuery({
    queryKey: ['product-variant', productId],
    queryFn: async () => {
      const res = await api.get<PublicProductVariant>(`/catalog/products/${productId}`);
      return res.data;
    },
    enabled: !!productId,
  });

  const templatesQuery = useQuery({
    queryKey: ['chat-templates', shopId],
    queryFn: async () => {
      const res = await api.get<ChatTemplate[]>(`/seller/shops/${shopId}/chat-templates`);
      return res.data;
    },
    enabled: !!shopId && templatesOpen,
    staleTime: 5 * 60_000,
  });

  // Decide whether this is a direct conversation or an order chat
  const isDirectConv = Boolean(params.conversationId || (!params.orderId?.startsWith('ord_') && params.title));

  const messagesQuery = useQuery({
    queryKey: isDirectConv ? ['conversation-messages', effectiveId] : ['chat', effectiveId],
    queryFn: async () => {
      try {
        if (isDirectConv) {
          const res = await api.get<ConversationMessage[]>(`/conversations/${effectiveId}/messages`);
          // Mark conversation as read
          void api.post(`/conversations/${effectiveId}/read`).catch(() => {});
          return res.data;
        } else {
          const res = await api.get<ChatMessage[]>(`/orders/${effectiveId}/messages`);
          return res.data;
        }
      } catch {
        // Fallback try the other endpoint if first fails
        try {
          const res = await api.get<ChatMessage[]>(`/orders/${effectiveId}/messages`);
          return res.data;
        } catch {
          const res = await api.get<ConversationMessage[]>(`/conversations/${effectiveId}/messages`);
          return res.data;
        }
      }
    },
    enabled: !!effectiveId,
  });

  // Live updates: append incoming messages to cache
  useEffect(() => {
    if (!effectiveId) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void getSocket().then((socket) => {
      if (cancelled) return;

      const onOrderMessage = (m: ChatMessage) => {
        if (m.orderId !== effectiveId) return;
        qc.setQueryData<ChatMessage[]>(['chat', effectiveId], (prev) => {
          if (!prev) return [m];
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
      };

      const onConvMessage = (m: ConversationMessage) => {
        if (m.conversationId !== effectiveId) return;
        qc.setQueryData<ConversationMessage[]>(['conversation-messages', effectiveId], (prev) => {
          if (!prev) return [m];
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
        // Also refresh conversations list
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      };

      socket.on('chat:message', onOrderMessage);
      socket.on('conversation:message', onConvMessage);

      cleanup = () => {
        socket.off('chat:message', onOrderMessage);
        socket.off('conversation:message', onConvMessage);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [effectiveId, qc]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      if (isDirectConv) {
        const payload: any = { text: body };
        if (productId) payload.attachedProductId = productId;
        const res = await api.post<ConversationMessage>(`/conversations/${effectiveId}/messages`, payload);
        return { isConv: true, data: res.data };
      } else {
        const res = await api.post<ChatMessage>(`/orders/${effectiveId}/messages`, { text: body });
        return { isConv: false, data: res.data };
      }
    },
    onSuccess: (result) => {
      if (result.isConv) {
        qc.setQueryData<ConversationMessage[]>(['conversation-messages', effectiveId], (prev) => {
          if (!prev) return [result.data as ConversationMessage];
          if (prev.some((x) => x.id === result.data.id)) return prev;
          return [...prev, result.data as ConversationMessage];
        });
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      } else {
        qc.setQueryData<ChatMessage[]>(['chat', effectiveId], (prev) => {
          if (!prev) return [result.data as ChatMessage];
          if (prev.some((x) => x.id === result.data.id)) return prev;
          return [...prev, result.data as ChatMessage];
        });
      }
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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Telegram Style Chat Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.text.primary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatTitle || (shopId ? tr('nav.shop') : tr('nav.chat'))}
          </Text>
          <Text style={styles.headerStatus}>{tr('chat.online')}</Text>
        </View>

        {shopId ? (
          <Pressable
            onPress={() => router.push(`/shop/${shopId}` as any)}
            style={styles.shopNavBtn}>
            <Store size={20} color={colors.brand.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      {/* Attached Product Preview Banner if asking about a product */}
      {productQuery.data && (
        <View style={styles.attachedProductBanner}>
          {productQuery.data.photos?.[0] ? (
            <Image source={{ uri: productQuery.data.photos[0] }} style={styles.attachedImg} />
          ) : (
            <View style={styles.attachedFallback}>
              <Package size={20} color={colors.brand.primary} />
            </View>
          )}
          <View style={styles.attachedInfo}>
            <Text style={styles.attachedTitle} numberOfLines={1}>
              {productQuery.data.name}
            </Text>
            <Text style={styles.attachedPrice}>
              {formatMoney(productQuery.data.discountPrice ?? productQuery.data.price)} {tr('common.som')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(`/product/${productQuery.data.id}` as any)}
            style={styles.attachedAction}>
            <Text style={styles.attachedActionText}>{tr('chat.viewProduct')}</Text>
            <ChevronRight size={14} color={colors.brand.primary} />
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
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
              <Text style={styles.empty}>{tr('chat.empty')}</Text>
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.templatesList}>
                {(templatesQuery.data ?? []).map((t) => (
                  <Pressable
                    key={t.id}
                    style={styles.templateChip}
                    onPress={() => {
                      setText(t.text);
                      setTemplatesOpen(false);
                    }}>
                    <Text style={styles.templateChipText} numberOfLines={2}>
                      {t.text}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Telegram Input Bar */}
        <View style={styles.inputBar}>
          {shopId && (
            <Pressable
              style={[styles.templateBtn, templatesOpen && styles.templateBtnActive]}
              onPress={() => setTemplatesOpen((v) => !v)}>
              <Zap
                size={18}
                color={templatesOpen ? colors.text.onPrimary : colors.brand.primary}
                strokeWidth={2.2}
              />
            </Pressable>
          )}

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={tr('chat.placeholder')}
            placeholderTextColor={colors.text.hint}
            multiline
            onSubmitEditing={handleSend}
          />

          <Pressable
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || send.isPending}>
            <Send size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bg.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    padding: 6,
    borderRadius: radius.full,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerStatus: {
    ...typography.caption,
    fontSize: 11,
    color: colors.feedback.success,
    fontWeight: '500',
  },
  shopNavBtn: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
  },
  attachedProductBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.brand.primaryBorder,
  },
  attachedImg: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surfaceMuted,
  },
  attachedFallback: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedInfo: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  attachedTitle: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  attachedPrice: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  attachedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  attachedActionText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: layout.screenPadding,
    gap: spacing.sm,
    flexGrow: 1,
  },
  empty: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing['4xl'],
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  bubbleMine: {
    backgroundColor: colors.brand.primary,
    borderBottomRightRadius: radius.xs,
  },
  bubbleTheirs: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderBottomLeftRadius: radius.xs,
  },
  bubbleText: {
    ...typography.body,
    fontSize: 14.5,
    color: colors.text.primary,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: colors.text.onPrimary,
  },
  time: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: colors.text.onPrimary,
    opacity: 0.85,
  },
  templatesPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surfaceMuted,
    paddingVertical: spacing.sm,
  },
  templatesList: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
  },
  templateChip: {
    maxWidth: 200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  templateChipText: {
    ...typography.bodySmall,
    color: colors.text.primary,
    lineHeight: 18,
  },
  templateBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBtnActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.text.hint,
  },
});
