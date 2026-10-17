// @vitest-environment node
import {
  GetBucketVersioningCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { beforeEach, expect, test, vi } from "vitest";

import { assertUnversionedBucket, listObjects } from "./objectStorageService";

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
