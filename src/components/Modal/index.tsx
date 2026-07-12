"use client";

import React, { Dispatch, SetStateAction, useEffect, useRef } from "react";

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isVisible: boolean;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
      if (e.key === "Escape") {
        setIsVisible(false);
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
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
