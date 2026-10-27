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
  className = "my-4 text-black",
}) => {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className={`flex min-w-0 flex-col space-y-2 ${className}`}>
      <label htmlFor="inputCv">Curriculum Vitae</label>
      <div className="flex min-w-0 items-center space-x-2 hover:cursor-pointer hover:text-primary">
        <ImportCv className="mb-2 size-6"></ImportCv>
        <button
          type="button"
          onClick={() => document.getElementById("inputCv")?.click()}
          className="min-w-0 pl-2 text-left wrap-break-word underline"
        >
          {text}

          <span className="ml-4 text-sm">
            {fileName ? `(${fileName})` : null}
          </span>
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
