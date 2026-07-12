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
import { branding } from "@/edition/branding";

export const metadata: Metadata = {
  ...branding.metadata,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-svh">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>
        <AuthContextProvider>
          <InstallableContextProvider>
            <SkeletonTheme baseColor="#eaeaea" highlightColor="#bfbfbf">
              <Topbar />
              <main>{children}</main>
              <ToastContainer position="bottom-right" />
              <InstallPopUp />
            </SkeletonTheme>
          </InstallableContextProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
