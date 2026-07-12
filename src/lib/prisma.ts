import { PrismaClient } from "@prisma/client";

import { reportError } from "./logger";

// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV !== "production" ? ["info", "warn", "error"] : [],
  }).$extends({
    model: {
      user: {
        async findUserWithProfile(id: string) {
          try {
            const user = await prisma.user.findUnique({
              where: { id },
              include: {
                employee: {
                  include: {
                    company: true,
                  },
                },
                interests: true,
                student: true,
              },
            });
            if (!user) return null;
            return user;
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
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
