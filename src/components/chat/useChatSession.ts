import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { api, extractErrorMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ChatMessage, ChatTemplate, ConversationMessage } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';

interface UseChatSessionOptions {
  readonly effectiveId: string;
  readonly isDirectConv: boolean;
  readonly productId?: string;
  readonly shopId?: string;
  readonly templatesOpen?: boolean;
  readonly onSentSuccess?: () => void;
}

interface MutationContext {
  previous?: (ChatMessage | ConversationMessage)[];
  tempId?: string;
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
  const myId = useAuthStore((s) => s.user?.id) ?? 'current_user';
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryKey = isDirectConv
    ? ['conversation-messages', effectiveId]
    : ['chat', effectiveId];

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
    queryKey,
    queryFn: async () => {
      if (isDirectConv) {
        const res = await api.get<ConversationMessage[]>(`/conversations/${effectiveId}/messages`);
        void api.post(`/conversations/${effectiveId}/read`).catch(() => {});
        return res.data;
      }
      const res = await api.get<ChatMessage[]>(`/orders/${effectiveId}/messages`);
      return res.data;
    },
    enabled: !!effectiveId,
  });

  // Socket listener for realtime incoming messages and typing events
  useEffect(() => {
    if (!effectiveId) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void getSocket().then((socket) => {
      if (cancelled) return;

      // Join order room for typing broadcasts and status updates
      if (!isDirectConv) {
        socket.emit('join:order', effectiveId);
      }

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

      const onTyping = (data: { orderId: string; userId: string; isTyping: boolean }) => {
        if (data.orderId !== effectiveId || data.userId === myId) return;
        setPeerIsTyping(Boolean(data.isTyping));
        if (data.isTyping) {
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => {
            setPeerIsTyping(false);
          }, 3500);
        }
      };

      socket.on('chat:message', onOrderMessage);
      socket.on('conversation:message', onConvMessage);
      socket.on('chat:typing', onTyping);

      cleanup = () => {
        if (!isDirectConv) socket.emit('leave:order', effectiveId);
        socket.off('chat:message', onOrderMessage);
        socket.off('conversation:message', onConvMessage);
        socket.off('chat:typing', onTyping);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [effectiveId, isDirectConv, myId, qc]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (isDirectConv || !effectiveId) return;
      void getSocket().then((socket) => {
        socket.emit('typing:order', { orderId: effectiveId, isTyping });
      });
    },
    [effectiveId, isDirectConv],
  );

  const send = useMutation({
    mutationFn: async (body: string) => {
      if (isDirectConv) {
        const payload: Record<string, unknown> = { text: body };
        if (productId) payload.attachedProductId = productId;
        const res = await api.post<ConversationMessage>(`/conversations/${effectiveId}/messages`, payload);
        return { isConv: true, data: res.data };
      }
      const res = await api.post<ChatMessage>(`/orders/${effectiveId}/messages`, { text: body });
      return { isConv: false, data: res.data };
    },
    onMutate: async (body: string): Promise<MutationContext> => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<(ChatMessage | ConversationMessage)[]>(queryKey);
      const tempId = `temp-${Date.now()}`;

      if (!isDirectConv) {
        const optimistic: ChatMessage = {
          id: tempId,
          orderId: effectiveId,
          senderUserId: myId,
          fromShop: false,
          text: body.trim(),
          createdAt: new Date().toISOString(),
          isPending: true,
        };
        qc.setQueryData<ChatMessage[]>(queryKey, (prev) => [...(prev ?? []), optimistic]);
      }

      onSentSuccess?.();
      return { previous, tempId };
    },
    onSuccess: (result, _variables, context) => {
      if (result.isConv) {
        const item = result.data as ConversationMessage;
        qc.setQueryData<ConversationMessage[]>(queryKey, (prev) => {
          if (!prev) return [item];
          if (prev.some((x) => x.id === item.id)) return prev;
          return [...prev, item];
        });
        void qc.invalidateQueries({ queryKey: ['conversations'] });
      } else {
        const real = result.data as ChatMessage;
        qc.setQueryData<ChatMessage[]>(queryKey, (prev) => {
          if (!prev) return [real];
          const exists = prev.some((x) => x.id === real.id);
          if (exists) return prev.filter((x) => x.id !== context?.tempId);
          return prev.map((x) => (x.id === context?.tempId ? real : x));
        });
      }
    },
    onError: (e, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
      toast.error(extractErrorMessage(e));
    },
  });

  return {
    messages: (messagesQuery.data ?? []) as (ChatMessage | ConversationMessage)[],
    isLoadingMessages: messagesQuery.isLoading,
    templates: templatesQuery.data ?? [],
    isLoadingTemplates: templatesQuery.isLoading,
    sendMessage: (text: string) => send.mutate(text),
    isSending: send.isPending,
    peerIsTyping,
    sendTyping,
  };
}
