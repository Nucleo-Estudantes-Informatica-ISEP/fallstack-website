import {
  request,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";

export async function createStagingRequestContext(
  options: Parameters<typeof request.newContext>[0] & { baseURL: string }
): Promise<APIRequestContext> {
  const origin = new URL(options.baseURL).origin;
  const context = await request.newContext({ ...options, maxRedirects: 0 });
  return new Proxy(context, {
    get(target, key) {
      const method = Reflect.get(target, key);
      if (typeof method !== "function") return method;
      if (
        ["get", "post", "put", "patch", "delete", "head", "fetch"].includes(
          String(key)
        )
      )
        return (url: string, requestOptions = {}) => {
          const destination = new URL(url, origin);
          if (
            destination.origin !== origin ||
            destination.username ||
            destination.password
          )
            throw new Error(
              "Refusing API request outside the approved staging origin."
            );
          return method.call(target, url, {
            ...requestOptions,
            maxRedirects: 0,
          });
        };
      return method.bind(target);
    },
  });
}

export async function guardBrowserContext(
  context: BrowserContext,
  baseURL: string
) {
  const origin = new URL(baseURL).origin;
  await context.route("**/*", async (route) => {
    const destination = new URL(route.request().url());
    if (
      destination.origin !== origin ||
      destination.username ||
      destination.password
    ) {
      await route.abort("blockedbyclient");
      return;
    }
    const response = await route.fetch({ maxRedirects: 0 });
    // Reject even same-origin redirects: redirected hops bypass route handlers.
    if (
      response.status() >= 300 &&
      response.status() < 400 &&
      response.headers().location
    ) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.fulfill({ response });
  });
}
