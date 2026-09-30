import { test as base } from "@playwright/test";

import {
  createStagingRequestContext,
  guardBrowserContext,
} from "../stagingSafety";

export { expect } from "@playwright/test";

export const test = base.extend({
  context: async ({ context, baseURL }, run) => {
    await guardBrowserContext(context, baseURL!);
    await run(context);
  },
  request: async ({ baseURL, storageState }, run) => {
    const context = await createStagingRequestContext({
      baseURL: baseURL!,
      storageState,
    });
    try {
      await run(context);
    } finally {
      await context.dispose();
    }
  },
});
