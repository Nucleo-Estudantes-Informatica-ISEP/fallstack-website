import { getInterests } from "@/application/services/interestService";

export async function GET() {
  const interests = await getInterests();
  return Response.json(interests);
}
