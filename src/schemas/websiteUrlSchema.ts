import { z } from "zod";

// Restricted to http(s): this value is persisted and rendered directly as a
// public <a href> (Sponsor/Company), and `z.url()` alone accepts
// `javascript:`/`data:` schemes - React 18 leaves those in the generated
// markup as-is, so a bare `z.url()` here would let a saved value execute on
// click.
export const websiteUrlSchema = z.url({ protocol: /^https?$/ }).max(2048);
