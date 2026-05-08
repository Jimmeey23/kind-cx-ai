import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend
} from "recharts";
import type { Ticket } from "@/lib/tickets";

const COLORS = [
  "oklch(0.72 0.18 250)",
  "oklch(0.65 0.24 25)",
  "oklch(0.78 0.15 85)",
  "oklch(0.72 0.16 160)",
  "oklch(0.55 0.22 285)",
  "oklch(0.72 0.20 45)",
  "oklch(0.65 0.18 320)",
  "oklch(0.75 0.16 200)",
];

function toCounts<T extends string>(arr: T[]): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1);
  return Array.from(m.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function CategoryChart({ tickets }: { tickets: Ticket[] }) {
  const data = useMemo(
    () => toCounts(tickets.map((t) => t.complaint_category || "Uncategorized")).slice(0, 8),
    [tickets]
  );
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={140} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
            cursor={{ fill: "var(--accent)" }}
          />
          <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriorityChart({ tickets }: { tickets: Ticket[] }) {
  const order = ["Critical", "High", "Medium", "Low"];
  const data = useMemo(() => {
    const counts = toCounts(tickets.map((t) => t.priority));
    return order
      .map((o) => counts.find((c) => c.name === o) ?? { name: o, value: 0 })
      .filter((d) => d.value > 0);
  }, [tickets]);
  const colorMap: Record<string, string> = {
    Critical: "var(--critical)",
    High: "var(--high)",
    Medium: "var(--medium)",
    Low: "var(--low)",
  };
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={colorMap[d.name]} stroke="var(--background)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SentimentChart({ tickets }: { tickets: Ticket[] }) {
  const order = ["Low", "Medium", "High", "Severe"];
  const data = useMemo(() => {
    const counts = toCounts(tickets.map((t) => t.sentiment?.frustration_level ?? "Low"));
    return order.map((o) => counts.find((c) => c.name === o) ?? { name: o, value: 0 });
  }, [tickets]);
  const colorMap: Record<string, string> = {
    Low: "var(--success)",
    Medium: "var(--medium)",
    High: "var(--high)",
    Severe: "var(--critical)",
  };
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
            cursor={{ fill: "var(--accent)" }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={colorMap[d.name]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { COLORS };
