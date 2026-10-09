import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useToast } from '@/components/ui/Toast';
import { api, extractErrorMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ChatMessage, ChatTemplate, ConversationMessage } from '@/lib/types';

interface UseChatSessionOptions {
  readonly effectiveId: string;
  readonly isDirectConv: boolean;
  readonly productId?: string;
  readonly shopId?: string;
  readonly templatesOpen: boolean;
  readonly onSentSuccess?: () => void;
}

export function useChatSession({
  effectiveId,
  isDirectConv,
  productId,
  shopId,
  templatesOpen,
  onSentSuccess,
}: UseChatSessionOptions) {
  const qc = useQueryClient();
  const toast = useToast();

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
    queryKey: isDirectConv ? ['conversation-messages', effectiveId] : ['chat', effectiveId],
    queryFn: async () => {
      try {
        if (isDirectConv) {
          const res = await api.get<ConversationMessage[]>(`/conversations/${effectiveId}/messages`);
          void api.post(`/conversations/${effectiveId}/read`).catch(() => {});
          return res.data;
        }
        const res = await api.get<ChatMessage[]>(`/orders/${effectiveId}/messages`);
        return res.data;
      } catch {
        const res = await api.get<ChatMessage[]>(`/orders/${effectiveId}/messages`);
        return res.data;
      }
    },
    enabled: !!effectiveId,
  });

  // Socket listener for realtime incoming messages
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
      }
      const res = await api.post<ChatMessage>(`/orders/${effectiveId}/messages`, { text: body });
      return { isConv: false, data: res.data };
    },
    onSuccess: (result) => {
      if (result.isConv) {
        qc.setQueryData<ConversationMessage[]>(['conversation-messages', effectiveId], (prev) => {
          const item = result.data as ConversationMessage;
          if (!prev) return [item];
          if (prev.some((x) => x.id === item.id)) return prev;
          return [...prev, item];
        });
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      } else {
        qc.setQueryData<ChatMessage[]>(['chat', effectiveId], (prev) => {
          const item = result.data as ChatMessage;
          if (!prev) return [item];
          if (prev.some((x) => x.id === item.id)) return prev;
          return [...prev, item];
        });
      }
      onSentSuccess?.();
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  return {
    messages: (messagesQuery.data ?? []) as (ChatMessage | ConversationMessage)[],
    isLoadingMessages: messagesQuery.isLoading,
    templates: templatesQuery.data ?? [],
    isLoadingTemplates: templatesQuery.isLoading,
    sendMessage: (text: string) => send.mutate(text),
    isSending: send.isPending,
  };
}
