/* global clients */
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
  const targetUrl = payload.targetUrl || "/notifications";
  const options = {
    body: payload.body || "You have a new Locale notification.",
    icon: payload.icon || "/pwa-192x192.png",
    badge: payload.badge || "/pwa-64x64.png",
    tag: payload.notificationId || payload.type || "locale-notification",
    data: {
      targetUrl,
      notificationId: payload.notificationId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.targetUrl || "/notifications", self.location.origin);

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
