import "server-only";

import { HttpError } from "@/types/HttpError";

import { SaxesParser } from "saxes";

const SVG = "http://www.w3.org/2000/svg";
const elements = new Set(
  "svg g defs path rect circle ellipse line polyline polygon linearGradient radialGradient stop clipPath title desc".split(
    " "
  )
);
const attributes = new Set(
  "id viewBox width height x y x1 y1 x2 y2 cx cy r rx ry d points transform fill stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset fill-rule clip-rule opacity fill-opacity stroke-opacity clip-path gradientUnits gradientTransform offset stop-color stop-opacity spreadMethod fx fy fr".split(
    " "
  )
);
const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Rebuild a static SVG subset; never pass source markup or CSS through. */
export function sanitizeLogoSvg(bytes: Uint8Array): Buffer {
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parser = new SaxesParser({ xmlns: true });
    let depth = 0;
    let skipped = 0;
    let nodes = 0;
    const output: string[] = [];
    parser.on("doctype", () => {
      throw new Error("DTD forbidden");
    });
    parser.on("processinginstruction", () => {
      throw new Error("PI forbidden");
    });
    parser.on("opentag", (tag) => {
      if (++nodes > 10000 || ++depth > 64) throw new Error("SVG too complex");
      if (depth === 1 && (tag.local !== "svg" || tag.uri !== SVG))
        throw new Error("Not SVG");
      if (/^(script|foreignObject)$/i.test(tag.local))
        throw new Error("Active SVG element");
      for (const attr of Object.values(tag.attributes)) {
        if (
          /^on/i.test(attr.local) ||
          (attr.local === "href" && !attr.value.startsWith("#")) ||
          (/url\s*\(/i.test(attr.value) &&
            !/^url\(#[a-zA-Z_][\w-]*\)$/.test(attr.value))
        )
          throw new Error("Active SVG attribute");
      }
      if (skipped || tag.uri !== SVG || !elements.has(tag.local)) {
        skipped++;
        return;
      }
      output.push(`<${tag.local}${depth === 1 ? ` xmlns="${SVG}"` : ""}`);
      for (const attr of Object.values(tag.attributes)) {
        if (attr.uri || !attributes.has(attr.local)) continue;
        // Only fragment paint/clip references; no CSS escapes, URLs, entities or schemes.
        if (!/^[a-zA-Z0-9\s.,%#+()_\-]*$/.test(attr.value)) continue;
        if (
          /url/i.test(attr.value) &&
          !/^url\(#[a-zA-Z_][\w-]*\)$/.test(attr.value)
        )
          continue;
        output.push(` ${attr.local}="${escapeXml(attr.value)}"`);
      }
      output.push(">");
    });
    parser.on("closetag", (tag) => {
      if (skipped) skipped--;
      else output.push(`</${tag.local}>`);
      depth--;
    });
    parser.on("text", (text) => {
      if (!skipped) output.push(escapeXml(text));
    });
    parser.on("cdata", (text) => {
      if (!skipped) output.push(escapeXml(text));
    });
    parser.write(source).close();
    if (!nodes) throw new Error("Empty SVG");
    return Buffer.from(output.join(""));
  } catch {
    throw new HttpError("Invalid SVG logo", 400);
  }
}
