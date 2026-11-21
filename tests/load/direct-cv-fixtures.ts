// Local-only synthetic fixture lifecycle. Never reads production credentials.
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { PrismaClient, Role } from "@prisma/client";
import jwt from "jsonwebtoken";

import {
  cvKey,
  deleteObject,
} from "@/application/services/objectStorageService";
import { quarantineCvKey } from "@/domain/cvUpload";
import generateRandomCode from "@/utils/GenerateCode";

import { syntheticPdf } from "../fixtures/pdf";

const databaseUrl = new URL(process.env.DATABASE_URL!);
const endpoint = new URL(process.env.S3_ENDPOINT!);
if (
  process.env.CONFIRM_LOCAL_STORAGE_TEST !== "yes" ||
  !["127.0.0.1", "localhost"].includes(databaseUrl.hostname) ||
  !["127.0.0.1", "localhost"].includes(endpoint.hostname) ||
  !databaseUrl.pathname.includes("direct") ||
  !process.env.AUTH_SECRET
)
  throw new Error(
    "Requires confirmed task-owned local database/storage and local AUTH_SECRET"
  );
const file = process.argv[3] || "tests/e2e/.staging-direct-cv.json";
const db = new PrismaClient();
type Manifest = {
  run: string;
  users: string[];
  companies: string[];
  rankId: string;
  actionId: string;
  actionPresenterCookie: string;
  storageOrigin: string;
  uploads: { cookie: string; code: string }[];
  business: {
    employeeCookie: string;
    targets: { cookie: string; code: string }[];
  }[];
};
const manifest: Manifest = {
  run: randomUUID(),
  users: [],
  companies: [],
  rankId: randomUUID(),
  actionId: randomUUID(),
  actionPresenterCookie: "",
  storageOrigin: new URL(process.env.S3_PUBLIC_ENDPOINT!).origin,
  uploads: [],
  business: [],
};
function cookie(sub: string, employee = false, admin = false) {
  return `@Fallstack26:auth=${jwt.sign(
    { sub, email: `${sub}@example.test`, employee, admin },
    process.env.AUTH_SECRET!,
    {
      issuer: "fallstack",
      audience: "fallstack-web",
      expiresIn: "2h",
      algorithm: "HS256",
    }
  )}`;
}
async function student() {
  const id = randomUUID();
  manifest.users.push(id);
  const code = generateRandomCode();
  await writeFile(file, JSON.stringify(manifest));
  await db.student.create({
    data: {
      code,
      name: "Synthetic upload load student",
      year: "LICENCIATURA_1",
      user: {
        create: {
          id,
          zitadelUserId: id,
          email: `${id}@example.test`,
          role: Role.STUDENT,
        },
      },
    },
  });
  return { cookie: cookie(id), code };
}
async function cleanup(data: Manifest) {
  const tickets = await db.cvUpload.findMany({
    where: { ownerId: { in: data.users } },
  });
  // Remove referenced objects only after detaching/deleting synthetic users.
  const profiles = await db.student.findMany({
    where: { id: { in: data.users } },
    select: { cv: true },
  });
  await db.user.deleteMany({ where: { id: { in: data.users } } });
  for (const ticket of tickets) {
    await deleteObject("cv", quarantineCvKey(ticket.id));
    if (ticket.cvId) await deleteObject("cv", cvKey(ticket.cvId));
  }
  for (const profile of profiles)
    if (profile.cv) await deleteObject("cv", cvKey(profile.cv));
  await db.action.deleteMany({ where: { id: data.actionId } });
  await db.company.deleteMany({ where: { id: { in: data.companies } } });
  await db.companyRank.deleteMany({ where: { id: data.rankId } });
  // Attempt destinations from failed/ambiguous finalization are reconciled by
  // the worker; never delete all objects from a bucket to clean one fixture run.
}
async function main() {
  try {
    if (process.argv[2] === "cleanup") {
      await cleanup(JSON.parse(await readFile(file, "utf8")));
      await rm(file);
      await rm(file + ".pdf", { force: true });
    } else {
      // Persist before each provisioning phase so interrupted setup is recoverable.
      await writeFile(file, JSON.stringify(manifest), {
        flag: "wx",
        mode: 0o600,
      });
      try {
        await db.companyRank.create({
          data: { id: manifest.rankId, name: `Synthetic ${manifest.run}` },
        });
        await db.action.create({
          data: {
            id: manifest.actionId,
            name: `Load check-in ${manifest.run}`,
            description: "Synthetic",
            points: 1,
            isLive: true,
            isVisible: false,
          },
        });
        const presenter = randomUUID();
        manifest.users.push(presenter);
        await writeFile(file, JSON.stringify(manifest));
        await db.user.create({
          data: {
            id: presenter,
            zitadelUserId: presenter,
            email: `${presenter}@example.test`,
            adminRole: "ADMIN",
          },
        });
        manifest.actionPresenterCookie = cookie(presenter, false, true);
        for (let i = 0; i < 40; i++) {
          manifest.uploads.push(await student());
          await writeFile(file, JSON.stringify(manifest));
        }
        for (let vu = 0; vu < 4; vu++) {
          const companyId = randomUUID();
          const employeeId = randomUUID();
          manifest.companies.push(companyId);
          manifest.users.push(employeeId);
          await writeFile(file, JSON.stringify(manifest));
          await db.company.create({
            data: {
              id: companyId,
              name: `Load company ${companyId}`,
              rankId: manifest.rankId,
              active: true,
            },
          });
          await db.employee.create({
            data: {
              name: "Synthetic employee",
              company: { connect: { id: companyId } },
              user: {
                create: {
                  id: employeeId,
                  zitadelUserId: employeeId,
                  email: `${employeeId}@example.test`,
                  role: Role.EMPLOYEE,
                },
              },
            },
          });
          const business = {
            employeeCookie: cookie(employeeId, true),
            targets: [] as { cookie: string; code: string }[],
          };
          manifest.business.push(business);
          for (let i = 0; i < 20; i++) {
            business.targets.push(await student());
            await writeFile(file, JSON.stringify(manifest));
          }
        }
        const size = Number(process.env.UPLOAD_SIZE_MIB || 10) * 1024 * 1024;
        const pdf = syntheticPdf(size);
        await writeFile(file + ".pdf", pdf);
        console.log(
          `Prepared ${manifest.uploads.length} upload accounts and 80 unique scan/check-in targets; manifest ${file}`
        );
      } catch (error) {
        await writeFile(file, JSON.stringify(manifest));
        await cleanup(manifest);
        await rm(file);
        throw error;
      }
    }
  } finally {
    await db.$disconnect();
  }
}
void main();
