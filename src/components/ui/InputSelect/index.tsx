"use client";

import slugifyId from "@/utils/slugifyId";

interface InputSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  center?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLSelectElement>;
  options: string[];
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
  ...rest
}) => {
  const resolvedId = id || slugifyId(name) || undefined;

  return (
    <div className="flex w-full flex-col">
      {name && (
        <label
          className={`mb-1.5 block text-sm font-medium text-gray-100 ${
            center ? "text-left" : ""
          }`}
          htmlFor={resolvedId}
        >
          {name}
        </label>
      )}
      <select
        name={name}
        id={resolvedId}
        disabled={disabled}
        defaultValue={placeholder}
        ref={inputRef}
        className={`h-12 w-full rounded-full border border-white/35 bg-background px-4 py-2 text-sm text-white placeholder:text-gray-400 focus:border-primary focus:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/3 disabled:text-gray-400 disabled:opacity-100 ${className}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default InputSelect;
