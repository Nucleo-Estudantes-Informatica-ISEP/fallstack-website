import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function wipeDatabase(): Promise<void> {
  try {
    const models = [
      "savedStudent",
      "actionCompletion",
      "student",
      "employee",
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
  console.error("Refusing to wipe: NODE_ENV must be development.");
  process.exit(1);
}

if (!process.argv.includes("--confirm")) {
  console.error(
    "Refusing to wipe: pass --confirm to delete all database records."
  );
  process.exit(1);
}

wipeDatabase();
