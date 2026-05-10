import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Client } from "@stomp/stompjs";
import { getStoredToken } from "@/services/api/auth";
import { useAuth } from "@/contexts";
import { StompContext } from "./stomp-context";

const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
const WS_URL = `${wsProtocol}://${window.location.host}/ws-native`;
const shouldLogStomp = import.meta.env.DEV;

export function StompProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const client = useMemo(() => {
    if (!isAuthenticated) return null;

    const stompClient = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      beforeConnect: async () => {
        const freshToken = getStoredToken();
        stompClient.connectHeaders = freshToken
          ? { Authorization: `Bearer ${freshToken}` }
          : {};
      },
      debug: shouldLogStomp ? (message) => console.debug("[stomp]", message) : undefined,
      onConnect: () => {
        if (shouldLogStomp) console.debug("[stomp:connect]", WS_URL);
        setIsConnected(true);
      },
      onDisconnect: () => {
        if (shouldLogStomp) console.debug("[stomp:disconnect]");
        setIsConnected(false);
      },
      onWebSocketClose: (event) => {
        if (shouldLogStomp) console.debug("[stomp:websocket-close]", event.code, event.reason);
        else if (event.code !== 1000 && event.code !== 1001) console.warn("[stomp:websocket-close]", event.code, event.reason);
        setIsConnected(false);
      },
      onStompError: (frame) => {
        if (shouldLogStomp) console.error("[stomp:error]", frame.headers.message, frame.body);
        else console.warn("[stomp:error]", frame.headers.message);
        setIsConnected(false);
      },
    });
    return stompClient;
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
