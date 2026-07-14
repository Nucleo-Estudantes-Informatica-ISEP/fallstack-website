import type { Metadata } from "next";

import "react-loading-skeleton/dist/skeleton.css";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

import React from "react";
import { SkeletonTheme } from "react-loading-skeleton";
import { ToastContainer } from "react-toastify";

import { AuthContextProvider } from "@/contexts/AuthContext";
import { InstallableContextProvider } from "@/contexts/InstallableContext";
import InstallPopUp from "@/components/InstallPopUp";
import Topbar from "@/components/TopBar";
import { toSessionDto } from "@/application/dto/sessionDto";
import getServerSession from "@/application/services/sessionService";
import { branding } from "@/edition/branding";

export const metadata: Metadata = {
  ...branding.metadata,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html lang="pt" className="h-svh">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only z-50 bg-primary p-3 text-black focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Saltar para o conteúdo principal
        </a>
        <AuthContextProvider
          initialUser={session ? toSessionDto(session) : null}
        >
          <InstallableContextProvider>
            <SkeletonTheme baseColor="#eaeaea" highlightColor="#bfbfbf">
              <Topbar />
              <main id="main-content">{children}</main>
              <ToastContainer position="bottom-right" />
              <InstallPopUp />
            </SkeletonTheme>
          </InstallableContextProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
