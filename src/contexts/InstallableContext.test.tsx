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
const standaloneDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "standalone"
);
const matchMediaDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "matchMedia"
);

function InstallState() {
  const { isInstallable, installInstructions } = useContext(InstallableContext);
  return (
    <p>
      {isInstallable
        ? "Native install prompt"
        : (installInstructions ?? "No install guidance")}
    </p>
  );
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
    [navigator, "standalone", standaloneDescriptor],
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

test("does not show generic installation instructions without a native prompt", async () => {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Linux; Android 16) Gecko/123 Firefox/123",
  });

  renderProvider();

  expect(await screen.findByText("No install guidance")).toBeInTheDocument();
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
  expect(screen.queryByText("No install guidance")).not.toBeInTheDocument();

  act(() => window.dispatchEvent(new Event("appinstalled")));

  expect(await screen.findByText("No install guidance")).toBeInTheDocument();
  expect(screen.queryByText("Native install prompt")).not.toBeInTheDocument();
});

test.each([
  {
    name: "display-mode standalone",
    makeStandalone: () =>
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn().mockReturnValue({ matches: true }),
      }),
  },
  {
    name: "iOS navigator.standalone",
    makeStandalone: () =>
      Object.defineProperty(navigator, "standalone", {
        configurable: true,
        value: true,
      }),
  },
])(
  "does not show install guidance or listen for prompts in $name",
  async ({ makeStandalone }) => {
    makeStandalone();
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    });

    renderProvider();

    expect(await screen.findByText("No install guidance")).toBeInTheDocument();

    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: vi.fn().mockResolvedValue(undefined) },
      userChoice: {
        value: Promise.resolve({ outcome: "accepted", platform: "web" }),
      },
    });

    act(() => window.dispatchEvent(event as BeforeInstallPromptEvent));

    expect(screen.getByText("No install guidance")).toBeInTheDocument();
    expect(screen.queryByText("Native install prompt")).not.toBeInTheDocument();
  }
);
