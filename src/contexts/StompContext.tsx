import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Client } from "@stomp/stompjs";
import { getStoredToken } from "@/services/api/auth";
import { useAuth } from "@/contexts";
import { StompContext } from "./stomp-context";

const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
const WS_URL = `${wsProtocol}://${window.location.host}/ws-native`;

export function StompProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const client = useMemo(() => {
    if (!isAuthenticated) return null;
    const token = getStoredToken();

    return new Client({
      brokerURL: WS_URL,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onWebSocketClose: () => setIsConnected(false),
      onStompError: () => setIsConnected(false),
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!client) return;

    client.activate();

    return () => {
      setIsConnected(false);
      void client.deactivate();
    };
  }, [client]);

  const value = useMemo(
    () => ({
      client,
      isConnected,
    }),
    [client, isConnected],
  );

  return <StompContext.Provider value={value}>{children}</StompContext.Provider>;
}
