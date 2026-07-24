import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartSpec {
  type?: "bar" | "line" | "pie";
  title?: string;
  labels?: string[];
  values?: number[];
  datasets?: Array<{ label?: string; values?: number[] }>;
  colors?: string[];
}

const DEFAULT_COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#fb7185"];

function parseChartSpec(raw: string): ChartSpec | null {
  try {
    const parsed = JSON.parse(raw) as ChartSpec;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function toRows(spec: ChartSpec): Array<{ name: string; value: number }> {
  const labels = spec.labels ?? [];
  const values = spec.values ?? spec.datasets?.[0]?.values ?? [];
  return labels.map((name, i) => ({
    name,
    value: typeof values[i] === "number" ? values[i]! : 0,
  }));
}

export default function MarkdownChartBlock({ specText }: { specText: string }) {
  const spec = parseChartSpec(specText);
  if (!spec) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
        {specText}
      </pre>
    );
  }

  const rows = toRows(spec);
  if (rows.length === 0) return null;

  const colors = spec.colors ?? DEFAULT_COLORS;
  const chartType = spec.type ?? "bar";

  return (
    <div className="office-markdown-chart my-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {spec.title ? (
        <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">{spec.title}</p>
      ) : null}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={false} />
            </LineChart>
          ) : chartType === "pie" ? (
            <PieChart>
              <Pie data={rows} dataKey="value" nameKey="name" outerRadius={80} label>
                {rows.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : (
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
