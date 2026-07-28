import type { DailyActivity } from "@/application/services/adminDashboardService";

interface AdminWeeklyActivityChartProps {
  data: DailyActivity[];
}

// Categorical slots 1-3 from the design system's validated palette (see the
// dataviz skill) - the only three that clear the CVD/normal-vision floors
// under all-pairs comparison in both modes, which is exactly the 3-series
// case here.
const SERIES = [
  { key: "signups" as const, label: "Inscrições", color: "#2a78d6" },
  { key: "scans" as const, label: "Scans", color: "#eb6834" },
  { key: "saves" as const, label: "Guardados", color: "#1baf7a" },
];

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const BAR_WIDTH = 10;
const BAR_GAP = 2;
const GROUP_GAP = 14;
const GROUP_WIDTH = SERIES.length * BAR_WIDTH + (SERIES.length - 1) * BAR_GAP;
const CHART_HEIGHT = 120;
const LABEL_HEIGHT = 20;
const RADIUS = 3;

// Exported for its own unit test (index.test.ts) - the geometry is easy to
// get subtly wrong (degenerate zero-height bars, radius bigger than the bar)
// and worth a real regression guard rather than one-off manual checking.
export function roundedTopBarPath(
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (height <= 0) return null;
  const r = Math.min(RADIUS, width / 2, height);
  const top = y + CHART_HEIGHT - height;
  const bottom = y + CHART_HEIGHT;
  return `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${bottom} Z`;
}

// A colored bar chart alone leaves the low-contrast slot (aqua "Guardados")
// hard to read for low-vision users - this table is the "table view exists"
// mitigation, not a decorative afterthought, and doubles as the exact
// figures the chart deliberately doesn't label point-by-point.
const AdminWeeklyActivityChart: React.FC<AdminWeeklyActivityChartProps> = ({
  data,
}) => {
  const max = Math.max(1, ...data.flatMap((d) => SERIES.map((s) => d[s.key])));
  // data.length - 1 goes negative for an empty array, producing an invalid
  // (negative-width) viewBox - Math.max(1, ...) keeps the SVG well-formed
  // even with no data, rather than rendering unpredictably.
  const totalWidth = Math.max(
    1,
    data.length * GROUP_WIDTH + (data.length - 1) * GROUP_GAP
  );
  const totalHeight = CHART_HEIGHT + LABEL_HEIGHT;

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          Atividade dos últimos 7 dias
        </h2>
        <ul className="flex items-center gap-4 text-sm text-gray-600">
          {SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: series.color }}
              />
              {series.label}
            </li>
          ))}
        </ul>
      </div>

      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        // Explicit intrinsic width/height (not just viewBox) is what lets
        // the browser derive the aspect ratio for "w-full h-auto" sizing -
        // without them, browsers fall back to inconsistent default sizing
        // for a percentage-width/auto-height SVG, which is what was
        // stretching this chart to the wrong scale. The inline aspectRatio
        // is a second, CSS-only safeguard that doesn't depend on that
        // inference at all.
        width={totalWidth}
        height={totalHeight}
        style={{ aspectRatio: `${totalWidth} / ${totalHeight}` }}
        className="h-auto w-full"
        role="img"
        aria-label="Gráfico de barras com inscrições, scans e estudantes guardados por dia, nos últimos 7 dias"
      >
        <line
          x1={0}
          y1={CHART_HEIGHT}
          x2={totalWidth}
          y2={CHART_HEIGHT}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        {data.map((day, dayIndex) => {
          const groupX = dayIndex * (GROUP_WIDTH + GROUP_GAP);
          const weekday = WEEKDAY_LABELS[new Date(day.date).getUTCDay()];
          return (
            <g key={day.date}>
              {SERIES.map((series, seriesIndex) => {
                const value = day[series.key];
                const height = (value / max) * (CHART_HEIGHT - 8);
                const x = groupX + seriesIndex * (BAR_WIDTH + BAR_GAP);
                const path = roundedTopBarPath(x, 0, BAR_WIDTH, height);
                return path ? (
                  <path key={series.key} d={path} fill={series.color} />
                ) : null;
              })}
              <text
                x={groupX + GROUP_WIDTH / 2}
                y={CHART_HEIGHT + 14}
                textAnchor="middle"
                className="fill-gray-500"
                fontSize={9}
              >
                {weekday}
              </text>
            </g>
          );
        })}
      </svg>

      <details className="mt-4 text-sm text-gray-600">
        <summary className="cursor-pointer select-none">
          Ver como tabela
        </summary>
        <table className="mt-2 w-full border-collapse text-left">
          <caption className="sr-only">
            Atividade diária dos últimos 7 dias, em números
          </caption>
          <thead className="text-xs tracking-wider text-gray-400 uppercase">
            <tr>
              <th className="py-1 pr-4">Dia</th>
              {SERIES.map((series) => (
                <th key={series.key} className="py-1 pr-4">
                  {series.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((day) => (
              <tr key={day.date} className="border-t border-gray-100">
                <td className="py-1 pr-4">{day.date}</td>
                {SERIES.map((series) => (
                  <td key={series.key} className="py-1 pr-4">
                    {day[series.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
};

export default AdminWeeklyActivityChart;
