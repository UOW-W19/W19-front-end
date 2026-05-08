import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { getStoredToken } from '@/services/api/auth';

const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const WS_URL = `${wsProtocol}://${window.location.host}/ws-native`;

export function useTypingIndicator(conversationId: string, currentUserId: string) {
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [typingDisplayName, setTypingDisplayName] = useState<string | null>(null);
    const stompClientRef = useRef<Client | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const token = getStoredToken();

        let retries = 0;

        const client = new Client({
            brokerURL: WS_URL,
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            reconnectDelay: 5000,
            onWebSocketError: () => {
                retries++;
                if (retries >= 3) client.deactivate();
            },
            onConnect: () => {
                retries = 0;
                client.subscribe(
                    `/topic/conversation.${conversationId}.typing`,
                    (frame) => {
                        let displayName: string | null = null;
                        try {
                            const payload = JSON.parse(frame.body) as { userId?: string; displayName?: string };
                            if (payload.userId === currentUserId) return;
                            displayName = payload.displayName ?? null;
                        } catch {
                            // malformed payload — still show indicator
                        }
                        setIsOtherTyping(true);
                        setTypingDisplayName(displayName);
                        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                        hideTimerRef.current = setTimeout(() => {
                            setIsOtherTyping(false);
                            setTypingDisplayName(null);
                        }, 3000);
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

    return { isOtherTyping, typingDisplayName, sendTyping };
}
