import React from "react";

interface HeadingTextProps {
  text: string;
  className?: string;
}

const HeadingText: React.FC<HeadingTextProps> = ({ text, className }) => {
  return (
    <h1
      className={`${
        className ? className : ""
      } my-12 text-center text-3xl md:text-4xl lg:text-6xl`}
    >
      {text}
    </h1>
  );
};

export default HeadingText;
