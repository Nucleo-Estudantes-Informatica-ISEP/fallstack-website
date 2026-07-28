export interface AdminListParams {
  page: number;
  sort?: string;
  order: "asc" | "desc";
  q?: string;
}

export type AdminListSearchParams = Promise<{
  page?: string;
  sort?: string;
  order?: string;
  q?: string;
}>;

export async function parseAdminListParams(
  searchParams: AdminListSearchParams
): Promise<AdminListParams> {
  const resolved = await searchParams;
  const page = Math.max(1, Number(resolved.page) || 1);
  const order = resolved.order === "desc" ? "desc" : "asc";
  return {
    page,
    sort: resolved.sort || undefined,
    order,
    q: resolved.q || undefined,
  };
}
