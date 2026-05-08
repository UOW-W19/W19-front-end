import { useState, useEffect, useRef, useCallback } from "react";
import { useStomp } from "@/contexts/useStomp";

export function useTypingIndicator(conversationId: string, currentUserId: string) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingDisplayName, setTypingDisplayName] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { client, isConnected } = useStomp();

  useEffect(() => {
    if (!client || !isConnected || !conversationId) return;

    const subscription = client.subscribe(`/topic/conversation.${conversationId}.typing`, (frame) => {
      let displayName: string | null = null;
      try {
        const payload = JSON.parse(frame.body) as { userId?: string; displayName?: string };
        if (payload.userId === currentUserId) return;
        displayName = payload.displayName ?? null;
      } catch {
        // Malformed payloads still mean another participant is typing.
      }

      setIsOtherTyping(true);
      setTypingDisplayName(displayName);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setIsOtherTyping(false);
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

  return { isOtherTyping, typingDisplayName, sendTyping };
}
