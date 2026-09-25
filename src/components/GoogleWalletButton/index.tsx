"use client";

import React from "react";
import { toast } from "react-toastify";

import { getGoogleWalletSaveUrl } from "@/client/api/wallet";

const GoogleWalletButton = () => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const { url } = await getGoogleWalletSaveUrl();
      window.open(url, "_self");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar o passe ao Google Wallet."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="mt-4 rounded-xl bg-black px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? "A preparar passe..." : "Adicionar ao Google Wallet"}
    </button>
  );
};

export default GoogleWalletButton;
