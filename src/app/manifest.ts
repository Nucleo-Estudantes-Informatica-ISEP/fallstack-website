import { MetadataRoute } from "next";

import { branding } from "@/edition/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: branding.metadata.applicationName,
    short_name: branding.metadata.applicationName,
    theme_color: "#FFFFFF",
    background_color: "#FFFFFF",
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
