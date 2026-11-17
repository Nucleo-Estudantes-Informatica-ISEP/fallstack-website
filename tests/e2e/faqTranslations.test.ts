import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, expect, test } from "vitest";

import { singleConnectionDatabaseUrl } from "@/config/env.database";

const prisma = new PrismaClient({
  datasourceUrl: singleConnectionDatabaseUrl(),
});
afterAll(() => prisma.$disconnect());

test("FAQ migration repairs copied translations, preserves custom English and Portuguese, and is repeatable", async () => {
  const sql = await readFile(
    resolve(
      "prisma/migrations/20261117220000_translate_seeded_faqs/migration.sql"
    ),
    "utf8"
  );
  const rollback = new Error("rollback FAQ fixtures");
  await expect(
    prisma.$transaction(async (tx) => {
      await tx.faqEntry.deleteMany();
      const copied = await tx.faqEntry.create({
        data: {
          order: 0,
          question: {
            PT: "Como me inscrevo no evento?",
            EN: "Como me inscrevo no evento?",
          },
          answer: { PT: "Resposta original", EN: "Resposta original" },
        },
      });
      const edited = await tx.faqEntry.create({
        data: {
          order: 1,
          question: {
            PT: "O meu CV vai ser enviado para as empresas?",
            EN: "Custom English question",
          },
          answer: { PT: "Resposta editada", EN: "Custom English answer" },
        },
      });
      const missing = await tx.faqEntry.create({
        data: {
          order: 2,
          question: { PT: "Existe algum custo associado ao evento?" },
          answer: { PT: "Gratuito" },
        },
      });
      await tx.$executeRawUnsafe(sql);
      const repaired = await tx.faqEntry.findUniqueOrThrow({
        where: { id: copied.id },
      });
      expect(repaired.question).toEqual({
        PT: "Como me inscrevo no evento?",
        EN: "How do I register for the event?",
      });
      expect(repaired.answer).toMatchObject({
        PT: "Resposta original",
        EN: expect.stringContaining("official event platform"),
      });
      expect(
        await tx.faqEntry.findUniqueOrThrow({ where: { id: edited.id } })
      ).toEqual(edited);
      expect(
        (await tx.faqEntry.findUniqueOrThrow({ where: { id: missing.id } }))
          .question
      ).toMatchObject({ EN: "Is there a cost to attend?" });
      await tx.$executeRawUnsafe(sql);
      expect(
        await tx.faqEntry.findUniqueOrThrow({ where: { id: copied.id } })
      ).toEqual(repaired);
      throw rollback;
    })
  ).rejects.toBe(rollback);
});
