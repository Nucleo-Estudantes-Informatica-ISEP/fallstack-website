"use client";

import React from "react";

import { useUiText } from "@/contexts/UiLanguageContext";

interface HeadingTextProps {
  text: string;
  className?: string;
}

const HeadingText: React.FC<HeadingTextProps> = ({ text, className }) => {
  const t = useUiText();
  return (
    <h1
      className={`${
        className ? className : ""
      } my-12 text-center text-3xl md:text-4xl lg:text-6xl`}
    >
      {t(text)}
    </h1>
  );
};

export default HeadingText;
