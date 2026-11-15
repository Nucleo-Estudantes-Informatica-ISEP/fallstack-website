import { matchesDeclaredType } from "@/lib/fileSignature";

export const quarantineCvKey = (id: string) => `quarantine/cv/${id}`;

/** Envelope validation, not a PDF parser or malware scanner. Preserves the old
 * magic-byte check and additionally rejects invalid versions/truncated files. */
export function validCvEnvelope(header: Uint8Array, tail: Uint8Array) {
  return (
    matchesDeclaredType(header, "application/pdf") &&
    /^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(new TextDecoder().decode(header)) &&
    /%%EOF\s*$/.test(new TextDecoder().decode(tail))
  );
}
