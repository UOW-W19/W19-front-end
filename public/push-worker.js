/* global clients */
const appTargetUrl = (rawTargetUrl) => {
  const targetUrl = new URL(rawTargetUrl || "/notifications", self.location.origin);
  const conversationMatch = targetUrl.pathname.match(/^\/conversations\/([^/?#]+)/);

  if (conversationMatch?.[1]) {
    return new URL(
      `/messages?conversationId=${encodeURIComponent(conversationMatch[1])}`,
      self.location.origin,
    );
  }

  return targetUrl;
};

const conversationIdFromPayload = (payload, targetUrl) => {
  if (payload.conversationId) return String(payload.conversationId);
  if (payload.entityType === "CONVERSATION" && payload.entityId) return String(payload.entityId);
  if (payload.entity_type === "CONVERSATION" && payload.entity_id) return String(payload.entity_id);

  const conversationMatch = targetUrl.pathname.match(/^\/conversations\/([^/?#]+)/);
  if (conversationMatch?.[1]) return conversationMatch[1];

  return targetUrl.searchParams.get("conversationId");
};

const closeMatchingNotifications = async ({ tag, entityType, entityId }) => {
  const notifications = await self.registration.getNotifications(tag ? { tag } : undefined);

  notifications.forEach((notification) => {
    const data = notification.data || {};
    const matchesTag = tag && notification.tag === tag;
    const matchesEntity =
      entityType &&
      entityId &&
      data.entityType === entityType &&
      String(data.entityId) === String(entityId);

    if (matchesTag || matchesEntity) {
      notification.close();
    }
  });
};

self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Locale";
  const targetUrl = appTargetUrl(payload.targetUrl || payload.target_url || "/notifications");
  const entityType = payload.entityType || payload.entity_type;
  const entityId = payload.entityId || payload.entity_id;
  const conversationId = conversationIdFromPayload(payload, targetUrl);
  const tag = conversationId
    ? `conversation:${conversationId}`
    : payload.notificationId || payload.type || "locale-notification";
  const options = {
    body: payload.body || "You have a new Locale notification.",
    icon: payload.icon || "/pwa-192x192.png",
    badge: payload.badge || "/pwa-64x64.png",
    tag,
    data: {
      targetUrl: targetUrl.href,
      notificationId: payload.notificationId,
      conversationId,
      entityType,
      entityId,
      tag,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = appTargetUrl(event.notification.data?.targetUrl || "/notifications");

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === targetUrl.origin) {
          return client.navigate(targetUrl.href).then(() => client.focus());
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl.href);
      }

      return undefined;
    }),
  );
});

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type !== "LOCALE_CLOSE_NOTIFICATIONS") return;

  event.waitUntil(closeMatchingNotifications(message));
});
