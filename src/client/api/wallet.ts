import "client-only";

import { httpClient } from "@/lib/http/client";

export const getGoogleWalletSaveUrl = () =>
  httpClient.post<{ url: string }>("/wallet");
