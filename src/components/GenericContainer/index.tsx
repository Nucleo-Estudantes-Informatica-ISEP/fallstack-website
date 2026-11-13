"use client";

import { FunctionComponent } from "react";

interface GenericContainerProps {
  children: React.ReactNode;
  width?: string;
}

const GenericContainer: FunctionComponent<GenericContainerProps> = ({
  children,
}) => {
  return (
    <div
      className={`w-full *:border-y *:border-y-secondary *:px-4 sm:*:px-8 lg:*:px-16 xl:*:px-24`}
    >
      {children}
    </div>
  );
};

export default GenericContainer;
