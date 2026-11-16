import { clientEnv } from "@/config/env.client";

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL
  ? clientEnv.NEXT_PUBLIC_BASE_URL
  : "/api";
