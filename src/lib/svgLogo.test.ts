// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, test, vi } from "vitest";

import { sanitizeLogoSvg } from "./svgLogo";

vi.mock("server-only", () => ({}));

const fixture = (name: string) =>
  readFileSync(`tests/fixtures/svg/${name}.svg`);

test("preserves static logo geometry and local gradients", () => {
  const clean = sanitizeLogoSvg(fixture("logo")).toString();
  expect(clean).toContain('viewBox="0 0 100 100"');
  expect(clean).toContain('fill="url(#paint)"');
  expect(clean).toContain('<path d="M0 0L100 0L50 100Z"');
  expect(sanitizeLogoSvg(Buffer.from(clean)).toString()).toBe(clean);
});

test("rejects active content before storage", () => {
  expect(() => sanitizeLogoSvg(fixture("malicious"))).toThrow(
    "Invalid SVG logo"
  );
});

test.each([
  '<script>alert(1)</script>',
  '<foreignObject/>',
  '<rect onload="alert(1)"/>',
  '<image href="https://evil.test/a"/>',
  '<rect fill="url(https://evil.test/a)"/>',
])("rejects active SVG constructs", (content) => {
  expect(() =>
    sanitizeLogoSvg(
      Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`)
    )
  ).toThrow("Invalid SVG logo");
});

test.each([
  "<svg>",
  "<html/>",
  '<svg xmlns="http://www.w3.org/2000/svg"><path></svg>',
  '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"/>',
  '<?xml-stylesheet href="https://evil.test/a.css"?><svg xmlns="http://www.w3.org/2000/svg"/>',
  '<svg xmlns="http://www.w3.org/2000/svg"/><svg xmlns="http://www.w3.org/2000/svg"/>',
  '<svg xmlns="http://www.w3.org/2000/svg"><g a="1" a="2"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg">&undefined;</svg>',
  '<svg xmlns="http://www.w3.org/2000/svg">' +
    "<g>".repeat(65) +
    "</g>".repeat(65) +
    "</svg>",
])("rejects malformed, non-SVG or unsafe XML", (source) => {
  expect(() => sanitizeLogoSvg(Buffer.from(source))).toThrow(
    "Invalid SVG logo"
  );
});

test("rejects invalid fixture, invalid UTF-8 and excessive element count", () => {
  expect(() => sanitizeLogoSvg(fixture("invalid"))).toThrow("Invalid SVG logo");
  expect(() => sanitizeLogoSvg(Buffer.from([0xff, 0xfe]))).toThrow(
    "Invalid SVG logo"
  );
  expect(() =>
    sanitizeLogoSvg(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
          "<path/>".repeat(10000) +
          "</svg>"
      )
    )
  ).toThrow("Invalid SVG logo");
});

test("serializes decoded XML text safely", () => {
  const clean = sanitizeLogoSvg(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><title>]]&gt; &amp; &lt;</title></svg>'
    )
  );
  expect(clean.toString()).toContain("]]&gt; &amp; &lt;");
  expect(sanitizeLogoSvg(clean)).toEqual(clean);
});
