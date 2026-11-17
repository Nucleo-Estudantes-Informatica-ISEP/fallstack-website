import type { Metadata } from "next";

import AuthPageLayout from "@/components/AuthPageLayout";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function StudentSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthPageLayout>{children}</AuthPageLayout>;
}
