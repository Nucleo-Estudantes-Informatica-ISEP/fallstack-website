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
  // The scroll-linked fade (transparent at the top, solidifying as you
  // scroll) only makes sense over a hero image at the top of the page.
  // The admin backoffice has no hero - it's a plain page from the very
  // first pixel - so a fading-from-transparent bar there is invisible at
  // the top instead of just low-contrast. `solid` skips the fade for an
  // always-opaque background; the logo/icons stay the same dark-background
  // white as everywhere else, since the background itself stays dark.
  solid?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ solid = false }) => {
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
      {solid ? (
        <div className="absolute top-0 left-0 flex h-16 w-screen items-center justify-between bg-background" />
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
              src={"/assets/images/logo_white.svg"}
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
              className="z-20 flex size-full items-center justify-center fill-white text-2xl transition-colors hover:text-primary"
            >
              <LogIn />
            </Link>
          ) : (
            <>
              <UserButton user={session.user} />
              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TopBar;
