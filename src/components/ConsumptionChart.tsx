import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from "recharts";
import { useAppState } from "../store/AppContext";
import styles from "./ConsumptionChart.module.css";

// Accessible color palette for chart series
const SERIES_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

// Dark overlay applied to bar on hover — blends with each series color
const HOVER_OVERLAY = "rgba(255,255,255,0.15)";

// Single shared stack ID — all bars stack into one column per month
const STACK_ID = "consumption";

export function ConsumptionChart() {
  const { state } = useAppState();
  const { files, aliases } = state;

  if (files.length === 0) {
    return <p className={styles.empty}>Žádné soubory nejsou načteny.</p>;
  }

  function resolveLabel(id: string): string {
    const alias = aliases.find(a => a.id === id)?.alias.trim();
    return alias || id;
  }

  // Collect all identifiers in stable order
  const allIds = [...new Set(files.flatMap(f => Object.keys(f.consumption)))];

  // Build chart data sorted by yearMonth
  const sortedFiles = [...files].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  const chartData = sortedFiles.map(file => {
    const entry: Record<string, string | number> = { month: file.label };
    for (const id of allIds) {
      entry[id] = file.consumption[id] ?? 0;
    }
    return entry;
  });

  const BAR_ANIMATION_DURATION = 200;
  const ANIMATION_DURATION_PER_BAR = BAR_ANIMATION_DURATION / allIds.length

  return (
    <div className={styles.wrapper}>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          // Dark cursor rectangle on hover instead of the default light-grey one
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            unit=" kWh"
            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            cursor={{ fill: HOVER_OVERLAY }}
            contentStyle={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "0.85rem",
            }}
            labelStyle={{ color: "var(--color-text)", fontWeight: 600, marginBottom: 4 }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(2).replace(".", ",")} kWh`,
              resolveLabel(name),
            ]}
          />
          <Legend
            formatter={resolveLabel}
            wrapperStyle={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}
          />
          {allIds.map((id, i) => (
            <Bar
              key={id}
              dataKey={id}
              name={id}
              stackId={STACK_ID}
              animationDuration={ANIMATION_DURATION_PER_BAR}
              animationEasing={"linear"}
              animationBegin={i * ANIMATION_DURATION_PER_BAR}
              fill={SERIES_COLORS[i % SERIES_COLORS.length]}
              // Only round the top of the topmost bar — recharts rounds each segment otherwise
              radius={i === allIds.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            >
              {/* Cell is required to prevent recharts applying its own hover fill */}
              {chartData.map((_, index) => (
                <Cell key={index} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
