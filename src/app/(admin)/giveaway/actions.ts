"use server";

import { pickWeightedWinner } from "@/lib/giveaway";
import getServerSession from "@/application/services/sessionService";
import { getStudentsForGiveaway } from "@/application/services/studentService";

interface GiveawayWinner {
  id: string;
  name: string;
  points: number;
  email: string;
}

/**
 * Picks the giveaway winner on the server. Only the winner's details (including
 * email) are returned — the full student list with emails never reaches the
 * client. Admin-only.
 */
export async function pickGiveawayWinner(): Promise<GiveawayWinner | null> {
  const session = await getServerSession();
  if (!session || !session.isAdmin) {
    throw new Error("Unauthorized");
  }

  const students = await getStudentsForGiveaway();

  const winner = pickWeightedWinner(
    students.map((s) => ({ id: s.id, points: s.numberOfTotalPoints }))
  );
  if (!winner) return null;

  const full = students.find((s) => s.id === winner.id);
  if (!full) return null;

  return {
    id: full.id,
    name: full.name,
    points: full.numberOfTotalPoints,
    email: full.user.email,
  };
}
