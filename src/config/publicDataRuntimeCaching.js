// Keep application responses out of Cache Storage. Workbox still precaches
// the static app assets and offline fallback document.
const publicDataRuntimeCaching = [
  {
    urlPattern: ({ url, request, sameOrigin }) =>
      sameOrigin &&
      (url.pathname.startsWith("/api/") ||
        request.mode === "navigate" ||
        request.headers.get("RSC") === "1"),
    handler: "NetworkOnly",
    method: "GET",
    options: {},
  },
];

module.exports = { publicDataRuntimeCaching };
