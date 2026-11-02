// Test-only HTTP host: independent OS processes execute production limiter code.
import { createServer } from "node:http";

import { createRedisRateLimitStore } from "../../../src/application/repositories/redisRateLimitRepository";
import { createRateLimitService } from "../../../src/application/services/rateLimitService";
import { rateLimitResponse } from "../../../src/lib/rateLimit";

const store = createRedisRateLimitStore(() => ({
  url: process.env.TEST_REDIS_URL!,
  prefix: process.env.TEST_REDIS_PREFIX!,
}));
const check = createRateLimitService(store);
const server = createServer(async (req, res) => {
  const decision = await check(
    req.url === "/avatar" ? "upload_avatar" : "upload_cv",
    String(req.headers["x-test-subject"]),
    { max: 5, windowMs: Number(process.env.TEST_WINDOW_MS || 60000) }
  );
  const response = rateLimitResponse(decision);
  res.writeHead(response?.status ?? 200, {
    "Content-Type": "application/json",
    ...(response ? Object.fromEntries(response.headers) : {}),
  });
  res.end(response ? await response.text() : JSON.stringify({ allowed: true }));
});
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (address && typeof address !== "string")
    process.send?.({ port: address.port });
});
process.on("SIGTERM", () => {
  store.close();
  server.closeAllConnections();
  server.close(() => process.exit(0));
});
