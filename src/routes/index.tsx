import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  loadTickets, type Ticket, type Priority, type Status,
  priorityRank, priorityClass, statusClass, statusLabel,
} from "@/lib/tickets";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertTriangle, Inbox, ShieldAlert, Clock, TrendingUp, Search,
  Mail, Activity, RefreshCw,
} from "lucide-react";
import { CategoryChart, PriorityChart, SentimentChart } from "@/components/dashboard/Charts";
import { TicketDetail } from "@/components/dashboard/TicketDetail";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Customer Experience Ops — Issues & Complaints" },
      { name: "description", content: "AI-powered support ticket triage, sentiment analysis, and operations dashboard." },
    ],
  }),
  component: Dashboard,
});

function Stat({
  label, value, icon: Icon, accent, sub,
}: { label: string; value: string | number; icon: any; accent?: string; sub?: string }) {
  return (
    <Card className="p-4 relative overflow-hidden bg-card/80 backdrop-blur border-border">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
          <div className="text-3xl font-semibold mt-1.5 text-foreground tabular-nums">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: accent ? `${accent} / 0.15` : "var(--accent)" }}
        >
          <Icon className="h-4 w-4" style={{ color: accent ?? "var(--primary)" }} />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setTickets(await loadTickets());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const categories = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.complaint_category).filter(Boolean))).sort(),
    [tickets]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tickets
      .filter((t) => priority === "all" || t.priority === priority)
      .filter((t) => status === "all" || t.current_status === status)
      .filter((t) => category === "all" || t.complaint_category === category)
      .filter((t) => {
        if (!q) return true;
        return (
          t.customer_name?.toLowerCase().includes(q) ||
          t.customer_email?.toLowerCase().includes(q) ||
          t.issue_summary?.toLowerCase().includes(q) ||
          t.complaint_category?.toLowerCase().includes(q) ||
          t.ticket_id?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
  }, [tickets, search, priority, status, category]);

  const stats = useMemo(() => {
    const critical = tickets.filter((t) => t.priority === "Critical").length;
    const high = tickets.filter((t) => t.priority === "High").length;
    const escalated = tickets.filter((t) => t.current_status === "escalated" || t.current_status === "high_risk").length;
    const unresolved = tickets.filter((t) => t.current_status !== "resolved").length;
    const refundRelated = tickets.filter((t) =>
      /refund|chargeback|money.?back/i.test(t.complaint_category + " " + t.issue_summary)
    ).length;
    const churnRisk = tickets.filter((t) =>
      ["High", "Very High"].includes(t.sentiment?.churn_likelihood ?? "")
    ).length;
    return { total: tickets.length, critical, high, escalated, unresolved, refundRelated, churnRisk };
  }, [tickets]);

  const priorityQueue = useMemo(
    () => [...tickets]
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
      .slice(0, 15),
    [tickets]
  );

  const recurringIssues = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tickets) {
      const k = t.complaint_category || "Uncategorized";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tickets]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              <ShieldAlert className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Customer Experience Ops</h1>
              <p className="text-xs text-muted-foreground">Issues &amp; Complaints — AI Triage Console</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-[var(--success)]/30 text-[var(--success)] bg-[var(--success)]/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              Live · Gmail
            </Badge>
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Stat label="Total Tickets" value={stats.total} icon={Inbox} accent="var(--info)" />
          <Stat label="Critical" value={stats.critical} icon={AlertTriangle} accent="var(--critical)" />
          <Stat label="High Priority" value={stats.high} icon={TrendingUp} accent="var(--high)" />
          <Stat label="Escalated" value={stats.escalated} icon={ShieldAlert} accent="var(--critical)" />
          <Stat label="Unresolved" value={stats.unresolved} icon={Clock} accent="var(--warning)" />
          <Stat label="Refund-related" value={stats.refundRelated} icon={Activity} accent="var(--medium)" />
          <Stat label="Churn Risk" value={stats.churnRisk} icon={TrendingUp} accent="var(--critical)" />
        </div>

        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="queue">Priority Queue</TabsTrigger>
            <TabsTrigger value="insights">Operational Insights</TabsTrigger>
          </TabsList>

          {/* TICKETS */}
          <TabsContent value="tickets" className="space-y-4">
            <Card className="p-3 flex flex-wrap items-center gap-2 bg-card/60">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 bg-background"
                  placeholder="Search customer, summary, ticket id…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-[140px] bg-background"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px] bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(["unresolved","partially_resolved","awaiting_internal_action","awaiting_customer_response","escalated","high_risk","resolved"] as Status[]).map(s => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[200px] bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground ml-auto px-2">
                {filtered.length} of {tickets.length}
              </div>
            </Card>

            <Card className="overflow-hidden bg-card/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Ticket</th>
                      <th className="text-left font-medium px-4 py-3">Customer</th>
                      <th className="text-left font-medium px-4 py-3">Category</th>
                      <th className="text-left font-medium px-4 py-3">Priority</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                      <th className="text-left font-medium px-4 py-3">Sentiment</th>
                      <th className="text-left font-medium px-4 py-3">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && tickets.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted-foreground py-12">Loading tickets…</td></tr>
                    )}
                    {!loading && filtered.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted-foreground py-12">No tickets match your filters.</td></tr>
                    )}
                    {filtered.map((t) => (
                      <tr
                        key={t.ticket_id}
                        onClick={() => setActiveTicket(t)}
                        className="border-t border-border hover:bg-accent/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-muted-foreground">{t.ticket_id}</div>
                          <div className="text-xs text-muted-foreground/80 mt-0.5">{t.date_opened}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground line-clamp-1 max-w-[200px]">{t.customer_name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">{t.customer_email}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[260px]">
                          <div className="text-foreground line-clamp-1">{t.complaint_category}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.issue_summary}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={priorityClass(t.priority as Priority)}>
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusClass(t.current_status)}>
                            {statusLabel(t.current_status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="text-foreground/90">{t.sentiment?.frustration_level}</div>
                          <div className="text-muted-foreground">churn: {t.sentiment?.churn_likelihood}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground/80">{t.ownership}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="p-4 bg-card/60">
                <h3 className="text-sm font-semibold mb-2">Priority Distribution</h3>
                <PriorityChart tickets={tickets} />
              </Card>
              <Card className="p-4 bg-card/60">
                <h3 className="text-sm font-semibold mb-2">Customer Frustration</h3>
                <SentimentChart tickets={tickets} />
              </Card>
              <Card className="p-4 bg-card/60 lg:col-span-1">
                <h3 className="text-sm font-semibold mb-2">Top Categories</h3>
                <CategoryChart tickets={tickets} />
              </Card>
            </div>
          </TabsContent>

          {/* PRIORITY QUEUE */}
          <TabsContent value="queue">
            <Card className="bg-card/60 divide-y divide-border">
              {priorityQueue.map((t, i) => (
                <button
                  key={t.ticket_id}
                  onClick={() => setActiveTicket(t)}
                  className="w-full text-left p-4 hover:bg-accent/40 transition-colors flex items-start gap-4"
                >
                  <div className="text-2xl font-semibold text-muted-foreground tabular-nums w-10 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className={priorityClass(t.priority as Priority)}>{t.priority}</Badge>
                      <Badge variant="outline" className={statusClass(t.current_status)}>{statusLabel(t.current_status)}</Badge>
                      <span className="text-xs text-muted-foreground">{t.complaint_category}</span>
                    </div>
                    <div className="font-medium text-foreground">{t.customer_name}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{t.issue_summary}</div>
                  </div>
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              ))}
            </Card>
          </TabsContent>

          {/* INSIGHTS */}
          <TabsContent value="insights" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5 bg-card/60">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Recurring Issue Patterns
                </h3>
                <div className="space-y-2">
                  {recurringIssues.map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="text-sm text-foreground flex-1 truncate">{cat}</div>
                      <div className="h-2 rounded-full bg-muted flex-1 overflow-hidden max-w-[200px]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(count / recurringIssues[0][1]) * 100}%`,
                            background: "var(--gradient-primary)",
                          }}
                        />
                      </div>
                      <div className="text-sm tabular-nums text-muted-foreground w-8 text-right">{count}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 bg-card/60">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[var(--critical)]" /> High-Risk Indicators
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Severe frustration</span>
                    <span className="text-[var(--critical)] font-medium">
                      {tickets.filter(t => t.sentiment?.frustration_level === "Severe").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Very high churn risk</span>
                    <span className="text-[var(--high)] font-medium">
                      {tickets.filter(t => t.sentiment?.churn_likelihood === "Very High").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Legal / refund flags</span>
                    <span className="text-[var(--high)] font-medium">
                      {tickets.filter(t => (t.internal_risk_flags ?? []).some(f =>
                        /legal|lawyer|refund|chargeback/i.test(f))).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Public / PR risk</span>
                    <span className="text-[var(--high)] font-medium">
                      {tickets.filter(t => (t.internal_risk_flags ?? []).some(f =>
                        /pr|social|public|reputation|media/i.test(f))).length}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-5 bg-card/60">
              <h3 className="text-sm font-semibold mb-3">Strategic Recommendations</h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Address the top recurring complaint category — it accounts for the largest share of tickets and likely points to a structural issue.</li>
                <li>Establish a 2-hour SLA acknowledgement for any ticket flagged Critical or High-Risk; route directly to management.</li>
                <li>Build a refund/credit decision matrix so frontline staff can resolve within policy without escalation.</li>
                <li>Review communication templates for tone — many complaints reference perceived dismissiveness.</li>
                <li>Run weekly review of unresolved &gt;72h tickets with the operations lead to prevent churn.</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <TicketDetail ticket={activeTicket} onOpenChange={(o) => !o && setActiveTicket(null)} />
    </div>
  );
}
