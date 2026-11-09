"use client";

import { FaTrashCan as TrashIcon } from "react-icons/fa6";
import {
  MdOutlineOpenInNew as PreviewIcon,
  MdOutlineCloudUpload as UploadIcon,
} from "react-icons/md";

import slugifyId from "@/utils/slugifyId";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  accept: string;
  placeholder: string;
  className?: string;
  disabled?: boolean;
  type?: string;
  file: {
    name: string;
    preview: string;
  } | null;
  icon: React.ReactNode;
  onClear: () => void;
}

const FileInput: React.FC<InputProps> = ({
  name,
  placeholder,
  accept,
  className,
  disabled,
  file,
  icon,
  onClear,
  id,
  ...rest
}) => {
  const resolvedId = id || slugifyId(name) || undefined;

  return (
    <div className="flex w-full flex-col">
      {name && (
        <label
          className="field-label text-left font-medium text-gray-100"
          htmlFor={resolvedId}
        >
          {name}
        </label>
      )}
      <div
        className={`relative flex field-height min-w-0 items-center gap-1 rounded-full border field-border bg-background pr-3 field-text focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${className ?? ""}`}
      >
        <input
          type="file"
          name={name}
          disabled={disabled}
          id={resolvedId}
          accept={accept}
          className="peer sr-only field-focus-target"
          {...rest}
        />
        <label
          className={`flex min-w-0 flex-1 cursor-pointer items-center gap-4 self-stretch pl-4 peer-disabled:cursor-not-allowed ${file ? "text-white" : "text-gray-400"}`}
          htmlFor={resolvedId}
          aria-hidden="true"
        >
          <span className="shrink-0 text-lg" aria-hidden="true">
            {file ? icon : <UploadIcon />}
          </span>
          <span className="truncate">{file ? file.name : placeholder}</span>
        </label>
        {file && (
          <>
            <button
              type="button"
              onClick={() => window.open(file.preview, "_blank", "noopener")}
              aria-label={`Pré-visualizar ${file.name}`}
              className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <PreviewIcon />
            </button>
            <button
              type="button"
              onClick={(event) => {
                const input =
                  event.currentTarget.parentElement?.querySelector("input");
                if (input) input.value = "";
                onClear();
                input?.focus();
              }}
              aria-label={`Remover ${file.name}`}
              className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-red-500 hover:text-white focus-visible:outline-2 focus-visible:outline-primary"
            >
              <TrashIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FileInput;
