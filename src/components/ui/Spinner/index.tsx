"use client";

import { FunctionComponent } from "react";
import { CgSpinner } from "react-icons/cg";

interface SpinnerProps {
  className?: string;
}

const Spinner: FunctionComponent<SpinnerProps> = ({ className }) => {
  return (
    <span role="status" className="inline-flex">
      <CgSpinner
        aria-hidden="true"
        className={`flex flex-1 animate-spin justify-center text-xl ${className ?? ""}`}
      />
      <span className="sr-only">A carregar…</span>
    </span>
  );
};

export default Spinner;
