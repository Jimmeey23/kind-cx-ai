export type Priority = "Low" | "Medium" | "High" | "Critical";
export type Status =
  | "unresolved"
  | "partially_resolved"
  | "awaiting_internal_action"
  | "awaiting_customer_response"
  | "escalated"
  | "resolved"
  | "high_risk";

export interface Sentiment {
  frustration_level: "Low" | "Medium" | "High" | "Severe";
  emotional_tone: string;
  churn_likelihood: "Low" | "Medium" | "High" | "Very High";
  risk_indicators: string;
}

export interface Ticket {
  ticket_id: string;
  customer_name: string;
  customer_email: string;
  date_opened: string;
  last_response_date: string;
  current_status: Status;
  priority: Priority;
  sla_classification: string;
  complaint_category: string;
  sentiment: Sentiment;
  issue_summary: string;
  root_cause: string;
  key_customer_statements: string[];
  internal_risk_flags: string[];
  recommended_actions: string[];
  response_strategy: string;
  suggested_reply: string;
  sla_aging: string;
  ownership: string;
  unknowns: string;
  _thread_id?: string;
  _error?: string;
}

const PRIORITY_RANK: Record<Priority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function priorityRank(p: Priority): number {
  return PRIORITY_RANK[p] ?? 0;
}

export function priorityClass(p: Priority): string {
  switch (p) {
    case "Critical": return "bg-[var(--critical)]/15 text-[var(--critical)] border-[var(--critical)]/30";
    case "High": return "bg-[var(--high)]/15 text-[var(--high)] border-[var(--high)]/30";
    case "Medium": return "bg-[var(--medium)]/15 text-[var(--medium)] border-[var(--medium)]/30";
    default: return "bg-[var(--low)]/15 text-[var(--low)] border-[var(--low)]/30";
  }
}

export function statusLabel(s: Status): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusClass(s: Status): string {
  switch (s) {
    case "high_risk":
    case "escalated":
      return "bg-[var(--critical)]/15 text-[var(--critical)] border-[var(--critical)]/30";
    case "unresolved":
      return "bg-[var(--high)]/15 text-[var(--high)] border-[var(--high)]/30";
    case "awaiting_internal_action":
    case "partially_resolved":
      return "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30";
    case "awaiting_customer_response":
      return "bg-[var(--info)]/15 text-[var(--info)] border-[var(--info)]/30";
    case "resolved":
      return "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export async function loadTickets(): Promise<Ticket[]> {
  const res = await fetch("/data/tickets.json", { cache: "no-store" });
  const raw = (await res.json()) as Ticket[];
  return raw.filter((t) => !t._error && t.ticket_id);
}
