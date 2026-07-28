import type { ActivityEvent } from "@/application/services/adminDashboardService";

interface AdminActivityFeedProps {
  events: ActivityEvent[];
}

// Same categorical slots as AdminWeeklyActivityChart, kept in sync manually
// since each event only ever carries one type (a legend would be redundant
// noise on a list, unlike the chart).
const TYPE_STYLE: Record<
  ActivityEvent["type"],
  { color: string; icon: string }
> = {
  signup: { color: "#2a78d6", icon: "👤" },
  scan: { color: "#eb6834", icon: "📷" },
  save: { color: "#1baf7a", icon: "⭐" },
};

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days}d`;
}

const AdminActivityFeed: React.FC<AdminActivityFeedProps> = ({ events }) => (
  <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <h2 className="mb-4 text-lg font-semibold text-gray-800">
      Atividade recente
    </h2>

    {events.length === 0 ? (
      <p className="text-gray-500">Ainda não há atividade.</p>
    ) : (
      <ul className="flex flex-col gap-3">
        {events.map((event, index) => (
          <li
            key={`${event.type}-${event.timestamp}-${index}`}
            className="flex items-start gap-3 text-sm"
          >
            <span
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs"
              style={{ backgroundColor: `${TYPE_STYLE[event.type].color}1a` }}
              aria-hidden="true"
            >
              {TYPE_STYLE[event.type].icon}
            </span>
            <span className="flex-1 text-gray-700">{event.label}</span>
            <span className="shrink-0 text-gray-400">
              {formatRelativeTime(event.timestamp)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default AdminActivityFeed;
