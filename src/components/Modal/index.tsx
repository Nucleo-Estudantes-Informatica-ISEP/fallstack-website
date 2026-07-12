"use client";

import React, { Dispatch, SetStateAction } from "react";

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isVisible: boolean;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isVisible,
  setIsVisible,
  children,
  className,
  ...rest
}) => {
  if (!isVisible) return null;

  return (
    <section className="fixed top-0 left-0 z-50 size-full bg-black/60">
      <div
        className="fixed size-full"
        onClick={() => setIsVisible(false)}
      ></div>
      <main
        className={
          "fixed top-1/2 left-1/2 z-60 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-8 text-black md:w-3/4 " +
          className
        }
        {...rest}
      >
        {children}
      </main>
    </section>
  );
};

export default Modal;
