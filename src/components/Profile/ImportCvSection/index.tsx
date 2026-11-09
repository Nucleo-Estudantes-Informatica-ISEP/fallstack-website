"use client";

import React, { useState } from "react";

import { ImportCv } from "@/components/ui/Icons";

interface ImportCvSectionProps {
  text: string;
  inputRef: React.Ref<HTMLInputElement>;
  className?: string;
}

const ImportCvSection: React.FC<ImportCvSectionProps> = ({
  inputRef,
  text,
  className = "text-gray-100",
}) => {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <label
        htmlFor="inputCv"
        className="mb-1.5 text-sm font-medium text-gray-100"
      >
        Curriculum Vitae
      </label>
      <div className="flex h-12 w-full min-w-0 items-center rounded-md border border-white/35 bg-background px-3 py-2 text-gray-100 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary hover:border-white/60">
        <ImportCv className="size-5 shrink-0" />
        <button
          type="button"
          onClick={() => document.getElementById("inputCv")?.click()}
          className="min-w-0 flex-1 truncate pl-2 text-left underline hover:text-primary focus:outline-none"
        >
          {text}
          {fileName && (
            <span className="ml-2 text-sm text-gray-400">({fileName})</span>
          )}
        </button>
        <input
          id="inputCv"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          type="file"
          accept=".pdf"
          ref={inputRef}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ImportCvSection;
