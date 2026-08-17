import { AdminRole, PrismaClient, Role, Year } from "@prisma/client";

import { actions } from "@/edition/actions";
import { createAdminClient } from "@/utils/supabase/admin";

const prisma = new PrismaClient();

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

async function ensureSupabaseUser(email: string, password: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (data.user) return data.user;

  if (
    error?.message &&
    error.message.toLowerCase().includes("already been registered")
  ) {
    const list = await admin.auth.admin.listUsers();
    if (list.error) throw list.error;
    const users: { id: string; email?: string }[] = list.data.users;
    const existing = users.find((u) => u.email === email);
    if (existing) return existing;
  }

  throw new Error(error?.message || "Failed to create Supabase user");
}

async function seedInterests() {
  const interests = await prisma.interest.findMany();

  if (interests.length > 0) {
    console.log("⚠️ Interests already seeded");
    return;
  }

  const data = INTERESTS.map((name) => ({ name }));

  await prisma.interest.createMany({
    data,
  });
  console.log("✅ Interests seeded");
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL as string;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("⚠️ Admin user already seeded");
    return existing;
  }

  const supabaseUser = await ensureSupabaseUser(
    email,
    process.env.ADMIN_PASSWORD as string
  );

  const newUser = await prisma.user.create({
    data: {
      id: supabaseUser.id,
      email,
      role: null,
      name: "Admin",
      adminRole: AdminRole.SUPER_ADMIN,
    },
  });

  console.log("✅ Admin user seeded");
  return newUser;
}

async function seedStudent() {
  const email = "student@test.pt";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("⚠️ Student already seeded");
    return existing;
  }

  const supabaseUser = await ensureSupabaseUser(
    email,
    process.env.ADMIN_PASSWORD as string
  );

  const newUser = await prisma.user.create({
    data: {
      id: supabaseUser.id,
      email,
      role: Role.STUDENT,
    },
  });

  await prisma.student.create({
    data: {
      id: newUser.id,
      name: "Student",
      year: Year.LICENCIATURA_3,
      code: "A123",
    },
  });

  console.log("✅ Student seeded");

  return newUser;
}

async function seedStudent2() {
  const email = "student2@test.pt";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("⚠️ Student 2 already seeded");
    return existing;
  }

  const supabaseUser = await ensureSupabaseUser(
    email,
    process.env.ADMIN_PASSWORD as string
  );

  const newUser = await prisma.user.create({
    data: {
      id: supabaseUser.id,
      email,
      role: Role.STUDENT,
    },
  });

  await prisma.student.create({
    data: {
      id: newUser.id,
      name: "Student 2",
      year: Year.LICENCIATURA_2,
      code: "A456",
    },
  });

  console.log("✅ Student 2 seeded");

  return newUser;
}

async function getRankIdByName(name: string) {
  const rank = await prisma.companyRank.findUniqueOrThrow({ where: { name } });
  return rank.id;
}

async function seedNei(userId: string) {
  const rankId = await getRankIdByName("Diamond");
  const company = await prisma.company.upsert({
    where: { name: "NEI" },
    create: { name: "NEI", rankId },
    update: { rankId },
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
  const companies = await prisma.company.findMany();
  if (companies.length > 1) {
    console.log("⚠️ Companies already seeded");
    return;
  }

  const interests = await prisma.interest.findMany();

  for (const c of COMPANIES) {
    const email = `${c.name.toLowerCase()}@test.pt`;
    const existing = await prisma.user.findUnique({ where: { email } });
    const supaUser =
      existing ??
      (await ensureSupabaseUser(email, process.env.ADMIN_PASSWORD as string));
    const userId = existing ? existing.id : supaUser.id;
    if (!existing) {
      await prisma.user.create({
        data: { id: userId, email, role: Role.EMPLOYEE },
      });
    }

    const rankId = await getRankIdByName(c.rankName);
    const company = await prisma.company.upsert({
      where: { name: c.name },
      create: { name: c.name, rankId },
      update: { name: c.name, rankId },
    });

    await prisma.employee.upsert({
      where: { id: userId },
      create: {
        id: userId,
        name: c.name,
        companyId: company.id,
      },
      update: {
        name: c.name,
        companyId: company.id,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        interests: {
          connect: interests
            .filter((i) => c.interests.includes(i.name))
            .map((i) => ({ id: i.id })),
        },
      },
    });

    if (c.name === "armis") {
      const email2 = "armis2@test.pt";
      const existing2 = await prisma.user.findUnique({
        where: { email: email2 },
      });
      const supaUser2 =
        existing2 ??
        (await ensureSupabaseUser(
          email2,
          process.env.ADMIN_PASSWORD as string
        ));
      const userId2 = existing2 ? existing2.id : supaUser2.id;

      if (!existing2) {
        await prisma.user.create({
          data: { id: userId2, email: email2, role: Role.EMPLOYEE },
        });
      }

      await prisma.employee.upsert({
        where: { id: userId2 },
        create: {
          id: userId2,
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
  await seedActions();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
