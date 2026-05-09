import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  type Ticket, type Status, priorityClass, statusLabel, statusClass,
  statusDotColor, ALL_STATUSES, formatDate, daysOpen,
} from "@/lib/tickets";
import { Clock, AlertTriangle } from "lucide-react";

interface Props {
  tickets: Ticket[];
  onSelect: (t: Ticket) => void;
  onStatusChange: (id: string, s: Status) => void;
}

const COLUMN_LABELS: Record<Status, string> = {
  unresolved: "Unresolved",
  awaiting_internal_action: "Awaiting Internal",
  awaiting_customer_response: "Awaiting Customer",
  partially_resolved: "Partially Resolved",
  escalated: "Escalated",
  high_risk: "High Risk",
  resolved: "Resolved",
};

const COLUMN_COLORS: Record<Status, string> = {
  unresolved: "border-orange-200 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/10",
  awaiting_internal_action: "border-violet-200 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/10",
  awaiting_customer_response: "border-sky-200 bg-sky-50/60 dark:border-sky-900/40 dark:bg-sky-950/10",
  partially_resolved: "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/10",
  escalated: "border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/10",
  high_risk: "border-red-300 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/20",
  resolved: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/10",
};

const HEADER_COLORS: Record<Status, string> = {
  unresolved: "text-orange-700 dark:text-orange-400",
  awaiting_internal_action: "text-violet-700 dark:text-violet-400",
  awaiting_customer_response: "text-sky-700 dark:text-sky-400",
  partially_resolved: "text-amber-700 dark:text-amber-400",
  escalated: "text-red-700 dark:text-red-400",
  high_risk: "text-red-800 dark:text-red-300",
  resolved: "text-emerald-700 dark:text-emerald-400",
};

export function KanbanView({ tickets, onSelect }: Props) {
  const columns = useMemo(() => {
    const map = new Map<Status, Ticket[]>();
    for (const s of ALL_STATUSES) map.set(s, []);
    for (const t of tickets) {
      const s = (t._localStatus ?? t.current_status) as Status;
      const col = map.get(s) ?? [];
      col.push(t);
      map.set(s, col);
    }
    return ALL_STATUSES.map((s) => ({ status: s, tickets: map.get(s) ?? [] }));
  }, [tickets]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
      {columns.map(({ status, tickets: col }) => (
        <div key={status} className="flex-shrink-0 w-72">
          <div className={`rounded-xl border ${COLUMN_COLORS[status]} h-full flex flex-col`}>
            <div className="px-3 py-2.5 border-b border-inherit flex items-center justify-between">
              <div className={`flex items-center gap-2 font-semibold text-sm ${HEADER_COLORS[status]}`}>
                <span className={`h-2 w-2 rounded-full ${statusDotColor(status)}`} />
                {COLUMN_LABELS[status]}
              </div>
              <span className="text-xs font-medium bg-white/70 dark:bg-black/20 px-2 py-0.5 rounded-full text-muted-foreground border border-inherit">
                {col.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-260px)]">
              {col.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8 opacity-60">No tickets</div>
              )}
              {col.map((t) => {
                const days = daysOpen(t.date_opened);
                const p = t._localPriority ?? t.priority;
                return (
                  <Card
                    key={t.ticket_id}
                    onClick={() => onSelect(t)}
                    className="p-3 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 bg-white/90 dark:bg-card/80 border-border/60"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className={`${priorityClass(p)} text-[10px] px-1.5 py-0`}>
                        {p}
                      </Badge>
                      <code className="text-[10px] text-muted-foreground font-mono">{t.ticket_id}</code>
                    </div>
                    <div className="text-sm font-medium text-foreground line-clamp-2 mb-1.5">
                      {t.complaint_category}
                    </div>
                    {t.complaint_subcategory && (
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mb-1.5">
                        {t.complaint_subcategory}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {t.issue_summary}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/60">
                      <span className="truncate max-w-[120px]">{t.customer_name}</span>
                      <span className={`flex items-center gap-1 ${days > 30 ? "text-red-600 dark:text-red-400" : days > 14 ? "text-orange-600 dark:text-orange-400" : ""}`}>
                        {days > 14 && <AlertTriangle className="h-2.5 w-2.5" />}
                        <Clock className="h-2.5 w-2.5" />
                        {days}d
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1 truncate">
                      {t._localOwner ?? t.ownership}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
