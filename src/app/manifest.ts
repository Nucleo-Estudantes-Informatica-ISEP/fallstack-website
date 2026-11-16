import { MetadataRoute } from "next";

import { branding } from "@/edition/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: branding.metadata.applicationName,
    short_name: branding.metadata.applicationName,
    theme_color: "#141414",
    background_color: "#141414",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    icons: [96, 128, 192, 384, 512].map((size) => ({
      src: `/icons/maskable_icon_x${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    })),
  };
}
