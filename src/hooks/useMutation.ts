"use client";

import { useState } from "react";
import { toast } from "react-toastify";

const DEFAULT_ERROR_MESSAGE = "Ocorreu um erro. Tenta novamente.";

export function useMutation(fallbackErrorMessage = DEFAULT_ERROR_MESSAGE) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    setIsPending(true);
    try {
      return await fn();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : fallbackErrorMessage
      );
      return undefined;
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}
