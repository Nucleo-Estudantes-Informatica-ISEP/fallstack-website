// @vitest-environment node
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { expect, test, vi } from "vitest";

import Page from "./page";

const state = vi.hoisted(() => ({ ready: false, pending: Promise.resolve() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/components/HomePage", () => ({
  default: ({ sections }: { sections: Record<string, React.ReactNode> }) => (
    <div>Immediate hero{Object.values(sections)}</div>
  ),
}));
vi.mock("@/components/HomepageSection", () => ({
  default: ({ section }: { section: string }) => {
    if (section === "faqs" && !state.ready) throw state.pending;
    return <div>{`${section} content`}</div>;
  },
}));

test("homepage shell and ready sections stream while another dataset is pending", async () => {
  let release!: () => void;
  state.ready = false;
  state.pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const page = await Page({ searchParams: Promise.resolve({ lang: "EN" }) });
  const output = new PassThrough();
  let html = "";
  output.on("data", (chunk) => {
    html += chunk.toString();
  });
  const shell = new Promise<void>((resolve, reject) => {
    const stream = renderToPipeableStream(page, {
      onShellReady() {
        stream.pipe(output);
        resolve();
      },
      onShellError: reject,
      onError: reject,
    });
  });
  try {
    await shell;
    expect(html).toContain("Immediate hero");
    expect(html).toContain("schedule content");
    expect(html).toContain("companies content");
    expect(html).not.toContain("faqs content");
  } finally {
    state.ready = true;
    release();
  }
  await new Promise<void>((resolve, reject) => {
    output.on("end", resolve);
    output.on("error", reject);
  });
  expect(html).toContain("faqs content");
});
