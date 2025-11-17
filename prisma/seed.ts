import { PrismaClient, Role, Tier } from "@prisma/client";
import { createAdminClient } from "@/utils/supabase/admin";

import config from "@/config";

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
    tier: Tier.DIAMOND,
    interests: ["Cyber Security", "Networking"],
  },
];

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

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: process.env.ADMIN_PASSWORD as string,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(
      error?.message || "Failed to create admin user in Supabase"
    );

  const newUser = await prisma.user.create({
    data: {
      id: data.user.id,
      email,
      role: Role.COMPANY,
      isAdmin: true,
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

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: process.env.ADMIN_PASSWORD as string,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(
      error?.message || "Failed to create student user in Supabase"
    );

  const newUser = await prisma.user.create({
    data: {
      id: data.user.id,
      email,
      role: Role.STUDENT,
    },
  });

  await prisma.student.create({
    data: {
      id: newUser.id,
      name: "Student",
      year: "3º Ano Licenciatura",
      code: "A123",
    },
  });

  console.log("✅ Student seeded");

  return newUser;
}

async function seedNei(userId: string) {
  const existingCompany = await prisma.company.findUnique({
    where: {
      id: userId,
    },
  });
  if (existingCompany !== null) {
    console.log("⚠️ NEI already seeded");
    return existingCompany;
  }

  const company = await prisma.company.create({
    data: {
      id: userId,
      name: "NEI",
      tier: Tier.DIAMOND,
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

  const admin = createAdminClient();
  for (const c of COMPANIES) {
    const email = `${c.name.toLowerCase()}@test.pt`;
    const existing = await prisma.user.findUnique({ where: { email } });
    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: process.env.ADMIN_PASSWORD as string,
        email_confirm: true,
      });
      if (error || !data.user)
        throw new Error(error?.message || `Failed to create user ${email}`);
      const created = await prisma.user.create({
        data: { id: data.user.id, email, role: Role.COMPANY },
      });
      userId = created.id;
    }

    await prisma.company.upsert({
      where: { id: userId },
      create: {
        id: userId,
        name: c.name,
        tier: c.tier,
      },
      update: { name: c.name, tier: c.tier },
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
  }

  console.log("✅ Companies seeded");
}

async function seedActions() {
  const actions = await prisma.action.findMany();
  if (actions.length > 0) {
    console.log("⚠️ Actions already seeded");
    return;
  }

  await prisma.action.createMany({
    data: [
      {
        name: config.constants.actionNames.createProfile,
        description: "Cria o teu perfil",
        points: 1,
      },
      {
        name: config.constants.actionNames.updateLinkedin,
        description: "Associa o teu LinkedIn",
        points: 2,
      },
      {
        name: config.constants.actionNames.uploadCv,
        description: "Faz o upload do teu CV",
        points: 3,
      },
      {
        name: "Palestra 1",
        description: "Assiste à palestra 1",
        points: 5,
      },
      {
        name: "Palestra 2",
        description: "Assiste à palestra 2",
        points: 5,
      },
      {
        name: "Palestra 3",
        description: "Assiste à palestra 3",
        points: 10,
      },
      {
        name: "Entrevista com o Teixeira",
        description: "Assiste à palestra 3",
        altText: "0x31r4",
        points: 10,
      },
    ],
  });

  console.log("✅ Actions seeded");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("⚠️ Seeding is disabled in production");
    return;
  }
  await seedInterests();
  await seedStudent();
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
