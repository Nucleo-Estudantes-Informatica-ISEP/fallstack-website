// Retire the previous worker's runtime caches, including extension matches
// that could have recorded a protected response. Keep the precache separate.
const oldRuntimeCaches = [
  "google-fonts-webfonts",
  "google-fonts-stylesheets",
  "static-font-assets",
  "static-image-assets",
  "next-static-js-assets",
  "next-image",
  "static-audio-assets",
  "static-video-assets",
  "static-js-assets",
  "static-style-assets",
  "next-data",
  "static-data-assets",
  "apis",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "cross-origin",
];

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(oldRuntimeCaches.map((name) => caches.delete(name)))
  );
});
