"use client";

import { createContext, useEffect, useState } from "react";

import { BeforeInstallPromptEvent } from "@/types/BeforeInstallPromptEvent";

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

    if (isStandalone) return;

    const userAgent = navigator.userAgent;
    const isAppleMobile =
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isAppleMobile) {
      setInstallInstructions(
        "No iPhone ou iPad, toca em Partilhar e escolhe “Adicionar ao ecrã principal”."
      );
    } else if (/Android/i.test(userAgent)) {
      setInstallInstructions(
        "Abre o menu do browser e escolhe “Instalar aplicação” ou “Adicionar ao ecrã inicial”."
      );
    } else {
      setInstallInstructions(
        "Abre o menu do browser e procura “Instalar aplicação” ou “Instalar site”, se disponível."
      );
    }

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
