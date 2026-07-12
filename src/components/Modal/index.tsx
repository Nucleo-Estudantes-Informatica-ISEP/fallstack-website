"use client";

import React, { Dispatch, SetStateAction, useEffect, useRef } from "react";

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
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    previouslyFocusedElement.current =
      document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsVisible(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement.current?.focus();
    };
  }, [isVisible, setIsVisible]);

  if (!isVisible) return null;

  return (
    <section className="fixed top-0 left-0 z-50 size-full bg-black/60">
      <div
        className="fixed size-full"
        onClick={() => setIsVisible(false)}
      ></div>
      <main
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        ref={dialogRef}
        className={
          "fixed top-1/2 left-1/2 z-60 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-8 text-black outline-none md:w-3/4 " +
          (className ?? "")
        }
        {...rest}
      >
        {children}
      </main>
    </section>
  );
};

export default Modal;
