import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, Clock, Mail, User, Tag, Shield, Target,
  MessageSquare, Lightbulb, FileText, Building2, StickyNote,
  ChevronDown, CheckCircle2, Pencil, Save, X, Plus, Hash,
  TrendingUp, Calendar, Timer,
} from "lucide-react";
import {
  type Ticket, type Status, type Priority, type TicketNote,
  priorityClass, statusClass, statusLabel, statusDotColor,
  ALL_STATUSES, ALL_PRIORITIES, KNOWN_OWNERS, formatDate, daysOpen,
} from "@/lib/tickets";

interface Props {
  ticket: Ticket | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, changes: Partial<Ticket>) => void;
}

function Section({ icon: Icon, title, children, accent }: {
  icon: any; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${accent ?? "text-muted-foreground"}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="text-sm text-foreground/85 leading-relaxed">{children}</div>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon, highlight }: {
  label: string; value: string; icon: any; highlight?: string;
}) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ?? "bg-muted/30 border-border"}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-medium text-foreground leading-snug">{value || "—"}</div>
    </div>
  );
}

export function TicketDetail({ ticket, onOpenChange, onUpdate }: Props) {
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  if (!ticket) return null;

  const status = (ticket._localStatus ?? ticket.current_status) as Status;
  const priority = (ticket._localPriority ?? ticket.priority) as Priority;
  const owner = ticket._localOwner ?? ticket.ownership;
  const notes = ticket._localNotes ?? [];
  const tags = ticket._localTags ?? [];
  const days = daysOpen(ticket.date_opened);

  function saveNote() {
    if (!newNote.trim()) return;
    const note: TicketNote = {
      id: Date.now().toString(),
      text: newNote.trim(),
      author: "You",
      timestamp: new Date().toISOString(),
    };
    onUpdate(ticket.ticket_id, { _localNotes: [...notes, note] });
    setNewNote("");
    setAddingNote(false);
  }

  function removeNote(id: string) {
    onUpdate(ticket.ticket_id, { _localNotes: notes.filter((n) => n.id !== id) });
  }

  function saveTag() {
    const t = newTag.trim();
    if (!t || tags.includes(t)) return;
    onUpdate(ticket.ticket_id, { _localTags: [...tags, t] });
    setNewTag("");
    setAddingTag(false);
  }

  function removeTag(tag: string) {
    onUpdate(ticket.ticket_id, { _localTags: tags.filter((t) => t !== tag) });
  }

  return (
    <Sheet open={!!ticket} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0 flex flex-col border-l shadow-xl">
        {/* Header */}
        <SheetHeader className="px-6 pt-5 pb-4 border-b bg-gradient-to-br from-background to-muted/30">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground font-mono">
                  {ticket.ticket_id}
                </code>
                <Badge variant="outline" className={`${priorityClass(priority)} text-xs`}>
                  {priority}
                </Badge>
                <Badge variant="outline" className={`${statusClass(status)} text-xs flex items-center gap-1.5`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(status)}`} />
                  {statusLabel(status)}
                </Badge>
                {days > 0 && (
                  <span className={`text-xs flex items-center gap-1 ${days > 30 ? "text-red-600" : days > 14 ? "text-amber-600" : "text-muted-foreground"}`}>
                    <Timer className="h-3 w-3" /> {days}d open
                  </span>
                )}
              </div>
              <SheetTitle className="text-base leading-snug font-semibold pr-8">
                {ticket.complaint_category}
                {ticket.complaint_subcategory && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    / {ticket.complaint_subcategory}
                  </span>
                )}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {ticket.customer_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {ticket.customer_email}
                  </span>
                </div>
              </SheetDescription>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                <Hash className="h-2.5 w-2.5" />{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-red-500 ml-0.5">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {addingTag ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTag(); if (e.key === "Escape") setAddingTag(false); }}
                  placeholder="tag name"
                  className="text-xs border border-border rounded-full px-2 py-0.5 w-24 bg-background outline-none focus:border-primary"
                />
                <button onClick={saveTag} className="text-primary hover:opacity-80"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                <button onClick={() => setAddingTag(false)} className="text-muted-foreground hover:opacity-80"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-2.5 w-2.5" /> tag
              </button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Quick actions row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Status */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Status
                </label>
                <Select
                  value={status}
                  onValueChange={(v) => onUpdate(ticket.ticket_id, { _localStatus: v as Status })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        <span className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(s)}`} />
                          {statusLabel(s)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5" /> Priority
                </label>
                <Select
                  value={priority}
                  onValueChange={(v) => onUpdate(ticket.ticket_id, { _localPriority: v as Priority })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Owner */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <Building2 className="h-2.5 w-2.5" /> Assigned To
                </label>
                <Select
                  value={owner}
                  onValueChange={(v) => onUpdate(ticket.ticket_id, { _localOwner: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_OWNERS.map((o) => (
                      <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                    ))}
                    <SelectItem value={owner} className="text-xs">{owner}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-2">
              <InfoCard icon={Calendar} label="Date Opened" value={formatDate(ticket.date_opened)} />
              <InfoCard icon={Clock} label="Last Response" value={formatDate(ticket.last_response_date)} />
              <InfoCard icon={Target} label="SLA Classification" value={ticket.sla_classification} />
              <InfoCard icon={Timer} label="SLA Aging" value={ticket.sla_aging || `${days} days open`}
                highlight={days > 30 ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800" : undefined}
              />
            </div>

            {ticket.sla_aging && days > 14 && (
              <Card className="p-3 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50">
                <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> SLA at risk — {days} days since opening
                </div>
              </Card>
            )}

            <Separator />

            <Section icon={FileText} title="Issue Summary">
              <p className="text-sm leading-relaxed text-foreground/80">{ticket.issue_summary}</p>
            </Section>

            <Section icon={Shield} title="Root Cause">
              <p className="text-sm leading-relaxed text-foreground/80">{ticket.root_cause}</p>
            </Section>

            <Section icon={Tag} title="Sentiment Analysis">
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { label: "Frustration", value: ticket.sentiment?.frustration_level },
                  { label: "Churn Risk", value: ticket.sentiment?.churn_likelihood },
                ].map(({ label, value }) => {
                  const isHigh = ["High", "Severe", "Very High"].includes(value ?? "");
                  return (
                    <div
                      key={label}
                      className={`p-2.5 rounded-lg border text-xs ${isHigh ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/50" : "bg-muted/30 border-border"}`}
                    >
                      <div className="text-muted-foreground mb-0.5">{label}</div>
                      <div className={`font-semibold ${isHigh ? "text-red-700 dark:text-red-400" : "text-foreground"}`}>{value}</div>
                    </div>
                  );
                })}
                <div className="col-span-2 p-2.5 rounded-lg border bg-muted/30 border-border text-xs">
                  <div className="text-muted-foreground mb-0.5">Emotional Tone</div>
                  <div className="text-foreground">{ticket.sentiment?.emotional_tone}</div>
                </div>
                {ticket.sentiment?.risk_indicators && (
                  <div className="col-span-2 p-2.5 rounded-lg border bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/50 text-xs">
                    <div className="text-amber-700 dark:text-amber-400 mb-0.5 font-semibold">Risk Indicators</div>
                    <div className="text-foreground/80">{ticket.sentiment.risk_indicators}</div>
                  </div>
                )}
              </div>
            </Section>

            {ticket.key_customer_statements?.length > 0 && (
              <Section icon={MessageSquare} title="Key Customer Statements">
                <div className="space-y-2 mt-1">
                  {ticket.key_customer_statements.map((s, i) => (
                    <blockquote
                      key={i}
                      className="border-l-2 border-primary/40 pl-3 text-sm text-foreground/75 italic"
                    >
                      "{s}"
                    </blockquote>
                  ))}
                </div>
              </Section>
            )}

            {ticket.internal_risk_flags?.length > 0 && (
              <Section icon={AlertTriangle} title="Internal Risk Flags" accent="text-red-600 dark:text-red-400">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {ticket.internal_risk_flags.map((f, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50 text-xs"
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {ticket.recommended_actions?.length > 0 && (
              <Section icon={Lightbulb} title="Recommended Actions">
                <ol className="list-none space-y-2 mt-1">
                  {ticket.recommended_actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-foreground/80">{a}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            <Section icon={Target} title="Response Strategy">
              <p className="text-sm leading-relaxed text-foreground/80">{ticket.response_strategy}</p>
            </Section>

            <Section icon={Mail} title="Suggested Reply">
              <Card className="p-4 bg-muted/40 border-border text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed font-mono text-xs">
                {ticket.suggested_reply}
              </Card>
            </Section>

            {ticket.unknowns && (
              <Section icon={AlertTriangle} title="Unknowns / Missing Info">
                <p className="italic text-muted-foreground text-sm">{ticket.unknowns}</p>
              </Section>
            )}

            <Separator />

            {/* Notes section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" /> Internal Notes ({notes.length})
                </div>
                {!addingNote && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddingNote(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Note
                  </Button>
                )}
              </div>

              {addingNote && (
                <div className="space-y-2">
                  <Textarea
                    autoFocus
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write an internal note…"
                    className="text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={saveNote}>
                      <Save className="h-3 w-3 mr-1" /> Save Note
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingNote(false); setNewNote(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {notes.length === 0 && !addingNote && (
                <p className="text-xs text-muted-foreground italic py-2">No internal notes yet.</p>
              )}

              <div className="space-y-2">
                {notes.map((note) => (
                  <Card key={note.id} className="p-3 bg-amber-50/60 border-amber-200/60 dark:bg-amber-950/10 dark:border-amber-800/30">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground/85 flex-1">{note.text}</p>
                      <button
                        onClick={() => removeNote(note.id)}
                        className="text-muted-foreground hover:text-red-500 shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {note.author} · {new Date(note.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
