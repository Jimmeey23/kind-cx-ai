import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadTickets, type Ticket, type Priority, type Status, type SortField, type SortDir,
  priorityRank, priorityClass, statusClass, statusLabel, statusDotColor,
  ALL_STATUSES, ALL_PRIORITIES, KNOWN_OWNERS, formatDate, daysOpen,
} from "@/lib/tickets";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, Inbox, ShieldAlert, Clock, TrendingUp, Search,
  Activity, RefreshCw, LayoutList, Columns3, Group,
  ChevronUp, ChevronDown, ChevronsUpDown, Download, CheckSquare,
  X, Filter, BarChart3, Timer, Moon, Sun,
  Zap,
} from "lucide-react";
import {
  CategoryChart, PriorityChart, SentimentChart, StatusChart,
  AgingChart, ChurnRiskChart, OwnershipChart,
} from "@/components/dashboard/Charts";
import { TicketDetail } from "@/components/dashboard/TicketDetail";
import { KanbanView } from "@/components/dashboard/KanbanView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CX Ops — AI Triage Console" },
      { name: "description", content: "AI-powered support ticket triage and operations dashboard." },
    ],
  }),
  component: Dashboard,
});

type ViewMode = "table" | "kanban" | "groups" | "overview";
type GroupBy = "category" | "status" | "priority" | "owner";

const TH_CLASS = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none";
const TH_SORT_CLASS = `${TH_CLASS} cursor-pointer hover:text-foreground transition-colors group`;

function SortIcon({ field, sort }: { field: SortField; sort: { field: SortField; dir: SortDir } }) {
  if (sort.field !== field) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />;
  return sort.dir === "asc"
    ? <ChevronUp className="h-3 w-3 text-primary" />
    : <ChevronDown className="h-3 w-3 text-primary" />;
}

function ThSort({ field, sort, onSort, children }: {
  field: SortField;
  sort: { field: SortField; dir: SortDir };
  onSort: (f: SortField) => void;
  children: React.ReactNode;
}) {
  return (
    <th className={TH_SORT_CLASS} onClick={() => onSort(field)}>
      <span className="flex items-center gap-1">
        {children}
        <SortIcon field={field} sort={sort} />
      </span>
    </th>
  );
}

function StatCard({
  label, value, icon: Icon, sub, colorClass, trend,
}: {
  label: string; value: string | number; icon: any;
  sub?: string; colorClass?: string; trend?: string;
}) {
  return (
    <Card className="p-4 bg-white dark:bg-card border-border/60 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">{label}</div>
          <div className={`text-2xl font-bold tabular-nums ${colorClass ?? "text-foreground"}`}>{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
          {trend && <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">{trend}</div>}
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass ? "bg-current/10" : "bg-muted"}`}
          style={{ background: colorClass ? undefined : undefined }}>
          <Icon className={`h-4 w-4 ${colorClass ?? "text-muted-foreground"}`} />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("table");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterSentiment, setFilterSentiment] = useState<string>("all");
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: "priority", dir: "desc" });
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkOwner, setBulkOwner] = useState<string>("");
  const [darkMode, setDarkMode] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await loadTickets();
      setTickets((prev) => {
        // Preserve local overrides when refreshing
        const overrideMap = new Map(prev.map((t) => [t.ticket_id, t]));
        return raw.map((t) => {
          const existing = overrideMap.get(t.ticket_id);
          if (!existing) return t;
          return {
            ...t,
            _localStatus: existing._localStatus,
            _localPriority: existing._localPriority,
            _localOwner: existing._localOwner,
            _localNotes: existing._localNotes,
            _localTags: existing._localTags,
          };
        });
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function updateTicket(id: string, changes: Partial<Ticket>) {
    setTickets((prev) => prev.map((t) => t.ticket_id === id ? { ...t, ...changes } : t));
    if (activeTicket?.ticket_id === id) {
      setActiveTicket((prev) => prev ? { ...prev, ...changes } : prev);
    }
  }

  const categories = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.complaint_category).filter(Boolean))).sort(),
    [tickets]
  );

  const owners = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.ownership).filter(Boolean))).sort(),
    [tickets]
  );

  function toggleSort(field: SortField) {
    setSort((s) => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let arr = tickets
      .filter((t) => filterPriority === "all" || (t._localPriority ?? t.priority) === filterPriority)
      .filter((t) => filterStatus === "all" || (t._localStatus ?? t.current_status) === filterStatus)
      .filter((t) => filterCategory === "all" || t.complaint_category === filterCategory)
      .filter((t) => filterOwner === "all" || (t._localOwner ?? t.ownership) === filterOwner)
      .filter((t) => filterSentiment === "all" || t.sentiment?.frustration_level === filterSentiment)
      .filter((t) => {
        if (!q) return true;
        return (
          t.customer_name?.toLowerCase().includes(q) ||
          t.customer_email?.toLowerCase().includes(q) ||
          t.issue_summary?.toLowerCase().includes(q) ||
          t.complaint_category?.toLowerCase().includes(q) ||
          t.complaint_subcategory?.toLowerCase().includes(q) ||
          t.ticket_id?.toLowerCase().includes(q) ||
          t.ownership?.toLowerCase().includes(q) ||
          (t._localTags ?? []).some((tag) => tag.toLowerCase().includes(q))
        );
      });

    arr.sort((a, b) => {
      let va: any, vb: any;
      switch (sort.field) {
        case "priority":
          va = priorityRank(a._localPriority ?? a.priority);
          vb = priorityRank(b._localPriority ?? b.priority);
          break;
        case "date_opened":
          va = new Date(a.date_opened).getTime();
          vb = new Date(b.date_opened).getTime();
          break;
        case "last_response_date":
          va = new Date(a.last_response_date).getTime();
          vb = new Date(b.last_response_date).getTime();
          break;
        case "customer_name":
          va = a.customer_name?.toLowerCase();
          vb = b.customer_name?.toLowerCase();
          break;
        case "complaint_category":
          va = a.complaint_category?.toLowerCase();
          vb = b.complaint_category?.toLowerCase();
          break;
        case "current_status":
          va = (a._localStatus ?? a.current_status);
          vb = (b._localStatus ?? b.current_status);
          break;
        default:
          va = 0; vb = 0;
      }
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [tickets, search, filterPriority, filterStatus, filterCategory, filterOwner, filterSentiment, sort]);

  const stats = useMemo(() => {
    const critical = tickets.filter((t) => (t._localPriority ?? t.priority) === "Critical").length;
    const high = tickets.filter((t) => (t._localPriority ?? t.priority) === "High").length;
    const escalated = tickets.filter((t) => ["escalated", "high_risk"].includes(t._localStatus ?? t.current_status)).length;
    const unresolved = tickets.filter((t) => (t._localStatus ?? t.current_status) !== "resolved").length;
    const resolved = tickets.filter((t) => (t._localStatus ?? t.current_status) === "resolved").length;
    const churnRisk = tickets.filter((t) => ["High", "Very High"].includes(t.sentiment?.churn_likelihood ?? "")).length;
    const avgDays = tickets.length
      ? Math.round(tickets.reduce((s, t) => s + daysOpen(t.date_opened), 0) / tickets.length)
      : 0;
    return { total: tickets.length, critical, high, escalated, unresolved, resolved, churnRisk, avgDays };
  }, [tickets]);

  // Grouped view
  const groups = useMemo(() => {
    const keyFn = (t: Ticket): string => {
      switch (groupBy) {
        case "status": return statusLabel(t._localStatus ?? t.current_status);
        case "priority": return t._localPriority ?? t.priority;
        case "owner": return t._localOwner ?? t.ownership ?? "Unassigned";
        default: return t.complaint_category || "Uncategorized";
      }
    };
    const m = new Map<string, Ticket[]>();
    for (const t of filtered) {
      const k = keyFn(t);
      const arr = m.get(k) ?? [];
      arr.push(t);
      m.set(k, arr);
    }
    return Array.from(m.entries())
      .map(([key, list]) => {
        const counts = Object.fromEntries(ALL_PRIORITIES.map((p) => [p, 0])) as Record<Priority, number>;
        for (const t of list) counts[(t._localPriority ?? t.priority) as Priority] = (counts[(t._localPriority ?? t.priority) as Priority] ?? 0) + 1;
        return { key, tickets: list, counts };
      })
      .sort((a, b) => b.tickets.length - a.tickets.length);
  }, [filtered, groupBy]);

  // Bulk actions
  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.ticket_id));
  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.ticket_id)));
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function applyBulkStatus() {
    if (!bulkStatus || bulkStatus === "all") return;
    selected.forEach((id) => updateTicket(id, { _localStatus: bulkStatus as Status }));
    setSelected(new Set()); setBulkStatus("");
  }
  function applyBulkOwner() {
    if (!bulkOwner || bulkOwner === "all") return;
    selected.forEach((id) => updateTicket(id, { _localOwner: bulkOwner }));
    setSelected(new Set()); setBulkOwner("");
  }

  // CSV export
  function exportCSV() {
    const cols = ["ticket_id","customer_name","customer_email","date_opened","last_response_date","complaint_category","complaint_subcategory","priority","current_status","ownership","sentiment_frustration","sentiment_churn","sla_classification","sla_aging","issue_summary"];
    const rows = filtered.map((t) => cols.map((c) => {
      const v =
        c === "priority" ? (t._localPriority ?? t.priority) :
        c === "current_status" ? (t._localStatus ?? t.current_status) :
        c === "ownership" ? (t._localOwner ?? t.ownership) :
        c === "sentiment_frustration" ? t.sentiment?.frustration_level :
        c === "sentiment_churn" ? t.sentiment?.churn_likelihood :
        (t as any)[c] ?? "";
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(","));
    const csv = [cols.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `cx-tickets-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const activeFilterCount = [
    filterPriority !== "all", filterStatus !== "all",
    filterCategory !== "all", filterOwner !== "all", filterSentiment !== "all",
  ].filter(Boolean).length;

  function clearFilters() {
    setFilterPriority("all"); setFilterStatus("all");
    setFilterCategory("all"); setFilterOwner("all"); setFilterSentiment("all");
    setSearch("");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-white/90 dark:bg-background/90 backdrop-blur-xl shadow-sm">
        <div className="max-w-[1700px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
              <ShieldAlert className="h-4.5 w-4.5 text-white" style={{ height: 18, width: 18 }} />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-foreground">Customer Experience Ops</h1>
              <p className="text-xs text-muted-foreground">Issues & Complaints — AI Triage Console</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/30 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live · Gmail Sync
            </Badge>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Syncing…" : "Refresh"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-5 py-5 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Total" value={stats.total} icon={Inbox} colorClass="text-indigo-600 dark:text-indigo-400" />
          <StatCard label="Critical" value={stats.critical} icon={AlertTriangle} colorClass="text-red-600 dark:text-red-400" />
          <StatCard label="High Priority" value={stats.high} icon={TrendingUp} colorClass="text-orange-600 dark:text-orange-400" />
          <StatCard label="Escalated" value={stats.escalated} icon={ShieldAlert} colorClass="text-red-700 dark:text-red-400" />
          <StatCard label="Unresolved" value={stats.unresolved} icon={Clock} colorClass="text-amber-600 dark:text-amber-400" />
          <StatCard label="Resolved" value={stats.resolved} icon={Activity} colorClass="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Churn Risk" value={stats.churnRisk} icon={TrendingUp} colorClass="text-rose-600 dark:text-rose-400" />
          <StatCard label="Avg Age" value={`${stats.avgDays}d`} icon={Timer} colorClass="text-slate-600 dark:text-slate-400" />
        </div>

        {/* View selector + search + filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View buttons */}
          <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50">
            {([
              { v: "table", icon: LayoutList, label: "Table" },
              { v: "kanban", icon: Columns3, label: "Kanban" },
              { v: "groups", icon: Group, label: "Groups" },
              { v: "overview", icon: BarChart3, label: "Overview" },
            ] as { v: ViewMode; icon: any; label: string }[]).map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === v
                    ? "bg-white dark:bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {view === "groups" && (
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="h-8 text-xs w-[160px] bg-background">
                <SelectValue placeholder="Group by…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category" className="text-xs">By Category</SelectItem>
                <SelectItem value="status" className="text-xs">By Status</SelectItem>
                <SelectItem value="priority" className="text-xs">By Priority</SelectItem>
                <SelectItem value="owner" className="text-xs">By Owner</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-xs bg-background"
              placeholder="Search tickets, customers, categories, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            size="sm"
            variant={filtersOpen || activeFilterCount > 0 ? "default" : "outline"}
            className="h-8 text-xs gap-1.5"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-white/25 text-white dark:bg-black/20 rounded-full px-1.5 py-0 text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground tabular-nums">
            {filtered.length} / {tickets.length} tickets
          </div>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <Card className="p-3 bg-muted/30 border-border/60 flex flex-wrap gap-2 items-center">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-7 text-xs w-[130px] bg-background"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
                {ALL_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-7 text-xs w-[170px] bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                {ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{statusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-7 text-xs w-[180px] bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="h-7 text-xs w-[200px] bg-background"><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Owners</SelectItem>
                {owners.map((o) => <SelectItem key={o} value={o} className="text-xs truncate">{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSentiment} onValueChange={setFilterSentiment}>
              <SelectTrigger className="h-7 text-xs w-[150px] bg-background"><SelectValue placeholder="Frustration" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Sentiments</SelectItem>
                {["Low","Medium","High","Severe"].map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Card>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <Card className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              <CheckSquare className="h-4 w-4" />
              {selected.size} selected
            </div>
            <Separator orientation="vertical" className="h-4 bg-indigo-200 dark:bg-indigo-800" />
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="h-7 text-xs w-[160px] bg-white dark:bg-card border-indigo-200 dark:border-indigo-800">
                <SelectValue placeholder="Change status…" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{statusLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs" onClick={applyBulkStatus} disabled={!bulkStatus}>
              Apply Status
            </Button>
            <Separator orientation="vertical" className="h-4 bg-indigo-200 dark:bg-indigo-800" />
            <Select value={bulkOwner} onValueChange={setBulkOwner}>
              <SelectTrigger className="h-7 text-xs w-[200px] bg-white dark:bg-card border-indigo-200 dark:border-indigo-800">
                <SelectValue placeholder="Reassign to…" />
              </SelectTrigger>
              <SelectContent>
                {KNOWN_OWNERS.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs" onClick={applyBulkOwner} disabled={!bulkOwner}>
              Reassign
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto text-muted-foreground" onClick={() => setSelected(new Set())}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </Card>
        )}

        {/* ── TABLE VIEW ── */}
        {view === "table" && (
          <Card className="overflow-hidden border-border/60 bg-white dark:bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="bg-muted/40 border-b border-border/60">
                  <tr>
                    <th className="px-3 py-2.5 w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                    </th>
                    <th className={TH_CLASS}>Ticket ID</th>
                    <ThSort field="date_opened" sort={sort} onSort={toggleSort}>Date</ThSort>
                    <ThSort field="customer_name" sort={sort} onSort={toggleSort}>Customer</ThSort>
                    <ThSort field="complaint_category" sort={sort} onSort={toggleSort}>Category</ThSort>
                    <ThSort field="priority" sort={sort} onSort={toggleSort}>Priority</ThSort>
                    <ThSort field="current_status" sort={sort} onSort={toggleSort}>Status</ThSort>
                    <th className={TH_CLASS}>Sentiment</th>
                    <th className={TH_CLASS}>Age</th>
                    <ThSort field="last_response_date" sort={sort} onSort={toggleSort}>Last Response</ThSort>
                    <th className={TH_CLASS}>SLA</th>
                    <th className={TH_CLASS}>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && tickets.length === 0 && (
                    <tr>
                      <td colSpan={12} className="text-center text-muted-foreground py-16 text-sm">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground/50" />
                        Loading tickets…
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={12} className="text-center text-muted-foreground py-16 text-sm">
                        No tickets match your filters.
                        {activeFilterCount > 0 && (
                          <button onClick={clearFilters} className="ml-2 text-primary hover:underline">Clear filters</button>
                        )}
                      </td>
                    </tr>
                  )}
                  {filtered.map((t) => {
                    const p = (t._localPriority ?? t.priority) as Priority;
                    const s = (t._localStatus ?? t.current_status) as Status;
                    const o = t._localOwner ?? t.ownership;
                    const days = daysOpen(t.date_opened);
                    const isSelected = selected.has(t.ticket_id);
                    return (
                      <tr
                        key={t.ticket_id}
                        className={`border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer ${isSelected ? "bg-indigo-50/60 dark:bg-indigo-950/20" : ""}`}
                      >
                        <td className="px-3 py-2.5" onClick={(e) => { e.stopPropagation(); toggleSelect(t.ticket_id); }}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(t.ticket_id)} />
                        </td>
                        <td className="px-3 py-2.5" onClick={() => setActiveTicket(t)}>
                          <code className="text-[11px] text-muted-foreground font-mono">{t.ticket_id}</code>
                          {(t._localNotes?.length ?? 0) > 0 && (
                            <span className="ml-1.5 text-[10px] bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-1.5 py-0 rounded-full">
                              {t._localNotes!.length} note{t._localNotes!.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          {(t._localTags?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              {t._localTags!.map((tag) => (
                                <span key={tag} className="text-[9px] px-1 py-0 rounded bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5" onClick={() => setActiveTicket(t)}>
                          <div className="text-xs text-foreground font-medium">{formatDate(t.date_opened)}</div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[180px]" onClick={() => setActiveTicket(t)}>
                          <div className="font-medium text-foreground text-xs truncate">{t.customer_name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{t.customer_email}</div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[220px]" onClick={() => setActiveTicket(t)}>
                          <div className="text-xs font-medium text-foreground line-clamp-1">{t.complaint_category}</div>
                          {t.complaint_subcategory && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1">{t.complaint_subcategory}</div>
                          )}
                          <div className="text-[11px] text-muted-foreground/70 line-clamp-1 mt-0.5">{t.issue_summary}</div>
                        </td>
                        <td className="px-3 py-2.5" onClick={() => setActiveTicket(t)}>
                          <Badge variant="outline" className={`${priorityClass(p)} text-[11px] px-2 py-0`}>{p}</Badge>
                        </td>
                        <td className="px-3 py-2.5" onClick={() => setActiveTicket(t)}>
                          <Badge variant="outline" className={`${statusClass(s)} text-[11px] px-2 py-0 flex items-center gap-1 w-fit`}>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDotColor(s)}`} />
                            {statusLabel(s)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5" onClick={() => setActiveTicket(t)}>
                          <div className="text-xs text-foreground/80">{t.sentiment?.frustration_level}</div>
                          <div className="text-[11px] text-muted-foreground">churn: {t.sentiment?.churn_likelihood}</div>
                        </td>
                        <td className="px-3 py-2.5" onClick={() => setActiveTicket(t)}>
                          <span className={`text-xs font-medium tabular-nums ${days > 30 ? "text-red-600 dark:text-red-400" : days > 14 ? "text-amber-600 dark:text-amber-400" : "text-foreground/70"}`}>
                            {days}d
                          </span>
                        </td>
                        <td className="px-3 py-2.5" onClick={() => setActiveTicket(t)}>
                          <div className="text-xs text-foreground/80">{formatDate(t.last_response_date)}</div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[120px]" onClick={() => setActiveTicket(t)}>
                          <div className="text-[11px] text-muted-foreground line-clamp-2">{t.sla_classification}</div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[160px]" onClick={() => setActiveTicket(t)}>
                          <div className="text-[11px] text-foreground/80 line-clamp-2">{o}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
              <span>Showing {filtered.length} of {tickets.length} tickets</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1.5 text-muted-foreground" onClick={exportCSV}>
                <Download className="h-3 w-3" /> Export CSV
              </Button>
            </div>
          </Card>
        )}

        {/* ── KANBAN VIEW ── */}
        {view === "kanban" && (
          <KanbanView
            tickets={filtered}
            onSelect={setActiveTicket}
            onStatusChange={(id, s) => updateTicket(id, { _localStatus: s })}
          />
        )}

        {/* ── GROUPS VIEW ── */}
        {view === "groups" && (
          <div className="space-y-3">
            {groups.length === 0 && (
              <Card className="p-12 text-center text-muted-foreground text-sm bg-white dark:bg-card">
                No tickets match current filters.
              </Card>
            )}
            {groups.map((g) => (
              <Card key={g.key} className="overflow-hidden border-border/60 bg-white dark:bg-card shadow-sm">
                <div className="px-4 py-3 border-b border-border/50 bg-muted/30 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-foreground">{g.key}</h3>
                    <Badge variant="outline" className="bg-background text-muted-foreground text-[11px] px-2 py-0">
                      {g.tickets.length} tickets
                    </Badge>
                  </div>
                  <div className="flex gap-1.5">
                    {(["Critical","High","Medium","Low"] as Priority[]).map((p) =>
                      g.counts[p] ? (
                        <Badge key={p} variant="outline" className={`${priorityClass(p)} text-[10px] px-1.5 py-0`}>
                          {p[0]}: {g.counts[p]}
                        </Badge>
                      ) : null
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {g.tickets.slice(0, 10).map((t) => {
                        const p = (t._localPriority ?? t.priority) as Priority;
                        const s = (t._localStatus ?? t.current_status) as Status;
                        return (
                          <tr
                            key={t.ticket_id}
                            onClick={() => setActiveTicket(t)}
                            className="border-b border-border/30 last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-2.5 w-[130px]">
                              <code className="text-[11px] text-muted-foreground font-mono">{t.ticket_id}</code>
                              <div className="text-[10px] text-muted-foreground/60">{formatDate(t.date_opened)}</div>
                            </td>
                            <td className="px-3 py-2.5 max-w-[180px]">
                              <div className="text-xs font-medium text-foreground truncate">{t.customer_name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{t.customer_email}</div>
                            </td>
                            <td className="px-3 py-2.5 max-w-[260px]">
                              <div className="text-xs text-foreground/80 line-clamp-1">{t.issue_summary}</div>
                              {t.complaint_subcategory && (
                                <div className="text-[10px] text-muted-foreground">{t.complaint_subcategory}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <Badge variant="outline" className={`${priorityClass(p)} text-[10px] px-1.5 py-0`}>{p}</Badge>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <Badge variant="outline" className={`${statusClass(s)} text-[10px] px-1.5 py-0 flex items-center gap-1 w-fit`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(s)}`} />
                                {statusLabel(s)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-muted-foreground max-w-[160px] truncate">
                              {t._localOwner ?? t.ownership}
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-muted-foreground/70 whitespace-nowrap">
                              {daysOpen(t.date_opened)}d ago
                            </td>
                          </tr>
                        );
                      })}
                      {g.tickets.length > 10 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-2 text-xs text-muted-foreground italic">
                            + {g.tickets.length - 10} more tickets in this group
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── OVERVIEW (Analytics) ── */}
        {view === "overview" && (
          <div className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="p-5 bg-white dark:bg-card border-border/60 shadow-sm">
                <h3 className="text-sm font-semibold mb-1 text-foreground">Priority Distribution</h3>
                <p className="text-xs text-muted-foreground mb-3">Breakdown by urgency level</p>
                <PriorityChart tickets={tickets} />
              </Card>
              <Card className="p-5 bg-white dark:bg-card border-border/60 shadow-sm">
                <h3 className="text-sm font-semibold mb-1 text-foreground">Status Overview</h3>
                <p className="text-xs text-muted-foreground mb-3">Resolution pipeline</p>
                <StatusChart tickets={tickets} />
              </Card>
              <Card className="p-5 bg-white dark:bg-card border-border/60 shadow-sm">
                <h3 className="text-sm font-semibold mb-1 text-foreground">Customer Frustration</h3>
                <p className="text-xs text-muted-foreground mb-3">Sentiment intensity levels</p>
                <SentimentChart tickets={tickets} />
              </Card>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-5 bg-white dark:bg-card border-border/60 shadow-sm">
                <h3 className="text-sm font-semibold mb-1 text-foreground">Top Categories</h3>
                <p className="text-xs text-muted-foreground mb-3">Most frequent complaint types</p>
                <CategoryChart tickets={tickets} />
              </Card>
              <Card className="p-5 bg-white dark:bg-card border-border/60 shadow-sm">
                <h3 className="text-sm font-semibold mb-1 text-foreground">Assignment Load</h3>
                <p className="text-xs text-muted-foreground mb-3">Tickets per owner</p>
                <OwnershipChart tickets={tickets} />
              </Card>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="p-5 bg-white dark:bg-card border-border/60 shadow-sm">
                <h3 className="text-sm font-semibold mb-1 text-foreground">Ticket Age Distribution</h3>
                <p className="text-xs text-muted-foreground mb-3">How long tickets have been open</p>
                <AgingChart tickets={tickets} />
              </Card>
              <Card className="p-5 bg-white dark:bg-card border-border/60 shadow-sm">
                <h3 className="text-sm font-semibold mb-1 text-foreground">Churn Risk Levels</h3>
                <p className="text-xs text-muted-foreground mb-3">AI-assessed churn likelihood</p>
                <ChurnRiskChart tickets={tickets} />
              </Card>
            </div>

            {/* Insights */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5 bg-white dark:bg-card border-border/60 shadow-sm">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-4 w-4 text-indigo-500" /> Recurring Issue Patterns
                </h3>
                <div className="space-y-2">
                  {Array.from(new Map(tickets.map((t) => [t.complaint_category, 0])))
                    .map(([cat]) => ({
                      cat,
                      count: tickets.filter((t) => t.complaint_category === cat).length,
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8)
                    .map(({ cat, count }, _, arr) => (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="text-xs text-foreground flex-1 truncate">{cat}</div>
                        <div className="h-1.5 rounded-full bg-muted flex-1 overflow-hidden max-w-[140px]">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${(count / arr[0].count) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground w-7 text-right">{count}</div>
                      </div>
                    ))}
                </div>
              </Card>

              <Card className="p-5 bg-white dark:bg-card border-border/60 shadow-sm">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> Strategic Recommendations
                </h3>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {[
                    "Address the top recurring complaint category — it accounts for the largest share of tickets.",
                    "Establish a 2-hour SLA acknowledgement for Critical and High-Risk tickets.",
                    "Build a refund/credit decision matrix so frontline staff can resolve without escalation.",
                    "Review communication templates — many complaints reference perceived dismissiveness.",
                    "Run weekly review of unresolved >72h tickets with the operations lead.",
                    "Investigate churn risk cohort — high churn indicators warrant proactive outreach.",
                  ].map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </main>

      <TicketDetail
        ticket={activeTicket}
        onOpenChange={(o) => !o && setActiveTicket(null)}
        onUpdate={updateTicket}
      />
    </div>
  );
}
