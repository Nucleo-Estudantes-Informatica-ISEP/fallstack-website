"use client";

import Input, { type InputProps as UiInputProps } from "@/components/ui/Input";

export interface InputProps extends Omit<UiInputProps, "defaultValue"> {
  defaultValue?: string | number | readonly string[] | null;
}

const ProfileInput: React.FC<InputProps> = ({ defaultValue, ...rest }) => {
  return <Input defaultValue={defaultValue ?? undefined} {...rest} />;
};

export default ProfileInput;
