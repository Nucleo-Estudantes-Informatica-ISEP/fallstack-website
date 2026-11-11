import Image from "next/image";

import { AuthContextProvider } from "@/contexts/AuthContext";
import Topbar from "@/components/TopBar";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <AuthContextProvider>
      <Topbar />
      <main id="main-content">
        <div className="flex h-svh flex-col bg-background pt-16 md:flex-row md:pt-0">
          <div className="artwork-clean relative aspect-24/5 w-full shrink-0 md:aspect-auto md:size-full md:w-1/2">
            <Image
              src="/favicon.ico"
              width={128}
              height={128}
              alt="Fallstack 2026"
              className="absolute inset-0 m-auto h-3/4 w-auto max-w-32 object-contain md:h-48 md:max-w-48"
            />
          </div>
          <div className="flex size-full items-center justify-center overflow-y-auto px-6 py-8 md:w-1/2 md:px-12 md:py-16">
            {children}
          </div>
        </div>
      </main>
    </AuthContextProvider>
  );
};

export default AuthLayout;
