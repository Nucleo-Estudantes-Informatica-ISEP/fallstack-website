import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import FileInput from "@/components/ui/FileInput";

const file = {
  name: "curriculo.pdf",
  preview: "blob:http://localhost/curriculo",
};

const defaultProps = {
  name: "Currículo",
  placeholder: "Seleciona um PDF",
  accept: "application/pdf",
  file: null,
  icon: <span>PDF</span>,
  onClear: vi.fn(),
};

test("renders an accessible file input", () => {
  render(<FileInput {...defaultProps} />);

  const input = screen.getByLabelText("Currículo");

  expect(input).toHaveAttribute("type", "file");
  expect(input).toHaveAttribute("accept", "application/pdf");
  expect(input).not.toBeDisabled();
});

test("calls onChange when a file is selected", () => {
  const onChange = vi.fn();
  const selectedFile = new File(["PDF content"], "cv.pdf", {
    type: "application/pdf",
  });

  render(<FileInput {...defaultProps} onChange={onChange} />);

  const input = screen.getByLabelText("Currículo");

  fireEvent.change(input, {
    target: { files: [selectedFile] },
  });

  expect(onChange).toHaveBeenCalledOnce();
});

test("shows the selected file and its actions", () => {
  render(<FileInput {...defaultProps} file={file} />);

  expect(screen.getByText("curriculo.pdf")).toBeInTheDocument();

  expect(
    screen.getByRole("button", { name: "Pré-visualizar curriculo.pdf" })
  ).toBeInTheDocument();

  expect(
    screen.getByRole("button", { name: "Remover curriculo.pdf" })
  ).toBeInTheDocument();
});

test("calls onClear when removing the file", () => {
  const onClear = vi.fn();

  render(<FileInput {...defaultProps} file={file} onClear={onClear} />);

  fireEvent.click(
    screen.getByRole("button", { name: "Remover curriculo.pdf" })
  );

  expect(onClear).toHaveBeenCalledOnce();
});

test("opens the preview in a new tab", () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  try {
    render(<FileInput {...defaultProps} file={file} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Pré-visualizar curriculo.pdf" })
    );

    expect(openSpy).toHaveBeenCalledWith(
      file.preview,
      "_blank",
      "noopener,noreferrer"
    );
  } finally {
    openSpy.mockRestore();
  }
});

test("disables file selection and actions", () => {
  render(<FileInput {...defaultProps} file={file} disabled />);

  expect(screen.getByLabelText("Currículo")).toBeDisabled();

  expect(
    screen.getByRole("button", { name: "Pré-visualizar curriculo.pdf" })
  ).toBeDisabled();

  expect(
    screen.getByRole("button", { name: "Remover curriculo.pdf" })
  ).toBeDisabled();
});
