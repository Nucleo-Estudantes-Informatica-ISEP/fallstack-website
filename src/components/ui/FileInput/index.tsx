"use client";

import { FaTrashCan as TrashIcon } from "react-icons/fa6";
import {
  MdOutlineOpenInNew as PreviewIcon,
  MdOutlineCloudUpload as UploadIcon,
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
  emptyIcon?: React.ReactNode;
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
  emptyIcon = <UploadIcon />,
  onClear,
  id,
  ...rest
}) => {
  const resolvedId = id || slugifyId(name) || undefined;

  return (
    <div className="flex w-full flex-col">
      {name && (
        <label
          className="field-label text-left text-gray-100"
          htmlFor={resolvedId}
        >
          {name}
        </label>
      )}

      <div
        className={`relative flex field-height min-w-0 items-center gap-1 rounded-full border field-border bg-background pr-3 field-text focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
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
          className="peer sr-only field-focus-target"
        />

        <label
          className={`flex min-w-0 flex-1 items-center self-stretch pl-(--field-icon-padding,3.125rem) ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          } ${file ? "text-white" : "text-gray-400"}`}
          htmlFor={resolvedId}
          aria-hidden="true"
        >
          <span
            className="pointer-events-none absolute left-(--field-icon-inset,1rem) flex items-center text-lg"
            aria-hidden="true"
          >
            {file ? icon : emptyIcon}
          </span>

          <span className="truncate">{file ? file.name : placeholder}</span>
        </label>

        {file && (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                window.open(file.preview, "_blank", "noopener,noreferrer");
              }}
              aria-label={`Pré-visualizar ${file.name}`}
              className="ui-focus grid size-11 shrink-0 place-items-center rounded-md hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PreviewIcon aria-hidden="true" />
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={(event) => {
                const input =
                  event.currentTarget.parentElement?.parentElement?.querySelector(
                    'input[type="file"]'
                  );

                if (input instanceof HTMLInputElement) {
                  input.value = "";
                  input.focus();
                }

                onClear();
              }}
              aria-label={`Remover ${file.name}`}
              className="ui-focus grid size-11 shrink-0 place-items-center rounded-md hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <TrashIcon aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FileInput;
