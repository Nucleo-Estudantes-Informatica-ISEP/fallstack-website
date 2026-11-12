import AuthPageLayout from "@/components/AuthPageLayout";

export default function StudentSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthPageLayout studentSignup>{children}</AuthPageLayout>;
}
