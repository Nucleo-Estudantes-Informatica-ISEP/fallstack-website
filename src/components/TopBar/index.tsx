"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { LiaUser } from "react-icons/lia";

import useSession from "@/hooks/useSession";
import { LogIn } from "@/components/ui/Icons";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoutButton from "@/components/LogoutButton";
import UserButton from "@/components/Profile/UserButton";
import { resolveAccountDestination } from "@/domain/auth/accountDestination";
import { canAccessAttendanceScanner } from "@/domain/auth/authPolicy";

import { BsQrCodeScan } from "react-icons/bs";

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
    ["/login", "/signup", "/password-reset"].some((p) => pathname.startsWith(p))
  );
  const opacity = useTransform(() => scrollYProgress.get() * 2.2);

  return (
    <nav className="fixed z-40 h-16 w-full">
      {solid ? (
        <div className="absolute top-0 left-0 flex h-16 w-full items-center justify-between bg-background" />
      ) : (
        <motion.div
          className="absolute top-0 left-0 flex h-16 w-full items-center justify-between bg-background"
          style={{
            opacity,
          }}
        />
      )}
      <div className="absolute top-2 right-4 flex h-12 w-full items-center justify-between space-x-4 px-4 py-2">
        {!isAuthPage ? (
          <Link
            href="/"
            className="ui-focus ml-6 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md"
          >
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
        <div className="flex items-center gap-x-2 sm:gap-x-4">
          <LanguageSwitcher />
          {!session.ready ? (
            // Statically generated pages resolve the session in the browser;
            // keep the slot's size without offering sign-in to someone who
            // may already be signed in.
            <span aria-hidden="true" className="min-h-11 min-w-11" />
          ) : !session.user ? (
            <Link
              href={isAuthPage ? "/" : "/login"}
              aria-label={isAuthPage ? "Página inicial" : "Iniciar sessão"}
              className="ui-focus z-20 flex min-h-11 min-w-11 items-center justify-center rounded-md fill-white text-2xl transition-colors hover:text-primary"
            >
              <LogIn />
            </Link>
          ) : (
            <>
              {canAccessAttendanceScanner(session.user) &&
                resolveAccountDestination(session.user).kind !== "staff" && (
                  <Link
                    href="/attendance/scan"
                    aria-label="Scanner de presenças"
                    title="Scanner de presenças"
                    className="ui-focus z-20 flex min-h-11 min-w-11 items-center justify-center rounded-md text-xl text-white transition-colors hover:text-primary"
                  >
                    <BsQrCodeScan aria-hidden="true" />
                  </Link>
                )}
              {session.user.adminRole && session.user.role !== "EMPLOYEE" && (
                <Link
                  href={
                    session.user.student
                      ? `/student/${session.user.student.code}`
                      : "/signup"
                  }
                  aria-label="O meu perfil de estudante"
                  title="O meu perfil de estudante"
                  className="ui-focus z-20 flex min-h-11 min-w-11 items-center justify-center rounded-md text-2xl text-white"
                >
                  <LiaUser aria-hidden="true" />
                </Link>
              )}
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
