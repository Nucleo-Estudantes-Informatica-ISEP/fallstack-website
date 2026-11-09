"use client";

import React, { useId, useState } from "react";

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
  const id = useId();
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <label htmlFor={id} className="mb-1.5 text-sm font-medium text-gray-100">
        CV
      </label>
      <div className="relative">
        <input
          id={id}
          onChange={(event) =>
            setFileName(event.target.files?.[0]?.name ?? null)
          }
          type="file"
          accept="application/pdf,.pdf"
          ref={inputRef}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          aria-hidden="true"
          className="flex h-12 min-w-0 cursor-pointer items-center gap-2 rounded-full border border-white/35 bg-background px-4 text-sm text-gray-400 peer-focus-visible:border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary hover:border-white/60"
        >
          <ImportCv className="size-5 shrink-0" />
          <span className="truncate">{fileName ?? text}</span>
        </label>
      </div>
    </div>
  );
};

export default ImportCvSection;
