"use client";

import slugifyId from "@/utils/slugifyId";

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  center?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}

const TextArea: React.FC<TextAreaProps> = ({
  name,
  center,
  placeholder,
  className,
  disabled,
  maxLength,
  inputRef,
  id,
  ...rest
}) => {
  const resolvedId = id || slugifyId(name) || undefined;

  return (
    <div className="flex w-full flex-col">
      {name && (
        <label
          className={`text-slate-700 md:text-lg ${
            center ? "mb-4 text-center" : ""
          }`}
          htmlFor={resolvedId}
        >
          {name}
        </label>
      )}
      <textarea
        name={name}
        disabled={disabled}
        id={resolvedId}
        placeholder={placeholder}
        ref={inputRef}
        maxLength={maxLength}
        className={`rounded-md border border-gray-400 bg-slate-200 px-4 py-1 text-black focus:border-primary focus:ring-0 disabled:text-gray-600 ${className}`}
        {...rest}
      />
    </div>
  );
};

export default TextArea;
