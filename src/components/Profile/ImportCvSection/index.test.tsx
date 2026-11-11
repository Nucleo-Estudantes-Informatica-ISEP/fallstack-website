import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import ImportCvSection from ".";

test("renders with the provided text", () => {
  const inputRef = createRef<HTMLInputElement>();

  render(<ImportCvSection text="Import CV" inputRef={inputRef} />);

  expect(screen.getByText("Import CV")).toBeInTheDocument();
});

test("shows the selected file name after selecting a file", () => {
  const inputRef = createRef<HTMLInputElement>();

  render(<ImportCvSection text="Import CV" inputRef={inputRef} />);

  const input = screen.getByLabelText("CV");
  const file = new File(["content"], "resume.pdf", {
    type: "application/pdf",
  });

  fireEvent.change(input, { target: { files: [file] } });

  expect(screen.getByText("resume.pdf")).toBeInTheDocument();
});

test("labels the file input", () => {
  const inputRef = createRef<HTMLInputElement>();
  render(
    <ImportCvSection
      text="Importar CV"
      inputRef={inputRef}
      className="text-gray-100"
    />
  );
  expect(screen.getByLabelText("CV")).toBe(inputRef.current);
});
