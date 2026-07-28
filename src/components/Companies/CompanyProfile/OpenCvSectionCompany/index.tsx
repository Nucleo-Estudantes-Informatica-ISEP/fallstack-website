"use client";

import React from "react";

import { httpClient } from "@/lib/http/client";
import { OpenCv } from "@/components/ui/Icons";

interface OpenCvProps {
  code?: string;
  className?: string;
}

const OpenCvSectionCompany: React.FC<OpenCvProps> = ({ code, className }) => {
  const handleCv = async (code: string) => {
    const { url } = await httpClient.get<{ url: string }>(
      `/students/${code}/cv`
    );
    window.open(url, "_blank");
  };
  return (
    <div className={`flex flex-col items-center text-black ${className}`}>
      {code && (
        <a
          onClick={() => handleCv(code)}
          className="cursor-pointer pl-2 underline"
        >
          <OpenCv className="mb-1 size-5 text-primary"></OpenCv>
        </a>
      )}
    </div>
  );
};

export default OpenCvSectionCompany;
