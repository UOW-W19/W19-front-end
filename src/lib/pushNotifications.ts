export const conversationNotificationTag = (conversationId: string) => `conversation:${conversationId}`;

export const closeConversationPushNotifications = (conversationId: string) => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const message = {
    type: "LOCALE_CLOSE_NOTIFICATIONS",
    tag: conversationNotificationTag(conversationId),
    entityType: "CONVERSATION",
    entityId: conversationId,
  };

  void navigator.serviceWorker.ready
    .then((registration) => {
      if (registration.active) {
        registration.active.postMessage(message);
        return;
      }

      navigator.serviceWorker.controller?.postMessage(message);
    })
    .catch(() => undefined);
};
