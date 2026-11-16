// @vitest-environment node
import { Readable } from "node:stream";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  GetBucketVersioningCommand,
  ListObjectsV2Command,
  ListPartsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { beforeEach, expect, test, vi } from "vitest";

import { storageEnv } from "@/config/env.storage";

import {
  abortCvMultipart,
  assertUnversionedBucket,
  completeCvMultipart,
  expiredCvMultipart,
  getObjectStream,
  listObjects,
  putObjectStream,
} from "./objectStorageService";

const send = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@aws-sdk/client-s3", async (original) => ({
  ...(await original<object>()),
  S3Client: class {
    send = send;
  },
}));
beforeEach(() => {
  send.mockReset();
});

test("follows continuation tokens and combines all pages", async () => {
  const signal = new AbortController().signal;
  send
    .mockResolvedValueOnce({
      Contents: [{ Key: "first" }],
      IsTruncated: true,
      NextContinuationToken: "page-2",
    })
    .mockResolvedValueOnce({
      IsTruncated: true,
      NextContinuationToken: "page-3",
    })
    .mockResolvedValueOnce({ Contents: [{ Key: "last" }], IsTruncated: false });
  expect(await listObjects("cv", "distribution/cv", signal)).toEqual([
    { Key: "first" },
    { Key: "last" },
  ]);
  expect(
    send.mock.calls.map(([command]) => command.input.ContinuationToken)
  ).toEqual([undefined, "page-2", "page-3"]);
  expect(
    send.mock.calls.every(
      ([command, options]) =>
        command instanceof ListObjectsV2Command &&
        options.abortSignal === signal
    )
  ).toBe(true);
});

test.each([undefined, "same-token"])(
  "truncated page with unusable token %s fails closed",
  async (token) => {
    send
      .mockResolvedValueOnce({
        IsTruncated: true,
        NextContinuationToken: "same-token",
      })
      .mockResolvedValueOnce({
        IsTruncated: true,
        NextContinuationToken: token,
      })
      .mockRejectedValueOnce(new Error("unexpected third page"));
    await expect(listObjects("avatar", "distribution/avatar")).rejects.toThrow(
      "Incomplete storage listing"
    );
    expect(send).toHaveBeenCalledTimes(2);
  }
);

test("second-page permission failure never returns partial objects", async () => {
  const denied = Object.assign(new Error("denied"), { name: "AccessDenied" });
  send
    .mockResolvedValueOnce({
      Contents: [{ Key: "partial" }],
      IsTruncated: true,
      NextContinuationToken: "next",
    })
    .mockRejectedValueOnce(denied);
  await expect(listObjects("cv", "distribution/cv")).rejects.toBe(denied);
});

test.each(["Enabled", "Suspended"])(
  "%s versioning blocks cleanup",
  async (Status) => {
    send.mockResolvedValue({ Status });
    await expect(assertUnversionedBucket("cv")).rejects.toThrow("unversioned");
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetBucketVersioningCommand);
  }
);

test("never-enabled bucket passes; missing permission fails", async () => {
  send.mockResolvedValueOnce({});
  await expect(assertUnversionedBucket("avatar")).resolves.toBeUndefined();
  const denied = Object.assign(new Error("denied"), { name: "AccessDenied" });
  send.mockRejectedValueOnce(denied);
  await expect(assertUnversionedBucket("avatar")).rejects.toBe(denied);
});

test("putObjectStream sends PutObjectCommand with body stream and ContentLength", async () => {
  const stream = Readable.from([Buffer.from("test")]);
  send.mockResolvedValueOnce({});
  const signal = new AbortController().signal;
  await putObjectStream(
    "cv",
    "distribution/cv/test.pdf",
    stream,
    "application/pdf",
    4,
    signal
  );
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      input: expect.objectContaining({
        Bucket: storageEnv.S3_BUCKET_CVS,
        Key: "distribution/cv/test.pdf",
        Body: stream,
        ContentType: "application/pdf",
        ContentLength: 4,
      }),
    }),
    { abortSignal: signal }
  );
  expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
});

test("CV streaming preserves length and cancellation without buffering", async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream({ cancel });
  const transformToByteArray = vi.fn();
  send.mockResolvedValueOnce({
    Body: { transformToWebStream: () => stream, transformToByteArray },
    ContentLength: 10485760,
    ContentType: "application/pdf",
  });
  const signal = new AbortController().signal;
  const file = await getObjectStream("cv", "distribution/cv/test.pdf", signal);
  expect(file?.body).toBe(stream);
  expect(file?.contentLength).toBe(10485760);
  expect(send.mock.calls[0][1]).toEqual({ abortSignal: signal });
  expect(transformToByteArray).not.toHaveBeenCalled();
  await file!.body.cancel();
  expect(cancel).toHaveBeenCalledOnce();
});

test("multipart completion trusts storage's exact part sizes/checksums, never client ETags", async () => {
  send
    .mockResolvedValueOnce({
      Parts: [
        { PartNumber: 1, Size: 5242880, ETag: '"one"', ChecksumSHA256: "sha1" },
        { PartNumber: 2, Size: 1, ETag: '"two"', ChecksumSHA256: "sha2" },
      ],
    })
    .mockResolvedValueOnce({});
  await completeCvMultipart(
    "quarantine/cv/ticket",
    "server-id",
    5242881,
    new AbortController().signal
  );
  expect(send.mock.calls[0][0]).toBeInstanceOf(ListPartsCommand);
  const command = send.mock.calls[1][0];
  expect(command).toBeInstanceOf(CompleteMultipartUploadCommand);
  expect(command.input.MultipartUpload.Parts).toEqual([
    { PartNumber: 1, ETag: '"one"', ChecksumSHA256: "sha1" },
    { PartNumber: 2, ETag: '"two"', ChecksumSHA256: "sha2" },
  ]);
});

test.each([
  { Parts: [] },
  { Parts: [{ PartNumber: 1, Size: 19, ETag: "etag", ChecksumSHA256: "sha" }] },
  { Parts: [{ PartNumber: 1, Size: 20, ETag: "etag" }] },
  {
    IsTruncated: true,
    Parts: [{ PartNumber: 1, Size: 20, ETag: "etag", ChecksumSHA256: "sha" }],
  },
])(
  "incomplete or wrong multipart data cannot reach completion",
  async (listed) => {
    send.mockResolvedValueOnce(listed);
    await expect(
      completeCvMultipart("key", "server-id", 20, new AbortController().signal)
    ).rejects.toMatchObject({ status: 409 });
    expect(send).toHaveBeenCalledTimes(1);
  }
);

test("lost completion reply is retried against HEAD; cancelled data cannot be treated as completed", async () => {
  send
    .mockRejectedValueOnce(Object.assign(new Error(), { name: "NoSuchUpload" }))
    .mockResolvedValueOnce({
      ContentLength: 20,
      ContentType: "application/pdf",
    });
  await completeCvMultipart(
    "key",
    "server-id",
    20,
    new AbortController().signal
  );
  send
    .mockRejectedValueOnce(Object.assign(new Error(), { name: "NoSuchUpload" }))
    .mockResolvedValueOnce({
      ContentLength: 19,
      ContentType: "application/pdf",
    });
  await expect(
    completeCvMultipart("key", "server-id", 20, new AbortController().signal)
  ).rejects.toMatchObject({ status: 400 });
});

test("multipart abort is idempotent only for NoSuchUpload, and transport failures remain visible", async () => {
  send.mockRejectedValueOnce(
    Object.assign(new Error(), { name: "NoSuchUpload" })
  );
  await abortCvMultipart("key", "server-id");
  expect(send.mock.calls[0][0]).toBeInstanceOf(AbortMultipartUploadCommand);
  send.mockRejectedValueOnce(new Error("unavailable"));
  await expect(abortCvMultipart("key", "server-id")).rejects.toThrow(
    "unavailable"
  );
});

test("multipart cleanup retains recent uploads and rejects partial listings", async () => {
  const now = new Date(),
    old = new Date(now.getTime() - 86400001),
    key = "quarantine/cv/00000000-0000-4000-8000-000000000001";
  send.mockResolvedValueOnce({
    Uploads: [
      { Key: key, UploadId: "old", Initiated: old },
      { Key: key, UploadId: "recent", Initiated: now },
      { Key: "other", UploadId: "unrelated", Initiated: old },
    ],
  });
  expect(await expiredCvMultipart(now)).toEqual([{ key, multipartId: "old" }]);
  send.mockResolvedValueOnce({ IsTruncated: true });
  await expect(expiredCvMultipart(now)).rejects.toThrow(
    "Incomplete multipart listing"
  );
});
