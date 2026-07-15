import { AuthContextProvider } from "@/contexts/AuthContext";
import { toSessionDto } from "@/application/dto/sessionDto";
import getServerSession from "@/application/services/sessionService";

const SessionAuthLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const session = await getServerSession();

  return (
    <AuthContextProvider initialUser={session ? toSessionDto(session) : null}>
      {children}
    </AuthContextProvider>
  );
};

export default SessionAuthLayout;
