import { afterEach, describe, expect, it, vi } from "vitest";

import { branding } from "@/edition/branding";

import {
  downloadOfflinePass,
  getPassFilename,
  loadImage,
  svgToImage,
  truncateText,
} from "./generateOfflinePass";

describe("getPassFilename", () => {
  it("normalizes student names with accents and special characters", () => {
    const filename = getPassFilename("João da Silva Álvares", "F1A23B");
    expect(filename).toBe(
      `passe-${branding.name.toLowerCase()}-${branding.year}-joao-da-silva-alvares.png`
    );
  });

  it("handles uppercase letters and whitespace", () => {
    const filename = getPassFilename("  MARIA   CLARA  ", "CODE99");
    expect(filename).toBe(
      `passe-${branding.name.toLowerCase()}-${branding.year}-maria-clara.png`
    );
  });

  it("falls back to permanent code when student name has no alphanumeric characters", () => {
    const filename = getPassFilename("??? --- !!!", "ABC123");
    expect(filename).toBe(
      `passe-${branding.name.toLowerCase()}-${branding.year}-ABC123.png`
    );
  });

  it("falls back to permanent code when student name is empty", () => {
    const filename = getPassFilename("", "XYZ789");
    expect(filename).toBe(
      `passe-${branding.name.toLowerCase()}-${branding.year}-XYZ789.png`
    );
  });
});

describe("truncateText", () => {
  it("returns original text when it fits within maxWidth", () => {
    const mockCtx = {
      measureText: (text: string) => ({ width: text.length * 10 }),
    };
    expect(truncateText(mockCtx, "Hello", 100)).toBe("Hello");
  });

  it("truncates text and appends ellipsis when exceeding maxWidth", () => {
    const mockCtx = {
      measureText: (text: string) => ({ width: text.length * 10 }),
    };
    // 10 chars = 100px. maxWidth = 60px.
    // "Hello..." is 8 chars = 80px > 60px
    // "Hel..." is 6 chars = 60px <= 60px
    const result = truncateText(mockCtx, "HelloWorld", 60);
    expect(result).toBe("Hel...");
  });

  it("handles empty text gracefully", () => {
    const mockCtx = {
      measureText: (text: string) => ({ width: text.length * 10 }),
    };
    expect(truncateText(mockCtx, "", 50)).toBe("");
  });
});

describe("loadImage and svgToImage", () => {
  const originalImage = globalThis.Image;

  afterEach(() => {
    globalThis.Image = originalImage;
    vi.restoreAllMocks();
  });

  it("loadImage resolves when image loads successfully", async () => {
    class MockSuccessImage {
      crossOrigin = "";
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 10);
      }
    }
    globalThis.Image = MockSuccessImage as unknown as typeof Image;

    const img = await loadImage("/assets/images/landing-2026.png");
    expect(img).toBeInstanceOf(MockSuccessImage);
  });

  it("loadImage rejects when image fails to load", async () => {
    class MockErrorImage {
      crossOrigin = "";
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onerror?.(), 10);
      }
    }
    globalThis.Image = MockErrorImage as unknown as typeof Image;

    await expect(loadImage("/assets/images/missing.png")).rejects.toThrow(
      "Falha ao carregar imagem: /assets/images/missing.png"
    );
  });

  it("svgToImage converts SVG element to image and revokes object URL", async () => {
    const revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    class MockSuccessImage {
      crossOrigin = "";
      src = "";
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 10);
      }
    }
    globalThis.Image = MockSuccessImage as unknown as typeof Image;

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const img = await svgToImage(svgEl, 400, 400);

    expect(img.width).toBe(400);
    expect(img.height).toBe(400);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });

  it("svgToImage rejects when conversion fails", async () => {
    const revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");

    class MockErrorImage {
      crossOrigin = "";
      src = "";
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onerror?.(), 10);
      }
    }
    globalThis.Image = MockErrorImage as unknown as typeof Image;

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    await expect(svgToImage(svgEl, 400, 400)).rejects.toThrow(
      "Falha ao converter SVG do QR Code para imagem."
    );
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });
});

describe("downloadOfflinePass", () => {
  const originalImage = globalThis.Image;
  const originalCreateElement = document.createElement.bind(document);

  afterEach(() => {
    globalThis.Image = originalImage;
    document.createElement = originalCreateElement;
    vi.restoreAllMocks();
  });

  it("throws when canvas context is null", async () => {
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === "canvas") {
          vi.spyOn(el as HTMLCanvasElement, "getContext").mockReturnValue(null);
        }
        return el;
      }
    );

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    await expect(
      downloadOfflinePass({
        studentName: "Test Student",
        permanentCode: "ABCDEF",
        qrSvgElement: svgEl,
      })
    ).rejects.toThrow("Não foi possível inicializar o canvas.");
  });

  it("rejects and does not trigger download when background image fails", async () => {
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === "canvas") {
          const mockCtx = {
            fillStyle: "",
            fillRect: vi.fn(),
          };
          vi.spyOn(el as HTMLCanvasElement, "getContext").mockReturnValue(
            mockCtx as unknown as CanvasRenderingContext2D
          );
        }
        return el;
      }
    );

    class MockErrorImage {
      crossOrigin = "";
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onerror?.(), 10);
      }
    }
    globalThis.Image = MockErrorImage as unknown as typeof Image;

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    await expect(
      downloadOfflinePass({
        studentName: "Test Student",
        permanentCode: "ABCDEF",
        qrSvgElement: svgEl,
      })
    ).rejects.toThrow(
      "Falha ao carregar imagem: /assets/images/landing-2026.png"
    );
  });

  it("successfully renders canvas and triggers file download", async () => {
    class MockSuccessImage {
      crossOrigin = "";
      src = "";
      width = 500;
      height = 500;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        setTimeout(() => this.onload?.(), 10);
      }
    }
    globalThis.Image = MockSuccessImage as unknown as typeof Image;
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-svg-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    let createdLink: HTMLAnchorElement | null = null;
    const clickSpy = vi.fn();

    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === "canvas") {
          const canvas = el as HTMLCanvasElement;
          const mockCtx = {
            fillStyle: "",
            fillRect: vi.fn(),
            strokeStyle: "",
            lineWidth: 0,
            strokeRect: vi.fn(),
            textAlign: "",
            font: "",
            fillText: vi.fn(),
            measureText: vi.fn().mockReturnValue({ width: 50 }),
            beginPath: vi.fn(),
            rect: vi.fn(),
            clip: vi.fn(),
            drawImage: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            createLinearGradient: vi.fn().mockReturnValue({
              addColorStop: vi.fn(),
            }),
            moveTo: vi.fn(),
            arcTo: vi.fn(),
            closePath: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
          };
          vi.spyOn(canvas, "getContext").mockReturnValue(
            mockCtx as unknown as CanvasRenderingContext2D
          );
          vi.spyOn(canvas, "toDataURL").mockReturnValue(
            "data:image/png;base64,mockpng"
          );
        } else if (tagName === "a") {
          createdLink = el as HTMLAnchorElement;
          vi.spyOn(createdLink, "click").mockImplementation(clickSpy);
        }
        return el;
      }
    );

    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    await downloadOfflinePass({
      studentName: "Daniel Silva",
      studentEmail: "daniel@example.com",
      permanentCode: "ABCDEF",
      qrSvgElement: svgEl,
    });

    expect(createdLink).not.toBeNull();
    expect(createdLink?.download).toBe(
      `passe-${branding.name.toLowerCase()}-${branding.year}-daniel-silva.png`
    );
    expect(createdLink?.href).toBe("data:image/png;base64,mockpng");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalledWith(createdLink);
    expect(removeChildSpy).toHaveBeenCalledWith(createdLink);
  });
});
