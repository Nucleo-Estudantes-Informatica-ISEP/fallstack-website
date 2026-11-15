/** Valid one-page PDF; optional padding is a PDF comment before the xref. */
export function syntheticPdf(size?: number) {
  let prefix = "%PDF-1.7\n";
  const offsets = [0];
  const stream = "BT /F1 12 Tf 40 800 Td (Synthetic Fallstack CV) Tj ET\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
  ];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(prefix));
    prefix += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const tail = (xref: number) =>
    `xref\n0 6\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join(
        ""
      )}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const base = Buffer.from(prefix);
  if (size === undefined)
    return Buffer.concat([base, Buffer.from(tail(base.length))]);
  let padding = size - base.length - Buffer.byteLength(tail(size));
  for (let i = 0; i < 4; i++)
    padding +=
      size -
      base.length -
      padding -
      Buffer.byteLength(tail(base.length + padding));
  if (padding < 2) throw new Error("PDF target size too small");
  const comment = Buffer.alloc(padding, 32);
  comment[0] = 37;
  comment[padding - 1] = 10;
  return Buffer.concat([
    base,
    comment,
    Buffer.from(tail(base.length + padding)),
  ]);
}
