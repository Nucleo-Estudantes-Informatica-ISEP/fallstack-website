// Keep Workbox from masking the server cache's edit/expiry contract.
const publicDataRuntimeCaching = [
  {
    urlPattern: ({ url, sameOrigin }) =>
      sameOrigin &&
      /^\/api\/(?:faqs|schedule|sponsors|companies\/roster)\/?$/.test(
        url.pathname
      ),
    handler: "NetworkOnly",
    method: "GET",
  },
];

module.exports = { publicDataRuntimeCaching };
