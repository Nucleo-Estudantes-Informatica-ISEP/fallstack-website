import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

import {
  parseAdminListParams,
  type AdminListSearchParams,
} from "@/lib/adminListParams";
import AdminDeleteButton from "@/components/AdminDeleteButton";
import AdminToggleButton from "@/components/AdminToggleButton";
import DataTable, { type DataTableColumn } from "@/components/DataTable";
import { toAdminStudentDto } from "@/application/dto/studentDto";
import { listStudentsForAdmin } from "@/application/services/studentService";

const PAGE_SIZE = 20;

interface StudentsAdminPageProps {
  searchParams: AdminListSearchParams;
}

type StudentRow = ReturnType<typeof toAdminStudentDto>;

const columns: DataTableColumn<StudentRow>[] = [
  { key: "name", header: "Nome", render: (s) => s.name, sortable: true },
  { key: "code", header: "Código", render: (s) => s.code, sortable: true },
  { key: "year", header: "Ano", render: (s) => s.year, sortable: true },
  { key: "email", header: "Email", render: (s) => s.user.email },
];

const StudentsAdminPage = async ({ searchParams }: StudentsAdminPageProps) => {
  const { page, sort, order, q } = await parseAdminListParams(searchParams);
  const { items, totalCount } = await listStudentsForAdmin({
    page,
    pageSize: PAGE_SIZE,
    sort,
    order,
    search: q,
  });
  const students = items.map(toAdminStudentDto);

  return (
    <section className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Estudantes</h1>
        <Link
          href="/students/new"
          className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Adicionar estudante
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={students}
        rowKey={(student) => student.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        basePath="/students"
        sort={sort ? { key: sort, order } : undefined}
        searchValue={q}
        searchPlaceholder="Pesquisar por nome ou código..."
        renderActions={(student) => (
          <div className="flex items-center gap-3">
            <Link
              href={`/students/${student.id}/edit`}
              aria-label={`Editar ${student.name}`}
              className="hover:text-primary"
            >
              <FiEdit2 size={16} />
            </Link>
            <AdminToggleButton
              checked={student.active}
              label={`Ativar/desativar ${student.name}`}
              patchUrl={`/admin/students/${student.id}`}
              field="active"
            />
            <AdminDeleteButton
              deleteUrl={`/admin/students/${student.id}`}
              itemLabel={student.name}
            />
          </div>
        )}
      />
    </section>
  );
};

export default StudentsAdminPage;
