import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, Clock, Mail, User, Tag, Shield, Target,
  MessageSquare, Lightbulb, FileText, Building2,
} from "lucide-react";
import {
  type Ticket, priorityClass, statusClass, statusLabel,
} from "@/lib/tickets";

interface Props {
  ticket: Ticket | null;
  onOpenChange: (open: boolean) => void;
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function TicketDetail({ ticket, onOpenChange }: Props) {
  return (
    <Sheet open={!!ticket} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0 flex flex-col">
        {ticket && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {ticket.ticket_id}
                    </code>
                    <Badge variant="outline" className={priorityClass(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Badge variant="outline" className={statusClass(ticket.current_status)}>
                      {statusLabel(ticket.current_status)}
                    </Badge>
                  </div>
                  <SheetTitle className="text-lg leading-tight">
                    {ticket.complaint_category}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 text-xs">
                    <User className="h-3 w-3" /> {ticket.customer_name}
                    <span className="text-muted-foreground/50">•</span>
                    <Mail className="h-3 w-3" /> {ticket.customer_email}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Date Opened
                    </div>
                    <div className="text-sm font-medium mt-1">{ticket.date_opened}</div>
                  </Card>
                  <Card className="p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Last Response
                    </div>
                    <div className="text-sm font-medium mt-1">{ticket.last_response_date}</div>
                  </Card>
                  <Card className="p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Target className="h-3 w-3" /> SLA
                    </div>
                    <div className="text-sm font-medium mt-1">{ticket.sla_classification}</div>
                  </Card>
                  <Card className="p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" /> Owner
                    </div>
                    <div className="text-sm font-medium mt-1">{ticket.ownership}</div>
                  </Card>
                </div>

                {ticket.sla_aging && (
                  <Card className="p-3 bg-[var(--warning)]/10 border-[var(--warning)]/30">
                    <div className="text-xs text-[var(--warning)] font-semibold flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> SLA AGING
                    </div>
                    <div className="text-sm mt-1 text-foreground">{ticket.sla_aging}</div>
                  </Card>
                )}

                <Separator />

                <Section icon={FileText} title="Issue Summary">
                  <p className="leading-relaxed">{ticket.issue_summary}</p>
                </Section>

                <Section icon={Tag} title="Sentiment">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-foreground/80">Frustration:</span> {ticket.sentiment?.frustration_level}</div>
                    <div><span className="text-foreground/80">Churn risk:</span> {ticket.sentiment?.churn_likelihood}</div>
                    <div className="col-span-2"><span className="text-foreground/80">Tone:</span> {ticket.sentiment?.emotional_tone}</div>
                    {ticket.sentiment?.risk_indicators && (
                      <div className="col-span-2"><span className="text-foreground/80">Risk:</span> {ticket.sentiment.risk_indicators}</div>
                    )}
                  </div>
                </Section>

                <Section icon={Shield} title="Root Cause">
                  <p className="leading-relaxed">{ticket.root_cause}</p>
                </Section>

                {ticket.key_customer_statements?.length > 0 && (
                  <Section icon={MessageSquare} title="Key Customer Statements">
                    <ul className="space-y-2">
                      {ticket.key_customer_statements.map((s, i) => (
                        <li key={i} className="border-l-2 border-primary/50 pl-3 italic">
                          "{s}"
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {ticket.internal_risk_flags?.length > 0 && (
                  <Section icon={AlertTriangle} title="Internal Risk Flags">
                    <div className="flex flex-wrap gap-1.5">
                      {ticket.internal_risk_flags.map((f, i) => (
                        <Badge key={i} variant="outline" className="bg-[var(--critical)]/10 text-[var(--critical)] border-[var(--critical)]/30">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </Section>
                )}

                {ticket.recommended_actions?.length > 0 && (
                  <Section icon={Lightbulb} title="Recommended Actions">
                    <ol className="list-decimal list-inside space-y-1.5">
                      {ticket.recommended_actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ol>
                  </Section>
                )}

                <Section icon={Target} title="Response Strategy">
                  <p className="leading-relaxed">{ticket.response_strategy}</p>
                </Section>

                <Section icon={Mail} title="Suggested Reply Draft">
                  <Card className="p-4 bg-muted/40 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                    {ticket.suggested_reply}
                  </Card>
                </Section>

                {ticket.unknowns && (
                  <Section icon={AlertTriangle} title="Unknown / Missing Info">
                    <p className="text-muted-foreground italic">{ticket.unknowns}</p>
                  </Section>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
