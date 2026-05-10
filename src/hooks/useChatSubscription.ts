import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts";
import { useStomp } from "@/contexts/useStomp";
import type { BackendMessage, Conversation, Message } from "@/types/message";

const toMessage = (m: BackendMessage): Message => ({
  id: String(m.id),
  conversationId: String(m.conversationId),
  senderId: String(m.sender.id),
  senderDisplayName: m.sender.displayName || m.sender.display_name || m.sender.username,
  senderAvatarUrl: m.sender.avatarUrl || m.sender.avatar_url,
  content: m.content || "",
  imageUrl: m.imageUrl || m.image_url,
  createdAt: m.createdAt,
  isRead: m.isRead,
});

const getPreview = (message: Message) => {
  if (message.content.trim()) return message.content;
  if (message.imageUrl) return "Photo";
  return "";
};

export function useChatSubscription(conversationIds: string[], activeConversationId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { client, isConnected } = useStomp();
  const conversationIdsKey = useMemo(
    () => [...new Set(conversationIds)].sort().join("|"),
    [conversationIds],
  );
  const activeConversationIdRef = useRef(activeConversationId);
  const currentUserIdRef = useRef(user?.id);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    currentUserIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    if (!client || !isConnected || conversationIdsKey.length === 0) return;

    const subscribedConversationIds = conversationIdsKey.split("|");
    const subscriptions = subscribedConversationIds.map((conversationId) =>
      client.subscribe(`/topic/conversation.${conversationId}`, (frame) => {
        let incoming: Message;
        try {
          incoming = toMessage(JSON.parse(frame.body) as BackendMessage);
        } catch {
          return;
        }

        const activeConversationId = activeConversationIdRef.current;
        const currentUserId = currentUserIdRef.current;
        const isOwnMessage = incoming.senderId === currentUserId;

        queryClient.setQueryData(["messages", incoming.conversationId], (old: Message[] | undefined) => {
          if (!old) return old;
          if (old.some((message) => message.id === incoming.id)) return old;
          return [...old, incoming];
        });

        if (incoming.conversationId !== activeConversationId) {
          queryClient.invalidateQueries({ queryKey: ["messages", incoming.conversationId] });
        }

        queryClient.setQueryData(["conversations"], (old: Conversation[] = []) => {
          const existingIndex = old.findIndex((conversation) => conversation.id === incoming.conversationId);
          if (existingIndex === -1) {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            return old;
          }

          const next = [...old];
          const existing = next[existingIndex];
          const alreadyApplied = existing.lastMessage?.id === incoming.id;
          const shouldIncrementUnread =
            !alreadyApplied &&
            !isOwnMessage &&
            incoming.conversationId !== activeConversationId;

          next.splice(existingIndex, 1);
          next.unshift({
            ...existing,
            lastMessage: {
              ...incoming,
              content: getPreview(incoming),
            },
            unreadCount: shouldIncrementUnread ? existing.unreadCount + 1 : existing.unreadCount,
            updatedAt: incoming.createdAt,
          });

          return next;
        });
      }),
    );

    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
  }, [client, conversationIdsKey, isConnected, queryClient]);

  // Subscribe once to the user-specific queue so new conversations are detected immediately
  useEffect(() => {
    if (!client || !isConnected) return;

    const subscription = client.subscribe('/user/queue/conversations', () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => subscription.unsubscribe();
  }, [client, isConnected, queryClient]);
}
