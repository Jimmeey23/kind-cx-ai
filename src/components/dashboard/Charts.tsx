import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";
import type { Ticket } from "@/lib/tickets";
import { daysOpen } from "@/lib/tickets";

function toCounts<T extends string>(arr: T[]): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1);
  return Array.from(m.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

const TOOLTIP_STYLE = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-foreground)",
  fontSize: 12,
  boxShadow: "0 4px 16px -4px rgba(0,0,0,0.12)",
};

export function CategoryChart({ tickets }: { tickets: Ticket[] }) {
  const data = useMemo(
    () => toCounts(tickets.map((t) => t.complaint_category || "Uncategorized")).slice(0, 8),
    [tickets]
  );
  const colors = [
    "#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"
  ];
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" fontSize={10} width={130} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} />
          <Bar dataKey="value" radius={[0, 5, 5, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Bar>
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
    Critical: "#ef4444",
    High: "#f97316",
    Medium: "#f59e0b",
    Low: "#10b981",
  };
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
            {data.map((d) => (
              <Cell key={d.name} fill={colorMap[d.name]} stroke="var(--color-background)" strokeWidth={3} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
            formatter={(val) => <span style={{ color: "var(--color-foreground)" }}>{val}</span>}
          />
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
    Low: "#10b981",
    Medium: "#f59e0b",
    High: "#f97316",
    Severe: "#ef4444",
  };
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, left: 0, right: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} />
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

export function StatusChart({ tickets }: { tickets: Ticket[] }) {
  const statusColors: Record<string, string> = {
    resolved: "#10b981",
    partially_resolved: "#f59e0b",
    awaiting_customer_response: "#3b82f6",
    awaiting_internal_action: "#8b5cf6",
    unresolved: "#f97316",
    escalated: "#ef4444",
    high_risk: "#dc2626",
  };
  const data = useMemo(
    () => toCounts(tickets.map((t) => t.current_status)).map((d) => ({
      ...d,
      name: d.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      rawName: d.name,
    })),
    [tickets]
  );
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
            {data.map((d) => (
              <Cell key={d.rawName} fill={statusColors[d.rawName] ?? "#94a3b8"} stroke="var(--color-background)" strokeWidth={3} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }}
            formatter={(val) => <span style={{ color: "var(--color-foreground)", fontSize: 11 }}>{val}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AgingChart({ tickets }: { tickets: Ticket[] }) {
  const data = useMemo(() => {
    const buckets = { "0–7d": 0, "8–14d": 0, "15–30d": 0, "31–60d": 0, "60d+": 0 };
    for (const t of tickets) {
      const d = daysOpen(t.date_opened);
      if (d <= 7) buckets["0–7d"]++;
      else if (d <= 14) buckets["8–14d"]++;
      else if (d <= 30) buckets["15–30d"]++;
      else if (d <= 60) buckets["31–60d"]++;
      else buckets["60d+"]++;
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [tickets]);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="name" fontSize={11} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis fontSize={11} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#ageGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChurnRiskChart({ tickets }: { tickets: Ticket[] }) {
  const order = ["Low", "Medium", "High", "Very High"];
  const data = useMemo(() => {
    const counts = toCounts(tickets.map((t) => t.sentiment?.churn_likelihood ?? "Low"));
    return order.map((o) => counts.find((c) => c.name === o) ?? { name: o, value: 0 });
  }, [tickets]);
  const colors = ["#10b981", "#f59e0b", "#f97316", "#ef4444"];
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, left: 0, right: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis dataKey="name" fontSize={11} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis fontSize={11} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OwnershipChart({ tickets }: { tickets: Ticket[] }) {
  const data = useMemo(
    () => toCounts(tickets.map((t) => {
      const o = t.ownership || "Unassigned";
      return o.length > 28 ? o.slice(0, 26) + "…" : o;
    })).slice(0, 7),
    [tickets]
  );
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis type="number" fontSize={11} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" fontSize={10} width={145} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} />
          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 5, 5, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
