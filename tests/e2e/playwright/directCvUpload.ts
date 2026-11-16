import { expect, type APIRequestContext } from "@playwright/test";

export async function directCvUpload(request: APIRequestContext, pdf: Buffer) {
  const authorized = await request.post("/api/storage/cv", {
    data: {
      filename: "sample.pdf",
      contentType: "application/pdf",
      size: pdf.length,
    },
  });
  expect(authorized.status()).toBe(201);
  const post = await authorized.json();
  const form = new FormData();
  for (const [key, value] of Object.entries(post.fields))
    form.append(key, String(value));
  form.append(
    "file",
    new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    "sample.pdf"
  );
  // Node fetch has no application cookie jar, matching credential-less transfer.
  const transfer = await fetch(post.url, { method: "POST", body: form });
  expect(transfer.status).toBe(204);
  const finalized = await request.post("/api/storage/cv/finalize", {
    data: { uploadId: post.uploadId },
  });
  expect(finalized.status()).toBe(200);
  return finalized;
}
