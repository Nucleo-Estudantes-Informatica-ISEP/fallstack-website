"use client";

import { Dispatch, SetStateAction } from "react";

import { useUiText } from "@/contexts/UiLanguageContext";
import Modal from "@/components/ui/Modal";
import PrimaryButton from "@/components/ui/PrimaryButton";

interface ConfirmDialogProps {
  isVisible: boolean;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  isConfirming?: boolean;
  alternativeAction?: { label: string; onClick: () => void };
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isVisible,
  setIsVisible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  isConfirming,
  alternativeAction,
}) => {
  const t = useUiText();
  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={(value) => {
        if (isConfirming) return;
        setIsVisible(value);
      }}
      className="flex flex-col items-center gap-6 text-center"
      aria-labelledby="confirm-dialog-title"
    >
      <h2 id="confirm-dialog-title" className="text-2xl font-bold">
        {t(title)}
      </h2>
      <p>{t(message)}</p>
      <div
        className={`flex w-full gap-4 ${alternativeAction ? "flex-col" : ""}`}
      >
        {alternativeAction && (
          <button
            type="button"
            onClick={alternativeAction.onClick}
            disabled={isConfirming}
            className="ui-focus min-h-11 rounded-md border border-ui-action px-4 py-2 font-medium text-ui-action hover:bg-ui-action/10 disabled:opacity-60"
          >
            {t(alternativeAction.label)}
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          disabled={isConfirming}
          className="ui-focus min-h-11 flex-1 rounded-md border border-ui-action px-4 py-2 text-center text-base font-medium text-ui-action transition-colors hover:bg-ui-action/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t(cancelLabel)}
        </button>
        <PrimaryButton
          className="flex-1"
          loading={isConfirming}
          onClick={onConfirm}
        >
          {t(confirmLabel)}
        </PrimaryButton>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
