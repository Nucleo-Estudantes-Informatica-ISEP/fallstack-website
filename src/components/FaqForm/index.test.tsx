import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import type { FaqDto } from "@/application/dto/faqDto";

import FaqForm from ".";

const {
  pushMock,
  refreshMock,
  postMock,
  patchMock,
  toastSuccessMock,
  toastErrorMock,
  MockHttpClientError,
} = vi.hoisted(() => {
  class MockHttpClientError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }

  return {
    pushMock: vi.fn(),
    refreshMock: vi.fn(),
    postMock: vi.fn(),
    patchMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    MockHttpClientError,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("react-toastify", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));
vi.mock("@/lib/http/client", () => ({
  httpClient: {
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
  HttpClientError: MockHttpClientError,
}));

const faq: FaqDto = { id: "f1", question: "Q?", answer: "A.", order: 0 };

beforeEach(() => {
  vi.clearAllMocks();
});

const fillAndSubmit = (
  buttonName: string,
  question: string,
  answer: string
) => {
  fireEvent.change(screen.getByLabelText("Pergunta"), {
    target: { value: question },
  });
  fireEvent.change(screen.getByLabelText("Resposta"), {
    target: { value: answer },
  });
  fireEvent.click(screen.getByRole("button", { name: buttonName }));
};

test("creates a new FAQ entry and navigates back to the list", async () => {
  postMock.mockResolvedValue(undefined);

  render(<FaqForm />);
  fillAndSubmit("Criar", "Novo?", "Sim.");

  await waitFor(() =>
    expect(postMock).toHaveBeenCalledWith("/admin/faqs", {
      question: "Novo?",
      answer: "Sim.",
    })
  );
  expect(toastSuccessMock).toHaveBeenCalledWith("Pergunta criada.");
  expect(pushMock).toHaveBeenCalledWith("/faqs");
  expect(refreshMock).toHaveBeenCalled();
});

test("edits an existing FAQ entry", async () => {
  patchMock.mockResolvedValue(undefined);

  render(<FaqForm faq={faq} />);
  fillAndSubmit("Guardar", "Atualizada?", "A.");

  await waitFor(() =>
    expect(patchMock).toHaveBeenCalledWith("/admin/faqs/f1", {
      question: "Atualizada?",
      answer: "A.",
    })
  );
  expect(toastSuccessMock).toHaveBeenCalledWith("Pergunta atualizada.");
  expect(pushMock).toHaveBeenCalledWith("/faqs");
});

test("surfaces the server's real error message on a duplicate question", async () => {
  postMock.mockRejectedValue(
    new MockHttpClientError("Já existe uma pergunta igual.", 409)
  );

  render(<FaqForm />);
  fillAndSubmit("Criar", "Existing?", "A.");

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith("Já existe uma pergunta igual.")
  );
  expect(pushMock).not.toHaveBeenCalled();
});

test("falls back to a generic message for a non-HTTP error", async () => {
  postMock.mockRejectedValue(new Error("network down"));

  render(<FaqForm />);
  fillAndSubmit("Criar", "Q?", "A.");

  await waitFor(() =>
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Não foi possível guardar a pergunta."
    )
  );
});
