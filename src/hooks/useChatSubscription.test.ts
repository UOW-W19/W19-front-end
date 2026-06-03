import { describe, expect, it } from "vitest";

import { toSubscribedMessage } from "./useChatSubscription";
import type { BackendMessage } from "@/types/message";

describe("chat subscription transforms", () => {
  it("normalizes live message timestamps from legacy timezone-less backend values", () => {
    const message: BackendMessage = {
      id: "message-1",
      conversationId: "conversation-1",
      sender: {
        id: "sender-1",
        username: "sender",
        displayName: "Sender",
      },
      content: "Hello",
      isRead: false,
      createdAt: "2026-06-03T02:00:00",
    };

    expect(toSubscribedMessage(message).createdAt).toBe("2026-06-03T02:00:00.000Z");
  });
});
