// @vitest-environment node
import { expect, test } from "vitest";

import { minioPost } from "./minioPost";

test("ordered S3 multipart retains signed fields and exact binary file as last part", async () => {
  const bytes = new Uint8Array([0, 255, 13, 10, 37, 80, 68, 70]);
  const post = minioPost(
    { key: "quarantine/cv/server-id", Policy: "signed+/==" },
    bytes.buffer
  );
  const request = new Request("http://localhost/bucket", {
    method: "POST",
    headers: { "Content-Type": post.contentType },
    body: post.body,
  });
  const form = await request.formData();
  expect(Array.from(form.keys())).toEqual(["key", "Policy", "file"]);
  expect(form.get("Policy")).toBe("signed+/==");
  expect(
    new Uint8Array(await (form.get("file") as File).arrayBuffer())
  ).toEqual(bytes);
});
