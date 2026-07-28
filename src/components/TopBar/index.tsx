"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";

import useSession from "@/hooks/useSession";
import { LogIn } from "@/components/ui/Icons";
import LogoutButton from "@/components/LogoutButton";
import UserButton from "@/components/Profile/UserButton";

interface TopBarProps {
  // The admin backoffice is the only place TopBar sits on a light page
  // background from the top instead of a dark hero - its white logo/icons
  // and scroll-fading dark background were invisible there, not just low-
  // contrast. Everywhere else keeps the existing dark styling unchanged.
  light?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ light = false }) => {
  const { scrollYProgress } = useScroll();
  const session = useSession();
  const pathname = usePathname();
  // Hide certain TopBar elements on auth pages (those inside the (auth) group)
  const isAuthPage = Boolean(
    pathname &&
      ["/login", "/signup", "/password-reset"].some((p) =>
        pathname.startsWith(p)
      )
  );
  const opacity = useTransform(() => scrollYProgress.get() * 2.2);

  return (
    <nav className={`fixed z-40 h-16 w-full overflow-hidden`}>
      {light ? (
        <div className="absolute top-0 left-0 flex h-16 w-screen items-center justify-between border-b border-gray-200 bg-white" />
      ) : (
        <motion.div
          className={`absolute top-0 left-0 flex h-16 w-screen items-center justify-between bg-background`}
          style={{
            opacity,
          }}
        />
      )}
      <div className="absolute top-2 right-4 flex h-12 w-full items-center justify-between space-x-4 px-4 py-2">
        {!isAuthPage ? (
          <Link href="/" className="ml-6">
            <Image
              src={
                light
                  ? "/assets/images/logo_dark.png"
                  : "/assets/images/logo_white.svg"
              }
              alt="Fallstack"
              width={32}
              height={32}
            />
          </Link>
        ) : (
          <div className="ml-6" />
        )}
        <div className="flex items-center gap-x-4">
          {!session.user ? (
            <Link
              href={isAuthPage ? "/" : "/login"}
              aria-label={isAuthPage ? "Página inicial" : "Iniciar sessão"}
              className={`z-20 flex size-full items-center justify-center text-2xl transition-colors hover:text-primary ${light ? "fill-gray-700" : "fill-white"}`}
            >
              <LogIn />
            </Link>
          ) : (
            <>
              <UserButton user={session.user} light={light} />
              <LogoutButton light={light} />
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopBar;
