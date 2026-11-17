import UiText from "@/components/ui/UiText";

import "react-loading-skeleton/dist/skeleton.css";
import "react-toastify/dist/ReactToastify.css";
import "@/app/globals.css";

import React from "react";
import { SkeletonTheme } from "react-loading-skeleton";
import { ToastContainer } from "react-toastify";

import { InstallableContextProvider } from "@/contexts/InstallableContext";
import { UiLanguageProvider } from "@/contexts/UiLanguageContext";
import InstallPopUp from "@/components/InstallPopUp";

import LanguageSync from "./LanguageSync";

export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className="h-svh">
      <body>
        <UiLanguageProvider>
          <LanguageSync />
          <a
            href="#main-content"
            className="sr-only z-50 bg-primary p-3 text-black focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            <UiText text="Saltar para o conteúdo principal" />
          </a>
          <InstallableContextProvider>
            <SkeletonTheme baseColor="#eaeaea" highlightColor="#bfbfbf">
              {children}
              <ToastContainer
                position="bottom-right"
                theme="dark"
                autoClose={5000}
                newestOnTop
                closeOnClick
                pauseOnHover
                pauseOnFocusLoss
                draggable
                limit={4}
                className="fallstack-toasts"
              />
              <InstallPopUp />
            </SkeletonTheme>
          </InstallableContextProvider>
        </UiLanguageProvider>
      </body>
    </html>
  );
}
