import Image, { getImageProps } from "next/image";

import { AuthContextProvider } from "@/contexts/AuthContext";
import Topbar from "@/components/TopBar";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const { props: mobilePoster } = getImageProps({
  src: "/assets/images/landing-2026.png",
  alt: "Fallstack 2026",
  width: 1512,
  height: 982,
  sizes: "100vw",
});

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <AuthContextProvider>
      <Topbar />
      <main id="main-content">
        <div className="grid min-h-svh grid-rows-[auto_1fr] bg-background pt-16 md:grid-cols-[47.6%_minmax(0,1fr)] md:grid-rows-1 md:pt-0">
          <div className="relative min-h-56 overflow-hidden md:min-h-0">
            <picture>
              <source
                media="(width < 768px)"
                srcSet={mobilePoster.srcSet}
                sizes={mobilePoster.sizes}
              />
              <Image
                src="/assets/optimized/signup-2026.41e0e981ef13.webp"
                fill
                alt="Fallstack 2026"
                sizes="48vw"
                className="object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </picture>
          </div>
          <div className="flex min-w-0 items-center justify-center px-5 py-12 sm:px-10 xl:pr-20">
            {children}
          </div>
        </div>
      </main>
    </AuthContextProvider>
  );
};

export default AuthLayout;
