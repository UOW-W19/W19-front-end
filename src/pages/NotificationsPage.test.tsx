// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NotificationsPage from "./NotificationsPage";
import type { AppNotification } from "@/types/api";

const mocks = vi.hoisted(() => ({
  notificationsApi: {
    getNotifications: vi.fn(),
    getSummary: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

vi.mock("@/services/api/notifications", () => ({
  notificationsApi: mocks.notificationsApi,
}));

const unreadMessageNotification: AppNotification = {
  id: "notification-1",
  type: "MESSAGE",
  title: "New message",
  body: "Hello",
  targetUrl: "/conversations/conversation-1",
  entityType: "CONVERSATION",
  entityId: "conversation-1",
  createdAt: "2026-06-03T02:00:00.000Z",
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/notifications"]}>
        <NotificationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  mocks.notificationsApi.getNotifications.mockResolvedValue({
    notifications: [unreadMessageNotification],
    currentPage: 0,
    totalPages: 1,
    totalElements: 1,
    hasMore: false,
  });
  mocks.notificationsApi.getSummary
    .mockResolvedValueOnce({
      unreadNotifications: 1,
      total: 1,
    })
    .mockResolvedValue({
      unreadNotifications: 0,
      total: 1,
    });
  mocks.notificationsApi.markRead.mockResolvedValue({
    ...unreadMessageNotification,
    readAt: "2026-06-03T02:05:00.000Z",
  });
  mocks.notificationsApi.markAllRead.mockResolvedValue({
    unreadNotifications: 0,
    total: 1,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NotificationsPage", () => {
  it("marks an unread notification read when opening its target", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("New message"));

    await waitFor(() => {
      expect(mocks.notificationsApi.markRead).toHaveBeenCalledWith("notification-1");
    });
    expect(await screen.findByText("All caught up")).toBeTruthy();
  });
});
