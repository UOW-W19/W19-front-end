import { createContext } from "react";
import type { Client } from "@stomp/stompjs";

export interface StompContextValue {
  client: Client | null;
  isConnected: boolean;
}

export const StompContext = createContext<StompContextValue>({
  client: null,
  isConnected: false,
});
