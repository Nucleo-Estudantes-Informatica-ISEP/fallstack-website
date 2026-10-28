"use client";

import React from "react";
import Image from "next/image";
import { toast } from "react-toastify";

import { HttpClientError } from "@/lib/http/client";
import {
  getGoogleWalletAvailability,
  getGoogleWalletSaveUrl,
} from "@/client/api/wallet";

const WALLET_ERROR = "Não foi possível adicionar o passe à Carteira da Google.";

function isIOSDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

const GoogleWalletButton = () => {
  const [isAvailable, setIsAvailable] = React.useState(false);
  const [isSupportedDevice, setIsSupportedDevice] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    setIsSupportedDevice(!isIOSDevice());
    let mounted = true;
    getGoogleWalletAvailability()
      .then(({ enabled }) => {
        if (mounted) setIsAvailable(enabled);
      })
      .catch(() => {
        if (mounted) setIsAvailable(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const { url } = await getGoogleWalletSaveUrl();
      window.open(url, "_self");
    } catch (error) {
      toast.error(
        error instanceof HttpClientError && error.status >= 500
          ? WALLET_ERROR
          : error instanceof Error
            ? error.message
            : WALLET_ERROR
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAvailable || !isSupportedDevice) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label="Adicionar à Carteira da Google"
      aria-busy={isLoading}
      className="mt-4 p-2 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Image
        src="/google-wallet/add-to-google-wallet-pt.svg"
        alt=""
        width={240}
        height={55}
        unoptimized
      />
      {isLoading && <span className="sr-only">A preparar passe...</span>}
    </button>
  );
};

export default GoogleWalletButton;
