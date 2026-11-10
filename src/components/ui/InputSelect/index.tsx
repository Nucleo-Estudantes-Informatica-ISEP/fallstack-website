"use client";

import slugifyId from "@/utils/slugifyId";

export type SelectOption = string | { value: string; label: string };

interface InputSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  center?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLSelectElement>;
  options: SelectOption[];
}

const InputSelect: React.FC<InputSelectProps> = ({
  name,
  center,
  placeholder,
  className,
  disabled,
  inputRef,
  options,
  id,
  defaultValue,
  ...rest
}) => {
  const resolvedId = id || slugifyId(name) || undefined;

  return (
    <div className="flex w-full flex-col">
      {name && (
        <label
          className={`field-label block text-gray-100 ${
            center ? "text-left" : ""
          }`}
          htmlFor={resolvedId}
        >
          {name}
        </label>
      )}
      <div className="relative flex w-full items-center">
        <select
          name={name}
          id={resolvedId}
          disabled={disabled}
          defaultValue={defaultValue ?? (placeholder ? "" : undefined)}
          ref={inputRef}
          className={`field-height w-full field-focus-target appearance-none rounded-full border field-border bg-background px-4 py-2 pr-10 field-text text-white focus:border-primary focus:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/3 disabled:text-gray-400 disabled:opacity-100 has-[option[value=""]:checked]:text-gray-400 ${className}`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled className="bg-background text-gray-400">
              {placeholder}
            </option>
          )}
          {options.map((option) => {
            const val = typeof option === "string" ? option : option.value;
            const lbl = typeof option === "string" ? option : option.label;
            return (
              <option
                key={val}
                value={val}
                className="bg-neutral-900 text-white"
              >
                {lbl}
              </option>
            );
          })}
        </select>
        <span className="pointer-events-none absolute right-4 flex items-center text-gray-400">
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </div>
    </div>
  );
};

export default InputSelect;
