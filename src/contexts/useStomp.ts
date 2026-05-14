import { useContext } from "react";
import { StompContext } from "./stomp-context";

export function useStomp() {
  return useContext(StompContext);
}
