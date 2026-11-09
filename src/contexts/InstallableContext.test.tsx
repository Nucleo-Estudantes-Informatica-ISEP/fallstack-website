import { useContext } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { BeforeInstallPromptEvent } from "@/types/BeforeInstallPromptEvent";
import InstallableContext, {
  InstallableContextProvider,
} from "@/contexts/InstallableContext";

const userAgentDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "userAgent"
);
const platformDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "platform"
);
const maxTouchPointsDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "maxTouchPoints"
);
const matchMediaDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "matchMedia"
);

function InstallState() {
  const { isInstallable, installInstructions } = useContext(InstallableContext);
  return <p>{isInstallable ? "Native install prompt" : installInstructions}</p>;
}

function renderProvider() {
  return render(
    <InstallableContextProvider>
      <InstallState />
    </InstallableContextProvider>
  );
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
});

afterEach(() => {
  for (const [target, property, descriptor] of [
    [navigator, "userAgent", userAgentDescriptor],
    [navigator, "platform", platformDescriptor],
    [navigator, "maxTouchPoints", maxTouchPointsDescriptor],
    [window, "matchMedia", matchMediaDescriptor],
  ] as const) {
    if (descriptor) Object.defineProperty(target, property, descriptor);
    else Reflect.deleteProperty(target, property);
  }
});

test("provides iPhone installation instructions when the browser has no native prompt", async () => {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
  });

  renderProvider();

  expect(
    await screen.findByText(
      "No iPhone ou iPad, toca em Partilhar e escolhe “Adicionar ao ecrã principal”."
    )
  ).toBeInTheDocument();
});

test("provides Android installation instructions when the browser has no native prompt", async () => {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Linux; Android 16) Gecko/123 Firefox/123",
  });

  renderProvider();

  expect(
    await screen.findByText(
      "Abre o menu do browser e escolhe “Instalar aplicação” ou “Adicionar ao ecrã inicial”."
    )
  ).toBeInTheDocument();
});

test("prefers the browser prompt when the browser supports it", async () => {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Linux; Android 16) Chrome/123",
  });
  renderProvider();

  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.defineProperties(event, {
    prompt: { value: vi.fn().mockResolvedValue(undefined) },
    userChoice: {
      value: Promise.resolve({ outcome: "accepted", platform: "web" }),
    },
  });

  act(() => window.dispatchEvent(event as BeforeInstallPromptEvent));

  expect(await screen.findByText("Native install prompt")).toBeInTheDocument();
  expect(screen.queryByText(/Abre o menu do browser/)).not.toBeInTheDocument();
});
