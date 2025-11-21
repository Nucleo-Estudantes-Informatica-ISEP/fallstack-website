"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  center?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  type?: string;
}

const Input: React.FC<InputProps> = ({
  name,
  center,
  placeholder,
  className,
  disabled,
  inputRef,
  type = "text",
  ...rest
}) => {
  return (
    <div className="w-full flex flex-col">
      <label
        className={`text-sm font-normal text-white mb-1 ${
          center ? "text-left" : ""
        }`}
        htmlFor={name}
      >
        {name}
      </label>
      <input
        type={type}
        name={name}
        disabled={disabled}
        id={name}
        placeholder={placeholder}
        ref={inputRef}
        className={`border border-white/35 bg-[#141414] px-2 py-1 text-sm
         text-white h-14 placeholder:text-white/35 focus:border-primary focus:ring-0 disabled:text-gray-600 w-full ${className}`}
        {...rest}
      />
    </div>
  );
};

export default Input;
