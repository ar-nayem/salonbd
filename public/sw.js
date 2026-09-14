const CACHE = "salonbd-v2";
// On a dev server, caching would serve stale bundles over hot reload.
const IS_DEV = ["localhost", "127.0.0.1"].includes(self.location.hostname);
const APP_SHELL = ["/", "/offline", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  if (IS_DEV) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (IS_DEV) return;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Network first for pages, cache first for static assets.
  const isAsset = /\.(png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$/.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/offline"))),
  );
});

// ---------------- Reminders ----------------

self.addEventListener("push", (event) => {
  let data = { title: "SalonBD", body: "", url: "/bookings", tag: undefined };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      // A reminder that replaces an older one for the same booking should still buzz.
      renotify: Boolean(data.tag),
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/bookings", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url === target);
      if (open) return open.focus();
      const any = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (any) return any.navigate(target).then((w) => w && w.focus());
      return self.clients.openWindow(target);
    }),
  );
});
