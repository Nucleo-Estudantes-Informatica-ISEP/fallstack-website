import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function wipeDatabase(): Promise<void> {
  try {
    const models = [
      "savedStudent",
      "actionCompletion",
      "userInterest",
      "student",
      "company",
      "action",
      "interest",
      "user",
    ];

    for (const model of models) {
      console.log(`Deleting all records from ${model}...`);
      // @ts-expect-error Dynamic property access for Prisma Client
      await prisma[model as keyof PrismaClient].deleteMany();
    }

    console.log("Database wiped successfully!");
  } catch (error) {
    console.error("Error wiping database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.NODE_ENV !== "development") {
  console.error("This script should only be run in development!");
  process.exit(1);
}

wipeDatabase();
