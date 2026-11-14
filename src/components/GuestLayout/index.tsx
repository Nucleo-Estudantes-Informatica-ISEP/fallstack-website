import { AuthContextProvider } from "@/contexts/AuthContext";
import Topbar from "@/components/TopBar";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthContextProvider>
      <Topbar />
      <main id="main-content">{children}</main>
    </AuthContextProvider>
  );
}
