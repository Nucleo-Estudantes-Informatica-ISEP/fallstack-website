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
          <div className="w-full md:hidden">
            <Image
              src={"/assets/images/hero_privacy_policy.png"}
              width={1920}
              height={400}
              alt="Auth Header"
              className="h-auto w-full"
            />
          </div>
          <div className="relative hidden size-full md:block md:w-1/2">
            <Image
              src={"/assets/images/auth-component.png"}
              fill
              alt="Auth Header"
              className="object-cover"
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
