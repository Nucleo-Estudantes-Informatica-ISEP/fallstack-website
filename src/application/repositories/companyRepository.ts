import "server-only";

import { Prisma } from "@prisma/client";

import prisma, { DbClient } from "./database";

export const findCompanyById = (id: string) =>
  prisma.company.findUnique({ where: { id } });

export const findCompanyByCode = (code: string) =>
  prisma.company.findUnique({ where: { code } });

export const findCompanyByName = (name: string) =>
  prisma.company.findUnique({ where: { name } });

export const findCompanies = () =>
  prisma.company.findMany({
    select: { id: true, name: true, avatar: true },
  });

const rosterSelect = {
  id: true,
  name: true,
  avatar: true,
  website: true,
  order: true,
  rank: { include: { style: true } },
  displayStyle: {
    select: { logoWidth: true, logoHeight: true, className: true },
  },
  interests: { select: { name: true } },
  profile: { select: { id: true } },
} satisfies Prisma.CompanySelect;

export const findActiveCompanies = () =>
  prisma.company.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: rosterSelect,
  });

const displaySelect = {
  id: true,
  name: true,
  avatar: true,
  website: true,
  rank: { include: { style: true } },
  profile: true,
  interests: { select: { name: true } },
} satisfies Prisma.CompanySelect;

export const findCompanyDisplayByName = (name: string) =>
  prisma.company.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, active: true },
    select: displaySelect,
  });

const ADMIN_SORTABLE_FIELDS = ["name", "order", "active"] as const;
export type AdminCompanySortField = (typeof ADMIN_SORTABLE_FIELDS)[number];

export interface AdminCompanyQuery {
  page: number;
  pageSize: number;
  sort?: string;
  order: "asc" | "desc";
  search?: string;
}

function companyWhere(search?: string) {
  return search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : undefined;
}

function companyOrderBy(sort: string | undefined, order: "asc" | "desc") {
  const field = ADMIN_SORTABLE_FIELDS.includes(sort as AdminCompanySortField)
    ? (sort as AdminCompanySortField)
    : undefined;
  if (!field)
    return [{ rank: { order: "asc" as const } }, { order: "asc" as const }];
  return { [field]: order };
}

export const countCompaniesForAdmin = (search?: string) =>
  prisma.company.count({ where: companyWhere(search) });

const adminListSelect = {
  id: true,
  name: true,
  avatar: true,
  website: true,
  active: true,
  order: true,
  rank: { select: { id: true, name: true } },
} satisfies Prisma.CompanySelect;

export const findAllCompaniesForAdmin = ({
  page,
  pageSize,
  sort,
  order,
  search,
}: AdminCompanyQuery) =>
  prisma.company.findMany({
    where: companyWhere(search),
    orderBy: companyOrderBy(sort, order),
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: adminListSelect,
  });

// All companies, unpaginated, for the rank board - it needs every company
// visible at once to drag between ranks, not a page at a time.
export const findAllCompaniesForRankBoard = () =>
  prisma.company.findMany({
    orderBy: [{ rank: { order: "asc" } }, { order: "asc" }],
    select: { id: true, name: true, avatar: true, rankId: true, order: true },
  });

export const bulkUpdateCompanyRankBoard = (
  updates: { id: string; rankId: string; order: number }[]
) =>
  prisma.$transaction(
    updates.map(({ id, rankId, order }) =>
      prisma.company.update({ where: { id }, data: { rankId, order } })
    )
  );

export const createCompanyDisplay = (data: {
  name: string;
  rankId: string;
  avatar?: string | null;
  website?: string | null;
  active?: boolean;
  order?: number;
}) => prisma.company.create({ data, select: adminListSelect });

export const updateCompanyDisplay = (
  id: string,
  data: {
    name?: string;
    rankId?: string;
    avatar?: string | null;
    website?: string | null;
    active?: boolean;
    order?: number;
  }
) => prisma.company.update({ where: { id }, data, select: adminListSelect });

export const createCompany = (
  data: { id: string; name: string; rankId: string },
  db: DbClient = prisma
) => db.company.create({ data });

export const updateCompanyAvatar = (
  id: string,
  avatar: string | null,
  db: DbClient = prisma
) => db.company.update({ where: { id }, data: { avatar } });

export const createEmployee = (
  data: {
    id: string;
    name: string;
    linkedin?: string;
    companyId: string;
  },
  db: DbClient = prisma
) => db.employee.create({ data });

export const findCompanyEmployee = (companyId: string) =>
  prisma.employee.findFirst({ where: { companyId } });

export const findCompanyInterests = async (companyId: string) => {
  const employee = await prisma.employee.findFirst({
    where: { companyId },
    include: { user: { include: { interests: true } } },
  });
  return employee?.user.interests.map(({ name }) => name) ?? [];
};

// CompanyProfile/CompanyDisplayStyle/interests are the DB home for the rich
// per-company content that used to live in src/edition/ - see #280. All
// three are 1:1 or m:n companions to Company, edited together from the
// admin company content form.

export const findCompanyWithContent = (id: string) =>
  prisma.company.findUnique({
    where: { id },
    include: {
      rank: { select: { id: true, name: true } },
      profile: true,
      displayStyle: true,
      interests: { select: { id: true, name: true } },
    },
  });

// CompanyProfile.bodyText is required (NOT NULL) - a company either has a
// profile row or none at all (Company.profile is optional). Clearing
// bodyText from the admin form removes the row instead of writing an
// invalid empty one.
export const upsertCompanyProfile = (
  companyId: string,
  data: {
    bodyText: string;
    videoTitle?: string | null;
    videoHref?: string | null;
    socialLinks?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    facts?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  }
) =>
  prisma.companyProfile.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });

export const deleteCompanyProfile = (companyId: string) =>
  prisma.companyProfile.deleteMany({ where: { companyId } });

export const upsertCompanyDisplayStyle = (
  companyId: string,
  data: {
    logoWidth?: number | null;
    logoHeight?: number | null;
    className?: string | null;
  }
) =>
  prisma.companyDisplayStyle.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });

export const setCompanyInterests = (companyId: string, interestIds: string[]) =>
  prisma.company.update({
    where: { id: companyId },
    data: { interests: { set: interestIds.map((id) => ({ id })) } },
  });
