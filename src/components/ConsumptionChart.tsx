import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { useAppState } from "../store/AppContext";
import styles from "./ConsumptionChart.module.css";

// Accessible color palette for chart series
const SERIES_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

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

  return (
    <div className={styles.wrapper}>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
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
              fill={SERIES_COLORS[i % SERIES_COLORS.length]}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
