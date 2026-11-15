// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

import { finalizeCvUpload, initiateCvUpload } from "./directCvUploadService";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  createCvUpload: vi.fn(),
  findCvUpload: vi.fn(),
  claimCvUpload: vi.fn(),
  consumeCvUpload: vi.fn(),
  finishCvValidation: vi.fn(),
  releaseCvUpload: vi.fn(),
  cancelPendingCvUpload: vi.fn(),
  headCvObject: vi.fn(),
  presignCvPost: vi.fn(),
  readCvRange: vi.fn(),
  promoteCvObject: vi.fn(),
  deleteObject: vi.fn(),
  cvKey: (id: string) => `distribution/cv/${id}.pdf`,
}));
vi.mock("../repositories/cvUploadRepository", () => mocks);
vi.mock("./objectStorageService", () => mocks);
vi.mock("../repositories/studentRepository", () => ({
  findStudentProfileById: vi.fn(async () => null),
}));
vi.mock("../repositories/transaction", () => ({
  withTransaction: (fn: (tx: object) => unknown) => fn({}),
}));
vi.mock("./actionService", () => ({ completeAction: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.deleteObject.mockResolvedValue(undefined);
  mocks.releaseCvUpload.mockResolvedValue(undefined);
  mocks.findCvUpload.mockResolvedValue({
    id: "ticket",
    size: 20,
    status: "pending",
    expiresAt: new Date(Date.now() + 300_000),
  });
  mocks.claimCvUpload.mockResolvedValue(true);
  mocks.headCvObject.mockResolvedValue({
    ETag: '"etag"',
    ContentLength: 20,
    ContentType: "application/pdf",
  });
  mocks.readCvRange.mockImplementation(async (_key, start) =>
    Buffer.from(start === 0 ? "%PDF-1.7\n%%EOF\n" : "%%EOF\n")
  );
  mocks.presignCvPost.mockResolvedValue({
    url: "https://s3.test/cvs",
    fields: {},
  });
});
test("authorization generates a server UUID and persists owner, size and deadline", async () => {
  const response = await initiateCvUpload("owner", {
    filename: "cv.pdf",
    contentType: "application/pdf",
    size: 20,
  });
  expect(response.uploadId).toMatch(/^[0-9a-f-]{36}$/);
  expect(mocks.createCvUpload).toHaveBeenCalledWith(
    expect.objectContaining({
      id: response.uploadId,
      ownerId: "owner",
      size: 20,
    })
  );
  expect(mocks.presignCvPost).toHaveBeenCalledWith(
    `quarantine/cv/${response.uploadId}`,
    20
  );
});
test("promotion binds validated ETag, then commits before deleting temporary object", async () => {
  const result = await finalizeCvUpload("owner", "ticket");
  expect(mocks.promoteCvObject).toHaveBeenCalledWith(
    "quarantine/cv/ticket",
    `distribution/cv/${result.id}.pdf`,
    '"etag"',
    expect.any(AbortSignal)
  );
  expect(mocks.finishCvValidation).toHaveBeenCalledWith(
    "ticket",
    "owner",
    expect.any(String),
    result.id,
    expect.anything()
  );
  expect(mocks.deleteObject).toHaveBeenCalledWith(
    "cv",
    "quarantine/cv/ticket",
    expect.any(AbortSignal)
  );
});
test("repeat finalization returns committed id without touching storage", async () => {
  mocks.findCvUpload.mockResolvedValue({
    status: "attached",
    cvId: "committed",
  });
  expect(await finalizeCvUpload("owner", "ticket")).toEqual({
    id: "committed",
  });
  expect(mocks.headCvObject).not.toHaveBeenCalled();
});
test.each([
  "headCvObject",
  "readCvRange",
  "promoteCvObject",
  "finishCvValidation",
] as const)(
  "%s failure releases only its attempt and never deletes a possibly committed destination",
  async (method) => {
    mocks[method].mockRejectedValueOnce(new Error("Unavailable"));
    await expect(finalizeCvUpload("owner", "ticket")).rejects.toMatchObject({
      status: 503,
    });
    expect(mocks.releaseCvUpload).toHaveBeenCalledWith(
      "ticket",
      expect.any(String),
      false
    );
    expect(mocks.deleteObject).not.toHaveBeenCalled();
  }
);
test("invalid signature rejects permanently and removes quarantine", async () => {
  mocks.readCvRange.mockResolvedValue(Buffer.from("fake PDF"));
  await expect(finalizeCvUpload("owner", "ticket")).rejects.toMatchObject({
    status: 400,
  });
  expect(mocks.releaseCvUpload).toHaveBeenCalledWith(
    "ticket",
    expect.any(String),
    true
  );
  expect(mocks.promoteCvObject).not.toHaveBeenCalled();
  expect(mocks.deleteObject).toHaveBeenCalled();
});
test("busy or expired ticket cannot start another promotion", async () => {
  mocks.claimCvUpload.mockResolvedValue(false);
  await expect(finalizeCvUpload("owner", "ticket")).rejects.toMatchObject({
    status: 409,
  });
  mocks.findCvUpload.mockResolvedValue({
    status: "pending",
    expiresAt: new Date(0),
  });
  await expect(finalizeCvUpload("owner", "ticket")).rejects.toMatchObject({
    status: 410,
  });
  expect(mocks.promoteCvObject).not.toHaveBeenCalled();
});
