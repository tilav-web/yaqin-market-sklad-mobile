import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChatAttachedProduct,
  ChatHeader,
  ChatInputBar,
  ChatMessageBubble,
  ChatTemplatesDrawer,
} from '@/components/chat';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ChatMessage, ChatTemplate, ConversationMessage, PublicProductVariant } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/theme';
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
          void api.post(`/conversations/${effectiveId}/read`).catch(() => {});
          return res.data;
        } else {
          const res = await api.get<ChatMessage[]>(`/orders/${effectiveId}/messages`);
          return res.data;
        }
      } catch {
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
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      {/* Header */}
      <ChatHeader chatTitle={chatTitle} shopId={shopId} />

      {/* Attached Product Preview */}
      {productQuery.data && <ChatAttachedProduct product={productQuery.data} />}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {messagesQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text className="text-sm text-text-secondary text-center mt-12">{tr('chat.empty')}</Text>
            }
            renderItem={({ item }) => (
              <ChatMessageBubble
                text={item.text}
                createdAt={item.createdAt}
                isMine={item.senderUserId === myId}
              />
            )}
          />
        )}

        {/* Quick reply templates for shop sellers */}
        {templatesOpen && shopId && (
          <ChatTemplatesDrawer
            isLoading={templatesQuery.isLoading}
            templates={templatesQuery.data ?? []}
            onSelectTemplate={(templateText) => {
              setText(templateText);
              setTemplatesOpen(false);
            }}
          />
        )}

        {/* Message Input Bar */}
        <ChatInputBar
          text={text}
          onChangeText={setText}
          onSend={handleSend}
          isSending={send.isPending}
          hasShop={Boolean(shopId)}
          templatesOpen={templatesOpen}
          onToggleTemplates={() => setTemplatesOpen((v) => !v)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
