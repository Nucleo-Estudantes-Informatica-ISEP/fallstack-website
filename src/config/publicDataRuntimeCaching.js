// Keep Workbox from masking the server cache's edit/expiry contract.
const publicDataRuntimeCaching = [
  {
    urlPattern: ({ url, sameOrigin }) =>
      sameOrigin &&
      (url.pathname === "/" ||
        /^\/api\/(?:faqs|schedule|sponsors|companies\/roster)\/?$/.test(
          url.pathname
        )),
    handler: "NetworkOnly",
    method: "GET",
    // next-pwa only injects its offline fallback when options exists.
    options: {},
  },
];

module.exports = { publicDataRuntimeCaching };
