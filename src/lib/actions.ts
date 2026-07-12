import { Action } from "@prisma/client";

import prisma from "./prisma";

export async function getActions(): Promise<Action[]> {
  return prisma.action.findMany();
}
