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
      className={`w-full *:border-y *:border-y-secondary *:px-10 sm:*:px-42`}
    >
      {children}
    </div>
  );
};

export default GenericContainer;
