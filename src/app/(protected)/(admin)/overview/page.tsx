import AdminActivityFeed from "@/components/AdminActivityFeed";
import AdminStatTile from "@/components/AdminStatTile";
import AdminWeeklyActivityChart from "@/components/AdminWeeklyActivityChart";
import { getAdminDashboardSummary } from "@/application/services/adminDashboardService";

const OverviewPage = async () => {
  const summary = await getAdminDashboardSummary();

  const tiles = [
    { label: "Estudantes", value: summary.studentCount },
    { label: "Empresas", value: summary.companyCount },
    { label: "Recrutadores", value: summary.employeeCount },
    { label: "Ações completadas", value: summary.actionCompletionCount },
    { label: "Estudantes guardados", value: summary.savedStudentCount },
  ];

  return (
    <section className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((tile) => (
          <AdminStatTile key={tile.label} {...tile} />
        ))}
      </div>

      <AdminWeeklyActivityChart data={summary.weeklyActivity} />

      <AdminActivityFeed events={summary.recentActivity} />
    </section>
  );
};

export default OverviewPage;
