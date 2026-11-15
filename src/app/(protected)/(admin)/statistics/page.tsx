import { getSavedStudentCountsByCompany } from "@/application/services/savedStudentService";
import { getStudentCount } from "@/application/services/studentService";

const StatisticsPage = async () => {
  const [studentCount, savedByCompany] = await Promise.all([
    getStudentCount(),
    getSavedStudentCountsByCompany(),
  ]);

  return (
    <section className="flex flex-col gap-8 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Estatísticas</h1>

      <div className="w-fit rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Estudantes inscritos</p>
        <p className="text-4xl font-bold text-gray-800">{studentCount}</p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Estudantes guardados por empresa
        </h2>
        {savedByCompany.length === 0 ? (
          <p className="text-gray-500">Ainda não há dados.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-md">
            <table className="min-w-full table-auto border-collapse">
              <thead className="bg-gray-200 text-sm text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Empresa</th>
                  <th className="px-6 py-3 text-left">Guardados</th>
                </tr>
              </thead>
              <tbody className="text-base text-gray-600">
                {savedByCompany.map((row) => (
                  <tr
                    key={row.companyId}
                    className="border-b transition-colors hover:bg-gray-100"
                  >
                    <td className="px-6 py-4">{row.companyName}</td>
                    <td className="px-6 py-4">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default StatisticsPage;
