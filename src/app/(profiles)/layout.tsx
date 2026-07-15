import SessionAuthLayout from "@/components/SessionAuthLayout";

export const dynamic = "force-dynamic";

export default function ProfilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionAuthLayout>{children}</SessionAuthLayout>;
}
