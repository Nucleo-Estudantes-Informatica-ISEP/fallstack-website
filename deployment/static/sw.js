// Replace old event workers without retaining authenticated/offline responses.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.clients.claim();
      for (const client of await self.clients.matchAll({ type: "window" }))
        await client.navigate("/");
    })()
  );
});
