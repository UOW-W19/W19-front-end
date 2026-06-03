import { authenticatedRequest } from './request';
import type {
  AppNotification,
  NotificationActor,
  NotificationCenterSummary,
  NotificationType,
} from '@/types/api';
import { normalizeBackendTimestamp } from '@/lib/backendTimestamp';

interface BackendNotificationActor {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface BackendNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  target_url?: string;
  targetUrl?: string;
  entity_type?: string;
  entityType?: string;
  entity_id?: string;
  entityId?: string;
  read_at?: string;
  readAt?: string;
  created_at?: string;
  createdAt?: string;
  actor?: BackendNotificationActor | null;
}

interface BackendNotificationSummary {
  unread_notifications?: number;
  unreadNotifications?: number;
  total: number;
}

interface BackendPage<T> {
  content?: T[];
  last?: boolean;
  number?: number;
  total_pages?: number;
  totalPages?: number;
  total_elements?: number;
  totalElements?: number;
}

export interface NotificationsPageResponse {
  notifications: AppNotification[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  hasMore: boolean;
}

const transformActor = (actor?: BackendNotificationActor | null): NotificationActor | null => {
  if (!actor) return null;
  return {
    id: actor.id,
    username: actor.username,
    displayName: actor.display_name,
    avatarUrl: actor.avatar_url,
  };
};

const transformNotification = (notification: BackendNotification): AppNotification => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  targetUrl: notification.target_url ?? notification.targetUrl,
  entityType: notification.entity_type ?? notification.entityType,
  entityId: notification.entity_id ?? notification.entityId,
  readAt: normalizeBackendTimestamp(notification.read_at ?? notification.readAt),
  createdAt: normalizeBackendTimestamp(
    notification.created_at ?? notification.createdAt ?? new Date().toISOString()
  ),
  actor: transformActor(notification.actor),
});

const transformSummary = (summary: BackendNotificationSummary): NotificationCenterSummary => ({
  unreadNotifications: summary.unread_notifications ?? summary.unreadNotifications ?? 0,
  total: summary.total,
});

export const notificationsApi = {
  async getNotifications({
    unreadOnly = false,
    page = 0,
    size = 20,
  }: {
    unreadOnly?: boolean;
    page?: number;
    size?: number;
  } = {}): Promise<NotificationsPageResponse> {
    const search = new URLSearchParams({
      unreadOnly: String(unreadOnly),
      page: String(page),
      size: String(size),
    });
    const raw = await authenticatedRequest<BackendPage<BackendNotification>>(
      `/notifications?${search.toString()}`
    );

    return {
      notifications: (raw.content ?? []).map(transformNotification),
      currentPage: raw.number ?? page,
      totalPages: raw.total_pages ?? raw.totalPages ?? 0,
      totalElements: raw.total_elements ?? raw.totalElements ?? raw.content?.length ?? 0,
      hasMore: !(raw.last ?? true),
    };
  },

  async getSummary(): Promise<NotificationCenterSummary> {
    const raw = await authenticatedRequest<BackendNotificationSummary>('/notifications/summary');
    return transformSummary(raw);
  },

  async markRead(notificationId: string): Promise<AppNotification> {
    const raw = await authenticatedRequest<BackendNotification>(
      `/notifications/${notificationId}/read`,
      { method: 'PATCH' }
    );
    return transformNotification(raw);
  },

  async markAllRead(): Promise<NotificationCenterSummary> {
    const raw = await authenticatedRequest<BackendNotificationSummary>(
      '/notifications/read-all',
      { method: 'PATCH' }
    );
    return transformSummary(raw);
  },
};
