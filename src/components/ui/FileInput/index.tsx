"use client";

import { FaTrashCan as TrashIcon } from "react-icons/fa6";
import {
  MdOutlineOpenInNew as PreviewIcon,
  MdFileUpload as UploadIcon,
} from "react-icons/md";

import slugifyId from "@/utils/slugifyId";

interface FileInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  name: string;
  accept: string;
  placeholder: string;
  file: {
    name: string;
    preview: string;
  } | null;
  icon: React.ReactNode;
  onClear: () => void;
}

const FileInput: React.FC<FileInputProps> = ({
  name,
  placeholder,
  accept,
  className,
  disabled = false,
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
          className="mb-1 text-left text-sm font-normal text-white"
          htmlFor={resolvedId}
        >
          {name}
        </label>
      )}

      <div
        className={`relative flex h-14 w-full min-w-0 items-center border border-ui-border bg-ui-surface text-sm focus-within:border-ui-focus focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ui-focus ${
          disabled ? "opacity-60" : ""
        } ${className ?? ""}`}
      >
        <input
          {...rest}
          type="file"
          name={name}
          id={resolvedId}
          accept={accept}
          disabled={disabled}
          aria-label={name}
          className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />

        <div
          aria-hidden="true"
          className={`pointer-events-none flex min-w-0 flex-1 items-center gap-2 px-3 ${
            file ? "text-white" : "text-ui-muted"
          }`}
        >
          <span className="shrink-0 text-lg md:text-xl">
            {file ? icon : <UploadIcon />}
          </span>

          <span className="min-w-0 truncate">
            {file ? file.name : placeholder}
          </span>
        </div>

        {file && (
          <div className="relative z-10 flex shrink-0 items-center gap-1 pr-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                window.open(file.preview, "_blank", "noopener,noreferrer");
              }}
              aria-label={`Pré-visualizar ${file.name}`}
              className="ui-focus flex min-h-10 min-w-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PreviewIcon aria-hidden="true" />
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              aria-label={`Remover ${file.name}`}
              className="ui-focus flex min-h-10 min-w-10 items-center justify-center rounded-md text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <TrashIcon aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileInput;
