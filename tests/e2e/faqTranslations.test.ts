import { randomUUID } from "node:crypto";
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
  const marker = `faq-test-${randomUUID()}: `;
  const rollback = new Error("rollback FAQ fixtures");
  await expect(
    prisma.$transaction(async (tx) => {
      const minimum = await tx.faqEntry.aggregate({ _min: { order: true } });
      const order = Math.min(minimum._min.order ?? 0, 0) - 4;
      const copied = await tx.faqEntry.create({
        data: {
          order,
          question: {
            PT: marker + "Como me inscrevo no evento?",
            EN: marker + "Como me inscrevo no evento?",
          },
          answer: { PT: "Resposta original", EN: "Resposta original" },
        },
      });
      const edited = await tx.faqEntry.create({
        data: {
          order: order + 1,
          question: {
            PT: marker + "O meu CV vai ser enviado para as empresas?",
            EN: marker + "Custom English question",
          },
          answer: { PT: "Resposta editada", EN: "Custom English answer" },
        },
      });
      const missing = await tx.faqEntry.create({
        data: {
          order: order + 2,
          question: { PT: marker + "Existe algum custo associado ao evento?" },
          answer: { PT: "Gratuito" },
        },
      });
      const absences = await tx.faqEntry.create({
        data: {
          order: order + 3,
          question: {
            PT: marker + "As faltas são justificadas durante o evento?",
            EN: marker + "As faltas são justificadas durante o evento?",
          },
          answer: { PT: "Resposta original", EN: "Resposta original" },
        },
      });
      // Run the migration only against this transaction's marker fixtures.
      const fixtureIds = [copied, edited, missing, absences].map(
        ({ id }) => id
      );
      const fixtureSql = sql
        .replace(/\('([^']+)', '([^']+)',/g, `('${marker}$1', '${marker}$2',`)
        .replace(
          'WHERE faq."question"',
          `WHERE faq."id" IN (${fixtureIds.map((id) => `'${id}'::uuid`).join(",")}) AND faq."question"`
        );
      await tx.$executeRawUnsafe(fixtureSql);
      const repaired = await tx.faqEntry.findUniqueOrThrow({
        where: { id: copied.id },
      });
      expect(repaired.question).toEqual({
        PT: marker + "Como me inscrevo no evento?",
        EN: marker + "How do I register for the event?",
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
      ).toMatchObject({ EN: marker + "Is there a cost to attend?" });
      expect(
        await tx.faqEntry.findUniqueOrThrow({ where: { id: absences.id } })
      ).toMatchObject({
        question: {
          PT: marker + "As faltas são justificadas durante o evento?",
          EN: marker + "Are absences excused during the event?",
        },
        answer: {
          PT: "Resposta original",
          EN: expect.stringContaining("third-year Computer Engineering"),
        },
      });
      await tx.$executeRawUnsafe(fixtureSql);
      expect(
        await tx.faqEntry.findUniqueOrThrow({ where: { id: copied.id } })
      ).toEqual(repaired);
      throw rollback;
    })
  ).rejects.toBe(rollback);
});
