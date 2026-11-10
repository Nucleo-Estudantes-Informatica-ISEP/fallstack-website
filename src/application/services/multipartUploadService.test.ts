// @vitest-environment node
import { access, readFile, stat } from "node:fs/promises";
import { expect, test, vi } from "vitest";

import { withMultipartFile } from "./multipartUploadService";

vi.mock("server-only", () => ({}));

const max = 1024;
const boundary = "test-boundary";
const head = Buffer.from(
  `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="cv.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
);
const tail = Buffer.from(`\r\n--${boundary}--\r\n`);

function request(
  chunks: Uint8Array[],
  declared?: string,
  options: {
    signal?: AbortSignal;
    cancel?: () => void;
    interrupted?: boolean;
    type?: string;
  } = {}
) {
  const source = [...chunks];
  return new Request("http://localhost/upload", {
    method: "POST",
    headers: {
      "content-type":
        options.type ?? `multipart/form-data; boundary=${boundary}`,
      ...(declared === undefined ? {} : { "content-length": declared }),
    },
    body: new ReadableStream({
      pull(controller) {
        const chunk = source.shift();
        if (chunk) controller.enqueue(chunk);
        else if (options.interrupted)
          controller.error(new Error("connection reset"));
        else controller.close();
      },
      cancel: options.cancel,
    }),
    signal: options.signal,
    duplex: "half",
  } as RequestInit);
}

test.each([undefined, String(head.length + max + tail.length)])(
  "parses split boundaries with Content-Length %s and removes staging",
  async (declared) => {
    let path = "";
    const bytes = Buffer.alloc(max, 1);
    const payload = Buffer.concat([head, bytes, tail]);
    const chunks = Array.from(payload, (byte) => Buffer.from([byte]));
    const result = await withMultipartFile(
      request(chunks, declared),
      max,
      async (file) => {
        path = file.path;
        // Windows does not expose POSIX permission bits through stat().
        if (process.platform !== "win32")
          expect((await stat(path)).mode & 0o777).toBe(0o600);
        expect(await readFile(path)).toEqual(bytes);
        expect(file.header).toEqual(bytes.subarray(0, 16));
        expect(file.size).toBe(max);
        return "consumed";
      }
    );
    expect(result).toBe("consumed");
    await expect(access(path)).rejects.toMatchObject({ code: "ENOENT" });
  }
);

test.each(["nonsense", "-1", "1.5", "1e3", "", String(max + 16 * 1024 + 1)])(
  "rejects invalid/oversized Content-Length %s without consuming",
  async (declared) => {
    const req = request([head, tail], declared);
    await expect(withMultipartFile(req, max, vi.fn())).rejects.toMatchObject({
      status: 413,
    });
    expect(req.bodyUsed).toBe(false);
  }
);

test.each(["1", String(head.length + tail.length + 2)])(
  "rejects mismatched Content-Length %s",
  async (declared) => {
    const consume = vi.fn();
    await expect(
      withMultipartFile(
        request([head, Buffer.from("x"), tail], declared),
        max,
        consume
      )
    ).rejects.toMatchObject({ status: 400 });
    expect(consume).not.toHaveBeenCalled();
  }
);

test.each([undefined, "1"])(
  "counts actual bytes despite declared length %s and cancels oversize input",
  async (declared) => {
    const cancel = vi.fn();
    const consume = vi.fn();
    await expect(
      withMultipartFile(
        request(
          [
            Buffer.alloc(max + 16 * 1024 + 1),
            ...Array.from({ length: 16 }, () => Buffer.alloc(64 * 1024)),
          ],
          declared,
          { cancel }
        ),
        max,
        consume
      )
    ).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  }
);

test.each([
  ["oversized file", [head, Buffer.alloc(max + 1), tail]],
  ["truncated multipart", [head, Buffer.from("%PDF")]],
  ["missing file", [tail]],
  [
    "duplicate files",
    [head, Buffer.from("x"), Buffer.from("\r\n"), head, Buffer.from("x"), tail],
  ],
  [
    "unexpected field",
    [
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="other"\r\n\r\nx`
      ),
      tail,
    ],
  ],
  [
    "wrong file field",
    [
      Buffer.from(head.toString().replace('name="file"', 'name="other"')),
      Buffer.from("x"),
      tail,
    ],
  ],
] as const)(
  "rejects %s before consuming a staged file",
  async (_name, chunks) => {
    const consume = vi.fn();
    await expect(
      withMultipartFile(request([...chunks]), max, consume)
    ).rejects.toMatchObject({ status: 400 });
    expect(consume).not.toHaveBeenCalled();
  }
);

test("rejects interrupted source", async () => {
  const consume = vi.fn();
  await expect(
    withMultipartFile(
      request([head, Buffer.from("partial")], undefined, { interrupted: true }),
      max,
      consume
    )
  ).rejects.toMatchObject({ status: 400 });
  expect(consume).not.toHaveBeenCalled();
});

test("cleans staging when the consumer fails", async () => {
  let path = "";
  const failure = new Error("storage failure");
  await expect(
    withMultipartFile(
      request([head, Buffer.from("x"), tail]),
      max,
      async (file) => {
        path = file.path;
        throw failure;
      }
    )
  ).rejects.toBe(failure);
  await expect(access(path)).rejects.toMatchObject({ code: "ENOENT" });
});

test.each(["application/json", "multipart/form-data"])(
  "rejects unsupported/malformed content type %s",
  async (type) => {
    await expect(
      withMultipartFile(
        request([head, tail], undefined, { type }),
        max,
        vi.fn()
      )
    ).rejects.toMatchObject({ status: 400 });
  }
);

test("removes staging and maps a request disconnect while consuming", async () => {
  const controller = new AbortController();
  let path = "";
  await expect(
    withMultipartFile(
      request([head, Buffer.from("x"), tail], undefined, {
        signal: controller.signal,
      }),
      max,
      async (file, signal) => {
        path = file.path;
        controller.abort();
        signal.throwIfAborted();
      }
    )
  ).rejects.toMatchObject({ status: 400 });
  await expect(access(path)).rejects.toMatchObject({ code: "ENOENT" });
});

test("bounds storage time and removes staging on timeout", async () => {
  const controller = new AbortController();
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(controller.signal);
  let path = "";
  try {
    await expect(
      withMultipartFile(
        request([head, Buffer.from("x"), tail]),
        max,
        async (file, signal) => {
          path = file.path;
          controller.abort(new DOMException("timed out", "TimeoutError"));
          signal.throwIfAborted();
        }
      )
    ).rejects.toMatchObject({ status: 408 });
    expect(timeout).toHaveBeenCalledWith(60_000);
    await expect(access(path)).rejects.toMatchObject({ code: "ENOENT" });
  } finally {
    timeout.mockRestore();
  }
});

test.each(["missing", "used", "locked"])(
  "rejects a %s body before staging",
  async (state) => {
    const req =
      state === "missing"
        ? new Request("http://localhost/upload", { method: "POST" })
        : request([head, Buffer.from("x"), tail]);
    if (state === "used") await req.text();
    const reader = state === "locked" ? req.body!.getReader() : undefined;
    try {
      await expect(withMultipartFile(req, max, vi.fn())).rejects.toMatchObject({
        status: 400,
      });
    } finally {
      reader?.releaseLock();
    }
  }
);
