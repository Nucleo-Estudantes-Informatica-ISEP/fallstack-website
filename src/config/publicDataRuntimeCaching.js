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
  },
];

module.exports = { publicDataRuntimeCaching };
