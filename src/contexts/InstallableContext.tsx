"use client";

import { createContext, useEffect, useState } from "react";

import { BeforeInstallPromptEvent } from "@/types/BeforeInstallPromptEvent";
import { getInstallGuidance } from "@/domain/pwa/installGuidance";

export interface InstallableContextData {
  isInstallable: boolean;
  installInstructions: string | null;
  handleConfirm: () => void;
}

interface InstallableContextProviderProps {
  children: React.ReactNode;
}

const InstallableContext = createContext<InstallableContextData>(
  {} as InstallableContextData
);

export function InstallableContextProvider({
  children,
  ...props
}: InstallableContextProviderProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installInstructions, setInstallInstructions] = useState<string | null>(
    null
  );

  useEffect(() => {
    const isStandalone =
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    setInstallInstructions(
      getInstallGuidance({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
        standalone: isStandalone,
      })
    );

    if (isStandalone) return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setPrompt(e);
      setIsInstallable(true);
      setInstallInstructions(null);
    };

    const handleAppInstalled = () => {
      setPrompt(null);
      setIsInstallable(false);
      setInstallInstructions(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleConfirm = () => {
    if (!prompt) return;

    prompt.prompt();
    prompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === "accepted") {
        console.log("The app was added to the home screen");
      } else {
        console.log("The app was not added to the home screen");
      }
    });
  };

  return (
    <InstallableContext.Provider
      value={{ isInstallable, installInstructions, handleConfirm }}
      {...props}
    >
      {children}
    </InstallableContext.Provider>
  );
}

export default InstallableContext;
