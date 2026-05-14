import { useState, useEffect, useRef, useCallback } from "react";
import { useStomp } from "@/contexts/useStomp";

interface TypingPayload {
  userId?: string;
  senderId?: string;
  profileId?: string;
  displayName?: string;
  display_name?: string;
}

export function useTypingIndicator(conversationId: string, currentUserId: string) {
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null);
  const [typingDisplayName, setTypingDisplayName] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { client, isConnected } = useStomp();

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, [conversationId]);

  useEffect(() => {
    if (!client || !isConnected || !conversationId) return;

    const subscription = client.subscribe(`/topic/conversation.${conversationId}.typing`, (frame) => {
      let displayName: string | null = null;
      try {
        const payload = JSON.parse(frame.body) as TypingPayload;
        const senderId = payload.userId ?? payload.senderId ?? payload.profileId;
        if (senderId && senderId === currentUserId) return;
        displayName = payload.displayName ?? payload.display_name ?? null;
      } catch {
        // Malformed payloads still mean another participant is typing.
      }

      setTypingConversationId(conversationId);
      setTypingDisplayName(displayName);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setTypingConversationId(null);
        setTypingDisplayName(null);
      }, 3000);
    });

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (throttleRef.current) clearTimeout(throttleRef.current);
      subscription.unsubscribe();
    };
  }, [client, conversationId, currentUserId, isConnected]);

  const sendTyping = useCallback(() => {
    if (throttleRef.current) return;
    if (!client?.connected) return;

    client.publish({
      destination: "/app/chat.typing",
      body: JSON.stringify({ cid: conversationId, isTyping: true }),
    });

    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
    }, 2000);
  }, [client, conversationId]);

  return { isOtherTyping: typingConversationId === conversationId, typingDisplayName, sendTyping };
}
