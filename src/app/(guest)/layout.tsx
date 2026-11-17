import type { Metadata } from "next";

import DocumentLayout from "@/components/DocumentLayout";
import GuestLayout from "@/components/GuestLayout";
import { branding } from "@/edition/branding";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: branding.metadata.title,
    template: "%s | Fallstack 2026",
  },
  description: branding.metadata.description,
  keywords: branding.metadata.keywords,
  authors: [{ name: "NEI-ISEP", url: "https://www.nei-isep.org" }],
  creator: "Núcleo de Estudantes de Informática do ISEP",
  publisher: "NEI-ISEP",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    alternateLocale: ["en_US"],
    url: SITE_URL,
    siteName: branding.metadata.applicationName,
    title: branding.metadata.title,
    description: branding.metadata.description,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: branding.metadata.title,
    description: branding.metadata.description,
    images: [DEFAULT_OG_IMAGE.url],
  },
};
export const revalidate = 60;
// Fail generation if a server component starts reading request-specific data.
export const dynamic = "error";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocumentLayout>
      <GuestLayout>{children}</GuestLayout>
    </DocumentLayout>
  );
}
