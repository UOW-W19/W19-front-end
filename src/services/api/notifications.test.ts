import { beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeBackendTimestamp } from "@/lib/backendTimestamp";
import { authenticatedRequest } from "./request";
import { notificationsApi } from "./notifications";

vi.mock("./request", () => ({
  authenticatedRequest: vi.fn(),
}));

const requestMock = vi.mocked(authenticatedRequest);

beforeEach(() => {
  requestMock.mockReset();
});

describe("backend timestamp normalization", () => {
  it("treats timezone-less backend timestamps as UTC", () => {
    expect(normalizeBackendTimestamp("2026-06-03T02:00:00")).toBe("2026-06-03T02:00:00.000Z");
  });

  it("preserves timestamps that already include a timezone", () => {
    expect(normalizeBackendTimestamp("2026-06-03T02:00:00Z")).toBe("2026-06-03T02:00:00.000Z");
    expect(normalizeBackendTimestamp("2026-06-03T12:00:00+10:00")).toBe("2026-06-03T02:00:00.000Z");
  });

  it("normalizes notification timestamps and maps entity metadata", async () => {
    requestMock.mockResolvedValue({
      content: [
        {
          id: "notification-1",
          type: "MESSAGE",
          title: "New message",
          body: "Hello",
          target_url: "/conversations/123",
          entity_type: "CONVERSATION",
          entity_id: "123",
          read_at: "2026-06-03T02:05:00",
          created_at: "2026-06-03T02:00:00",
        },
      ],
      number: 0,
      total_pages: 1,
      total_elements: 1,
      last: true,
    });

    const result = await notificationsApi.getNotifications();

    expect(result.notifications[0]).toMatchObject({
      id: "notification-1",
      targetUrl: "/conversations/123",
      entityType: "CONVERSATION",
      entityId: "123",
      readAt: "2026-06-03T02:05:00.000Z",
      createdAt: "2026-06-03T02:00:00.000Z",
    });
  });
});
