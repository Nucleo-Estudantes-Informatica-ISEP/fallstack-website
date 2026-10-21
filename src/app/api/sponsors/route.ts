import { publicJson } from "@/lib/http/publicJson";
import { defineHandler } from "@/lib/http/server";
import { getPublicSponsors } from "@/application/services/publicEditionService";

export const GET = defineHandler({
  auth: "none",
  handler: async () => {
    const data = await getPublicSponsors();
    return publicJson(data);
  },
});
