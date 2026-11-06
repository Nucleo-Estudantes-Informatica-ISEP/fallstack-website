// Native HTTP host for the isolated upload benchmark. It intentionally omits
// session/Redis/Next overhead; authenticated Next routes are checked separately.
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

import { getObject } from "@/application/services/objectStorageService";
import { uploadFile } from "@/application/services/uploadService";

async function main() {
  const baseline = process.argv[2]
    ? await import(pathToFileURL(process.argv[2]).href)
    : undefined;
  let peakRss = process.memoryUsage().rss;
  const sample = setInterval(() => {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }, 5);
  sample.unref();
  const server = createServer(async (incoming, outgoing) => {
    try {
      if (incoming.url === "/reset") {
        global.gc?.();
        peakRss = process.memoryUsage().rss;
        outgoing.end(JSON.stringify({ rss: peakRss }));
        return;
      }
      if (incoming.url === "/metrics") {
        outgoing.end(JSON.stringify({ peakRss }));
        return;
      }
      if (incoming.method === "GET") {
        const key = decodeURIComponent(incoming.url!.slice(1));
        const kind = key.startsWith("distribution/cv/") ? "cv" : "avatar";
        const object = await getObject(kind, key);
        outgoing.statusCode = object ? 200 : 404;
        outgoing.end(object?.bytes);
        return;
      }
      const kind = incoming.url === "/cv" ? "cv" : "avatar";
      const controller = new AbortController();
      incoming.on("aborted", () => controller.abort());
      outgoing.on("close", () => {
        if (!outgoing.writableFinished) controller.abort();
      });
      const request = new Request(`http://127.0.0.1${incoming.url}`, {
        method: "POST",
        headers: incoming.headers as Record<string, string>,
        body: Readable.toWeb(incoming),
        signal: controller.signal,
        duplex: "half",
      } as RequestInit);
      const result = baseline
        ? await baseline.uploadFile(
            kind,
            await baseline.readUploadFile(request, kind)
          )
        : await uploadFile(kind, request);
      outgoing.statusCode = 201;
      outgoing.end(JSON.stringify(result));
    } catch (error) {
      outgoing.statusCode =
        error instanceof Error && "status" in error
          ? Number(error.status)
          : 500;
      outgoing.end(
        JSON.stringify({
          error: error instanceof Error ? error.name : "UploadError",
        })
      );
    }
  });
  server.listen(0, "127.0.0.1", () => {
    process.send?.({ port: (server.address() as { port: number }).port });
  });
}

void main();
