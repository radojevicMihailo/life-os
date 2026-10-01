/* Life OS push worker: no private page caching. */
function appUrl(value) {
  try {
    const url = new URL(value || "/calendar", self.location.origin);
    if (url.origin === self.location.origin && (url.protocol === "https:" || url.protocol === "http:")) return url.href;
  } catch { /* Use the app calendar for invalid destinations. */ }
  return new URL("/calendar", self.location.origin).href;
}
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Always display a visible notification. */ }
  event.waitUntil(self.registration.showNotification(typeof data.title === "string" ? data.title : "Life OS", {
    body: typeof data.body === "string" ? data.body : "Imaš novi podsetnik.",
    icon: "/icon-192.png",
    tag: typeof data.tag === "string" ? data.tag : "life-os-reminder",
    data: { url: appUrl(data.url) },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = appUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && "navigate" in client) {
        await client.navigate(url);
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
