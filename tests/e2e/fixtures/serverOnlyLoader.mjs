// Isolate the server-only marker in native Node test hosts. Next normally
// resolves this marker itself; React 18 cannot use Node's react-server condition.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return {
        url: new URL("./serverOnly.cjs", import.meta.url).href,
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
