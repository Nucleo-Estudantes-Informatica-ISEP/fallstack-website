"use client";

import React, { useState } from "react";

import { ImportCv } from "@/components/ui/Icons";

interface ImportCvSectionProps {
  text: string;
  inputRef: React.Ref<HTMLInputElement>;
}

const ImportCvSection: React.FC<ImportCvSectionProps> = ({
  inputRef,
  text,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="my-4 flex flex-col space-y-2 text-black">
      <label className="text-lg text-slate-700">Curriculum Vitae</label>
      <div className="flex items-center space-x-2 hover:cursor-pointer hover:text-primary">
        <ImportCv className="mb-2 size-6"></ImportCv>
        <button
          type="button"
          onClick={() => document.getElementById("inputCv")?.click()}
          className="pl-2 underline"
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
