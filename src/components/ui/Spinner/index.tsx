"use client";

import { FunctionComponent } from "react";
import { CgSpinner } from "react-icons/cg";

import UiText from "@/components/ui/UiText";

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
      <span className="sr-only">
        {" "}
        <UiText text="A carregar…" />{" "}
      </span>
    </span>
  );
};

export default Spinner;
