export async function requestNotificationPermission(): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "default") {
    return;
  }
  try {
    await Notification.requestPermission();
  } catch {
    // Some browsers throw if called outside a user gesture — nothing to do.
  }
}

/** Shows a system notification, via the service worker when one is active
 * so it still works with the tab in the background. */
export async function showNotification(title: string, body: string): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, {
        body,
        tag: "parqo-watch",
      });
      return;
    }
  } catch {
    // fall through to the plain Notification API
  }
  new Notification(title, { body });
}
