import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticatedRequest } from "./request";
import { messagesApi } from "./messages";

vi.mock("./request", () => ({
  authenticatedRequest: vi.fn(),
}));

const requestMock = vi.mocked(authenticatedRequest);

const backendSender = {
  id: "sender-1",
  email: "sender@example.com",
  username: "sender",
  displayName: "Sender",
};

beforeEach(() => {
  requestMock.mockReset();
});

describe("messages API transforms", () => {
  it("normalizes message timestamps from legacy timezone-less backend values", async () => {
    requestMock.mockResolvedValue([
      {
        id: "message-1",
        conversationId: "conversation-1",
        sender: backendSender,
        content: "Hello",
        isRead: false,
        createdAt: "2026-06-03T02:00:00",
      },
    ]);

    const messages = await messagesApi.getMessages("conversation-1");

    expect(messages[0].createdAt).toBe("2026-06-03T02:00:00.000Z");
  });

  it("normalizes conversation preview timestamps", async () => {
    requestMock.mockResolvedValue([
      {
        id: "conversation-1",
        participants: [backendSender],
        isGroup: false,
        lastMessagePreview: "Hello",
        lastMessageAt: "2026-06-03T02:00:00",
        unreadCount: 1,
        createdAt: "2026-06-03T01:00:00",
        updatedAt: "2026-06-03T02:00:00",
      },
    ]);

    const conversations = await messagesApi.getConversations();

    expect(conversations[0].updatedAt).toBe("2026-06-03T02:00:00.000Z");
    expect(conversations[0].lastMessage?.createdAt).toBe("2026-06-03T02:00:00.000Z");
  });

  it("maps the conversation read receipt and notification summary", async () => {
    requestMock.mockResolvedValue({
      conversation_id: "conversation-1",
      read_at: "2026-06-03T02:05:00",
      conversation_unread_count: 0,
      notifications_read: 1,
      notification_summary: {
        unread_notifications: 2,
        total: 8,
      },
    });

    const receipt = await messagesApi.markAsRead("conversation-1");

    expect(receipt).toEqual({
      conversationId: "conversation-1",
      readAt: "2026-06-03T02:05:00.000Z",
      conversationUnreadCount: 0,
      notificationsRead: 1,
      notificationSummary: {
        unreadNotifications: 2,
        total: 8,
      },
    });
  });

  it("keeps mark-as-read compatible with older empty backend responses", async () => {
    requestMock.mockResolvedValue({});

    const receipt = await messagesApi.markAsRead("conversation-1");

    expect(receipt).toEqual({
      conversationId: "conversation-1",
      readAt: undefined,
      conversationUnreadCount: 0,
      notificationsRead: 0,
      notificationSummary: undefined,
    });
  });
});
