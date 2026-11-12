import Image, { getImageProps } from "next/image";

import { AuthContextProvider } from "@/contexts/AuthContext";
import Topbar from "@/components/TopBar";

interface AuthPageLayoutProps {
  children: React.ReactNode;
  studentSignup?: boolean;
}

const { props: mobilePoster } = getImageProps({
  src: "/assets/images/landing-2026.png",
  alt: "Fallstack 2026",
  width: 1512,
  height: 982,
  sizes: "100vw",
});

const AuthPageLayout: React.FC<AuthPageLayoutProps> = ({
  children,
  studentSignup = false,
}) => {
  return (
    <AuthContextProvider>
      {!studentSignup && <Topbar />}
      <main id="main-content">
        <div
          className={
            studentSignup
              ? "grid min-h-svh grid-rows-[auto_1fr] bg-background lg:grid-cols-[44%_minmax(0,1fr)] lg:grid-rows-1 xl:grid-cols-[47.6%_minmax(0,1fr)]"
              : "grid min-h-svh grid-rows-[auto_1fr] bg-background pt-16 md:grid-cols-[44%_minmax(0,1fr)] md:grid-rows-1 md:pt-0 xl:grid-cols-[47.6%_minmax(0,1fr)]"
          }
        >
          <div
            className={
              studentSignup
                ? "relative aspect-[2.65] overflow-hidden bg-background lg:aspect-auto [@media(max-width:1023px)_and_(max-height:440px)]:hidden"
                : "relative h-[clamp(8rem,30svh,14rem)] overflow-hidden sm:max-md:h-64 md:h-auto [@media(max-width:767px)_and_(max-height:440px)]:hidden"
            }
          >
            <picture>
              <source
                media={studentSignup ? "(width < 1024px)" : "(width < 768px)"}
                srcSet={mobilePoster.srcSet}
                sizes={mobilePoster.sizes}
              />
              <Image
                src="/assets/optimized/signup-2026.41e0e981ef13.webp"
                fill
                alt="Fallstack 2026"
                sizes="(min-width: 1280px) 48vw, 44vw"
                className={
                  studentSignup
                    ? "object-cover object-[center_30%] lg:object-center"
                    : "object-cover"
                }
                loading="eager"
                fetchPriority="high"
              />
            </picture>
          </div>
          <div
            className={
              studentSignup
                ? "flex min-w-0 items-start justify-center px-5 pt-5 pb-10 sm:px-8 sm:pt-8 lg:items-center lg:py-20 xl:pr-[70px]"
                : "flex min-w-0 items-center justify-center px-4 pt-6 pb-10 sm:px-8 md:py-20 xl:pr-[70px]"
            }
          >
            {children}
          </div>
        </div>
      </main>
    </AuthContextProvider>
  );
};

export default AuthPageLayout;
