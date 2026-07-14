"use client";

import { useState } from "react";

import { httpClient } from "@/lib/http/client";
import Spinner from "@/components/Spinner";
import { branding } from "@/edition/branding";
import { DownloadIcon } from "@/styles/Icons";

import download from "downloadjs";

interface DownloadButtonProps {
  className?: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ className }) => {
  const handleDownload = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await httpClient.raw("/export");
      const data = await res.blob();
      download(data, branding.exportFilename, "text/csv");
    } finally {
      setIsLoading(false);
    }
  };

  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <button
      type="button"
      className={`cursor-pointer transition-colors hover:text-primary ${
        isLoading && "text-primary"
      } ${className}`}
      onClick={handleDownload}
      disabled={isLoading}
      title="Exportar para CSV"
      aria-label="Exportar para CSV"
    >
      {isLoading ? <Spinner /> : <DownloadIcon />}
    </button>
  );
};

export default DownloadButton;
