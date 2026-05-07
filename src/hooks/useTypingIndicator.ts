import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getStoredToken } from '@/services/api/auth';

export function useTypingIndicator(conversationId: string, currentUserId: string) {
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const stompClientRef = useRef<Client | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const token = getStoredToken();

        const client = new Client({
            webSocketFactory: () => new SockJS('/ws'),
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            reconnectDelay: 5000,
            onConnect: () => {
                client.subscribe(
                    `/topic/conversation.${conversationId}.typing`,
                    (frame) => {
                        try {
                            const payload = JSON.parse(frame.body) as { userId?: string };
                            if (payload.userId === currentUserId) return;
                        } catch {
                            // malformed payload — still show indicator
                        }
                        setIsOtherTyping(true);
                        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                        hideTimerRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
                    }
                );
            },
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            if (throttleRef.current) clearTimeout(throttleRef.current);
            client.deactivate();
        };
    }, [conversationId, currentUserId]);

    const sendTyping = useCallback(() => {
        if (throttleRef.current) return;
        const client = stompClientRef.current;
        if (!client?.connected) return;

        client.publish({
            destination: '/app/chat.typing',
            body: JSON.stringify({ cid: conversationId, userId: currentUserId }),
        });

        throttleRef.current = setTimeout(() => {
            throttleRef.current = null;
        }, 2000);
    }, [conversationId, currentUserId]);

    return { isOtherTyping, sendTyping };
}
