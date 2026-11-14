import { createHash, randomBytes } from "node:crypto";
import { AdminRole, PrismaClient, Role, Year } from "@prisma/client";

import { singleConnectionDatabaseUrl } from "@/config/env.database";
import { Language, Translations } from "@/domain/i18n/translations";
import { actions } from "@/edition/actions";

const prisma = new PrismaClient({
  datasourceUrl: singleConnectionDatabaseUrl(),
});

const INTERESTS = [
  "Artificial Intelligence",
  "Data Science",
  "Mobile Development",
  "Web Development",
  "Devops",
  "Cyber Security",
  "Game Development",
  "Cloud Computing",
  "Machine Learning",
  "Blockchain",
  "Internet of Things",
  "Quantum Computing",
  "Augmented Reality",
  "Virtual Reality",
  "Big Data",
  "Robotics",
  "Networking",
  "Database Management",
  "Software Development",
  "Outsystems",
  "Data Analysis",
  "UI/UX Design",
  "Infrastructure",
];

const COMPANIES = [
  {
    name: "armis",
    rankName: "Diamond",
    interests: ["Cyber Security", "Networking"],
  },
];

async function seedInterests() {
  const interests = await prisma.interest.findMany();
  if (interests.length > 0) {
    console.log("⚠️ Interests already seeded");
    return;
  }

  await prisma.interest.createMany({
    data: INTERESTS.map((name) => ({ name: { PT: name, EN: name } })),
  });
  console.log("✅ Interests seeded");
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("⚠️ Admin user already seeded");
    return existing;
  }

  const user = await prisma.user.create({
    data: {
      email,
      role: null,
      name: "Admin",
      adminRole: AdminRole.SUPER_ADMIN,
      zitadelUserId: "local-admin",
    },
  });

  console.log("✅ Local admin fixture seeded (no AuthNEI credential created)");
  return user;
}

async function seedStudent() {
  const email = "student@test.pt";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("⚠️ Student already seeded");
    return existing;
  }

  const user = await prisma.user.create({
    data: { email, role: Role.STUDENT, zitadelUserId: "local-student" },
  });
  await prisma.student.create({
    data: {
      id: user.id,
      name: "Student",
      year: Year.LICENCIATURA_3,
      code: "A123",
    },
  });

  console.log("✅ Student fixture seeded");
  return user;
}

async function seedStudent2() {
  const email = "student2@test.pt";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("⚠️ Student 2 already seeded");
    return existing;
  }

  const user = await prisma.user.create({
    data: { email, role: Role.STUDENT, zitadelUserId: "local-student-2" },
  });
  await prisma.student.create({
    data: {
      id: user.id,
      name: "Student 2",
      year: Year.LICENCIATURA_2,
      code: "A456",
    },
  });

  console.log("✅ Student 2 fixture seeded");
  return user;
}

async function getRankIdByName(name: string) {
  const rank = await prisma.companyRank.findUniqueOrThrow({ where: { name } });
  return rank.id;
}

function generateInviteCode(): {
  code: string;
  employeeInviteCodeHash: string;
  employeeInviteCodeUpdatedAt: Date;
} {
  const code = `fs_emp_${randomBytes(20).toString("hex")}`;
  const employeeInviteCodeHash = createHash("sha256")
    .update(code, "utf8")
    .digest("hex");
  return {
    code,
    employeeInviteCodeHash,
    employeeInviteCodeUpdatedAt: new Date(),
  };
}

async function seedNei(userId: string) {
  const rankId = await getRankIdByName("Diamond");
  const existing = await prisma.company.findUnique({ where: { name: "NEI" } });
  const invite = existing?.employeeInviteCodeHash ? {} : generateInviteCode();

  const company = await prisma.company.upsert({
    where: { name: "NEI" },
    create: { name: "NEI", rankId, ...invite },
    update: { rankId, ...invite },
  });

  await prisma.employee.upsert({
    where: { id: userId },
    create: {
      id: userId,
      name: "NEI",
      companyId: company.id,
    },
    update: {
      name: "NEI",
      companyId: company.id,
    },
  });

  console.log("✅ NEI seeded");
  return company;
}

async function seedCompanies() {
  const interests = await prisma.interest.findMany();

  for (const companySeed of COMPANIES) {
    const email = `${companySeed.name.toLowerCase()}@test.pt`;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: Role.EMPLOYEE,
          zitadelUserId: `local-${companySeed.name.toLowerCase()}`,
        },
      });
    }

    const rankId = await getRankIdByName(companySeed.rankName);
    const existing = await prisma.company.findUnique({
      where: { name: companySeed.name },
    });
    const invite = existing?.employeeInviteCodeHash ? {} : generateInviteCode();

    const company = await prisma.company.upsert({
      where: { name: companySeed.name },
      create: { name: companySeed.name, rankId, ...invite },
      update: { name: companySeed.name, rankId, ...invite },
    });

    await prisma.employee.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        name: companySeed.name,
        companyId: company.id,
      },
      update: {
        name: companySeed.name,
        companyId: company.id,
      },
    });

    await prisma.company.update({
      where: { id: company.id },
      data: {
        interests: {
          connect: interests
            .filter((interest) =>
              companySeed.interests.includes(
                Translations.fromJSON(interest.name).get(Language.EN)
              )
            )
            .map((interest) => ({ id: interest.id })),
        },
      },
    });

    if (companySeed.name === "armis") {
      const email2 = "armis2@test.pt";
      let user2 = await prisma.user.findUnique({ where: { email: email2 } });
      if (!user2) {
        user2 = await prisma.user.create({
          data: { email: email2, role: Role.EMPLOYEE },
        });
      }

      await prisma.employee.upsert({
        where: { id: user2.id },
        create: {
          id: user2.id,
          name: "Armis Employee 2",
          companyId: company.id,
        },
        update: {
          name: "Armis Employee 2",
          companyId: company.id,
        },
      });
      console.log("✅ Armis Employee 2 seeded");
    }
  }

  console.log("✅ Companies seeded");
}

async function seedCompanyInviteCodes() {
  const companies = await prisma.company.findMany();
  let generatedCount = 0;

  for (const company of companies) {
    if (!company.employeeInviteCodeHash) {
      const code = company.code || `fs_emp_${randomBytes(20).toString("hex")}`;
      const hash = createHash("sha256").update(code, "utf8").digest("hex");
      await prisma.company.update({
        where: { id: company.id },
        data: {
          code,
          employeeInviteCodeHash: hash,
          employeeInviteCodeUpdatedAt: new Date(),
        },
      });
      console.log(`🔑 Company "${company.name}" invite code: ${code}`);
      generatedCount++;
    }
  }

  if (generatedCount > 0) {
    console.log(`✅ Generated invite codes for ${generatedCount} companies`);
  } else {
    console.log("ℹ️ All companies already have invite codes");
  }
}

async function seedActions() {
  const existingActions = await prisma.action.findMany();
  if (existingActions.length > 0) {
    console.log("⚠️ Actions already seeded");
    return;
  }

  await prisma.action.createMany({ data: actions.seed });
  console.log("✅ Actions seeded");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("⚠️ Seeding is disabled in production");
    return;
  }

  await seedInterests();
  await seedStudent();
  await seedStudent2();
  const user = await seedAdmin();
  await seedNei(user.id);
  await seedCompanies();
  await seedCompanyInviteCodes();
  await seedActions();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
