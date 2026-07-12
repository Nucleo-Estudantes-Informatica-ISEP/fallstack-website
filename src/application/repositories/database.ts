import "server-only";

import { PrismaClient } from "@prisma/client";

import { reportError } from "@/lib/logger";

const prismaClientSingleton = () =>
  new PrismaClient({
    log: process.env.NODE_ENV !== "production" ? ["info", "warn", "error"] : [],
  }).$extends({
    model: {
      user: {
        async findUserWithProfile(id: string) {
          try {
            return await prisma.user.findUnique({
              where: { id },
              include: {
                employee: { include: { company: true } },
                interests: true,
                student: true,
              },
            });
          } catch (error) {
            reportError(
              error,
              { operation: "find_user_with_profile" },
              "Failed to fetch user profile"
            );
            return null;
          }
        },
      },
    },
  });

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
