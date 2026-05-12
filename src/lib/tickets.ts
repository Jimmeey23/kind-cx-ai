export type Priority = "Low" | "Medium" | "High" | "Critical";
export type Status =
  | "unresolved"
  | "partially_resolved"
  | "awaiting_internal_action"
  | "awaiting_customer_response"
  | "escalated"
  | "resolved"
  | "high_risk";

export type ViewMode = "table" | "kanban" | "groups" | "timeline";
export type SortField = "priority" | "date_opened" | "last_response_date" | "customer_name" | "complaint_category" | "current_status" | "sla_aging";
export type SortDir = "asc" | "desc";
export type Location = "Supreme HQ, Bandra" | "Kwality House, Kemps Corner";
export type EmailType =
  | "Member Feedback"
  | "Complaint"
  | "Issue"
  | "Incident"
  | "Internal Operations"
  | "Sales / Lead Intelligence"
  | "Hosted Class Report"
  | "Marketing / Partnership"
  | "Finance / Reconciliation"
  | "HR / Admin"
  | "Ignore / Archive";
export type IntelligenceBucket =
  | "CX Ticket"
  | "Member Voice"
  | "Business Intelligence"
  | "Admin Workflow"
  | "Needs Review";
export type CxTicketConfidence = "High" | "Medium" | "Low";

export interface Sentiment {
  frustration_level: "Low" | "Medium" | "High" | "Severe";
  emotional_tone: string;
  churn_likelihood: "Low" | "Medium" | "High" | "Very High";
  risk_indicators: string;
}

export interface TicketNote {
  id: string;
  text: string;
  author: string;
  timestamp: string;
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
  complaint_subcategory?: string;
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
  email_type?: EmailType;
  intelligence_bucket?: IntelligenceBucket;
  cx_ticket_confidence?: CxTicketConfidence;
  cx_ticket_qualified?: boolean;
  classification_reasons?: string[];
  location?: Location;
  _thread_id?: string;
  _error?: string;
  // local overrides (stored in memory)
  _localStatus?: Status;
  _localPriority?: Priority;
  _localOwner?: string;
  _localNotes?: TicketNote[];
  _localTags?: string[];
}

const PRIORITY_RANK: Record<Priority, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function priorityRank(p: Priority | string): number {
  return PRIORITY_RANK[p as Priority] ?? 0;
}

export function priorityClass(p: Priority | string): string {
  switch (p) {
    case "Critical": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50";
    case "High": return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/50";
    case "Medium": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50";
    default: return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50";
  }
}

export function statusLabel(s: Status | string): string {
  const map: Record<string, string> = {
    unresolved: "Unresolved",
    partially_resolved: "Partial",
    awaiting_internal_action: "Awaiting Internal",
    awaiting_customer_response: "Awaiting Customer",
    escalated: "Escalated",
    resolved: "Resolved",
    high_risk: "High Risk",
  };
  return map[s] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusClass(s: Status | string): string {
  switch (s) {
    case "high_risk": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400";
    case "escalated": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400";
    case "unresolved": return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400";
    case "awaiting_internal_action": return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400";
    case "partially_resolved": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400";
    case "awaiting_customer_response": return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400";
    case "resolved": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400";
    default: return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400";
  }
}

export function statusDotColor(s: Status | string): string {
  switch (s) {
    case "high_risk":
    case "escalated": return "bg-red-500";
    case "unresolved": return "bg-orange-500";
    case "awaiting_internal_action": return "bg-violet-500";
    case "partially_resolved": return "bg-amber-500";
    case "awaiting_customer_response": return "bg-sky-500";
    case "resolved": return "bg-emerald-500";
    default: return "bg-slate-400";
  }
}

export function daysOpen(dateOpened: string): number {
  const d = new Date(dateOpened);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const ALL_STATUSES: Status[] = [
  "unresolved",
  "partially_resolved",
  "awaiting_internal_action",
  "awaiting_customer_response",
  "escalated",
  "high_risk",
  "resolved",
];

export const ALL_PRIORITIES: Priority[] = ["Critical", "High", "Medium", "Low"];
export const ALL_EMAIL_TYPES: EmailType[] = [
  "Complaint",
  "Issue",
  "Incident",
  "Member Feedback",
  "Hosted Class Report",
  "Sales / Lead Intelligence",
  "Internal Operations",
  "Marketing / Partnership",
  "Finance / Reconciliation",
  "HR / Admin",
  "Ignore / Archive",
];

export const ALL_INTELLIGENCE_BUCKETS: IntelligenceBucket[] = [
  "CX Ticket",
  "Member Voice",
  "Business Intelligence",
  "Admin Workflow",
  "Needs Review",
];

export const KNOWN_OWNERS = [
  "Jimmeey (Corporate/Executive Leadership)",
  "Jimmeey Gondaa (Head - Sales & Client Services)",
  "Ayesha / Saachi (Marketing/Creative Team)",
  "Vahishta Fitter / Akshay Rane",
  "Jimmeey (Manager/Internal)",
  "Operations Team",
  "HR Team",
  "Finance Team",
  "Unassigned",
];

// Location mapping by associate
const ASSOCIATE_TO_LOCATION: Record<string, Location> = {
  // Supreme HQ, Bandra
  imran: "Supreme HQ, Bandra",
  shipra: "Supreme HQ, Bandra",
  deesha: "Supreme HQ, Bandra",
  nadiya: "Supreme HQ, Bandra",
  sheetal: "Supreme HQ, Bandra",
  // Kwality House, Kemps Corner
  akshay: "Kwality House, Kemps Corner",
  taahira: "Kwality House, Kemps Corner",
  zaheer: "Kwality House, Kemps Corner",
  vahishta: "Kwality House, Kemps Corner",
};

export const ALL_LOCATIONS: Location[] = [
  "Supreme HQ, Bandra",
  "Kwality House, Kemps Corner",
];

export function getLocationFromAssociate(ownership: string): Location | undefined {
  const key = ownership?.toLowerCase().split(/[\s,()]+/)[0];
  return key ? ASSOCIATE_TO_LOCATION[key] : undefined;
}

export function getTicketLocation(ticket: Ticket): Location | undefined {
  // Use explicit location if available
  if (ticket.location) return ticket.location;
  // Otherwise infer from ownership/associate
  return getLocationFromAssociate(ticket.ownership);
}

export function locationColor(location?: Location): string {
  switch (location) {
    case "Supreme HQ, Bandra": return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/50";
    case "Kwality House, Kemps Corner": return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50";
    default: return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800/50";
  }
}

export function emailTypeClass(type?: string): string {
  switch (type) {
    case "Complaint": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400";
    case "Incident": return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400";
    case "Issue": return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400";
    case "Member Feedback": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "Hosted Class Report": return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/30 dark:text-fuchsia-400";
    case "Sales / Lead Intelligence": return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400";
    case "Internal Operations": return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300";
    case "Marketing / Partnership": return "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400";
    case "Finance / Reconciliation": return "bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-950/30 dark:text-lime-400";
    case "HR / Admin": return "bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-900/50 dark:text-stone-300";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export function bucketClass(bucket?: string): string {
  switch (bucket) {
    case "CX Ticket": return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400";
    case "Member Voice": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "Business Intelligence": return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400";
    case "Admin Workflow": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400";
    case "Needs Review": return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export async function loadTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/tickets", { cache: "no-store" });
  const raw = (await res.json()) as Ticket[];
  return raw.filter((t) => !t._error && t.ticket_id);
}
