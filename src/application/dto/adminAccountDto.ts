export interface AdminAccountDto {
  id: string;
  email: string;
  name: string;
  adminRole: "ADMIN" | "SUPER_ADMIN";
  active: boolean;
}

export const toAdminAccountDto = (admin: {
  id: string;
  email: string;
  name: string | null;
  adminRole: "ADMIN" | "SUPER_ADMIN" | null;
  active: boolean;
}): AdminAccountDto => ({
  id: admin.id,
  email: admin.email,
  name: admin.name ?? "",
  // adminWhere() already filters to adminRole IS NOT NULL - this cast just
  // reflects that narrowing to Prisma's nullable column type.
  adminRole: admin.adminRole as "ADMIN" | "SUPER_ADMIN",
  active: admin.active,
});
