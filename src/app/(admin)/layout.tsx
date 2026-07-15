import { AuthContextProvider } from "@/contexts/AuthContext";
import { toSessionDto } from "@/application/dto/sessionDto";
import getServerSession from "@/application/services/sessionService";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <AuthContextProvider initialUser={session ? toSessionDto(session) : null}>
      {children}
    </AuthContextProvider>
  );
}
