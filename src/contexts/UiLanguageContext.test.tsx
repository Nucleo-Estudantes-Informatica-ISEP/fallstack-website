import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import useLanguage from "@/hooks/useLanguage";
import AdminForm from "@/components/AdminForm";
import StatsSection from "@/components/Profile/StatsSection";

import { UiLanguageProvider } from "./UiLanguageContext";

vi.mock("@/hooks/useLanguage", () => ({ default: vi.fn(() => "en") }));

test("the selected language reaches student summaries and form labels without translating submitted keys", () => {
  const submit = vi.fn();
  const tree = () => (
    <UiLanguageProvider>
      <StatsSection
        stats={{ totalScans: 1, totalSaves: 2 }}
        companiesLeft={3}
        historyData={[]}
      />
      <AdminForm
        cancelHref="/students"
        sections={[
          {
            kind: "fields",
            title: "Detalhes",
            fields: [{ kind: "text", name: "name", label: "Nome" }],
          },
        ]}
        onSubmit={submit}
      />
    </UiLanguageProvider>
  );
  const { rerender } = render(tree());
  expect(
    screen.getByRole("heading", { name: "Your profile summary" })
  ).toBeInTheDocument();
  expect(screen.getByText("Saved profiles")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Nome" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  expect(submit).toHaveBeenCalledWith({ name: "Nome" });
  vi.mocked(useLanguage).mockReturnValue("pt");
  rerender(tree());
  expect(
    screen.getByRole("heading", { name: "Sumário do teu perfil" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Nome")).toHaveValue("Nome");
});
