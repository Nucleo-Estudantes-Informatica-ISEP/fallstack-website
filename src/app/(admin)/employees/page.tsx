import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import AdminToggleButton from "@/components/AdminToggleButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toAdminEmployeeDto } from "@/application/dto/employeeDto";
import { listEmployeesForAdmin } from "@/application/services/employeeService";

const PAGE_SIZE = 20;

interface EmployeesAdminPageProps {
  searchParams: AdminListSearchParams;
}

type EmployeeRow = ReturnType<typeof toAdminEmployeeDto>;

const columns: DataTableColumn<EmployeeRow>[] = [
  { key: "name", header: "Nome", render: (e) => e.name, sortable: true },
  { key: "email", header: "Email", render: (e) => e.email },
  { key: "company", header: "Empresa", render: (e) => e.companyName },
];

const EmployeesAdminPage = async ({
  searchParams,
}: EmployeesAdminPageProps) => {
  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listEmployeesForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });
  const employees = items.map(toAdminEmployeeDto);

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Recrutadores</h1>
        <Link
          href="/employees/new"
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Adicionar recrutador
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={employees}
        rowKey={(employee) => employee.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/employees"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por nome..."
        renderActions={(employee) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/employees/${employee.id}/edit`}
              aria-label={`Editar ${employee.name}`}
              className="hover:text-primary"
            >
              <FiEdit2 size={16} />
            </Link>
            <AdminToggleButton
              checked={employee.active}
              label={`Ativar/desativar ${employee.name}`}
              patchUrl={`/admin/employees/${employee.id}`}
              field="active"
            />
            <AdminDeleteButton
              deleteUrl={`/admin/employees/${employee.id}`}
              itemLabel={employee.name}
            />
          </div>
        )}
      />
    </section>
  );
};

export default EmployeesAdminPage;
