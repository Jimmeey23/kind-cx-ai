import { writeFileSync, readFileSync } from "fs";
import crypto from "crypto";
import { classifyEmailType } from "./email-intelligence.mjs";

const threads = JSON.parse(readFileSync("scripts/threads-metadata.json", "utf-8"));
const existing = JSON.parse(readFileSync("public/data/tickets.json", "utf-8"));

function getHeader(messages, name) {
  for (const m of messages) {
    const val = m[name];
    if (val) return val;
  }
  return "";
}

function extractEmail(str) {
  const match = str.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : str.toLowerCase().trim();
}

function extractName(str) {
  if (!str) return "Unknown";
  const clean = str.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
  return clean || str.split("@")[0];
}

function parseDate(dateStr) {
  if (!dateStr) return "unknown";
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return dateStr.slice(0, 10);
  }
}

function ticketId(threadId) {
  return "TKT-" + threadId.slice(-8).toUpperCase();
}

// ─── Categorization rules based on subject + sender patterns ─────────────────

const CATEGORIES = {
  "Injury / Safety": {
    subjectPatterns: [
      /stolen|missing|theft|lost|cash missing|shoes missing|stolen/i,
      /fainting|faint|light.?head|dizziness|dizzy|nausea|injury|injured|pain|hurt|accident|incident/i,
      /locker|locker no|bag missing|belongings/i,
    ],
    subcategoryMap: [
      [/stolen|theft|missing|cash|shoes|bag|belongings|locker/i, "Theft / Missing Items"],
      [/fainting|faint|light.?head|dizziness|dizzy|nausea/i, "Fainting/Light-headedness & Ventilation Concerns"],
      [/injury|injured|pain|hurt|accident/i, "Physical Injury During Class"],
      [/incident/i, "Incident Report"],
    ],
    defaultSub: "Incident Report",
    priority: "High",
    status: "awaiting_internal_action",
  },
  "Trainer Conduct": {
    subjectPatterns: [
      /trainer|instructor|coach|staff conduct|disrespect|harassment|behavior|behaviour|rude|conflict|complaint about/i,
      /punctuality|late|lateness|no.?show|absent/i,
      /assault|inappropriate|unprofessional/i,
    ],
    subcategoryMap: [
      [/harass|assault|inappropriate|molest/i, "Harassment / Member Conflict"],
      [/disrespect|rude|conflict|argument|behavior|behaviour/i, "Client Conflict Management"],
      [/punctuality|late|lateness|on time/i, "Punctuality and Client Engagement"],
      [/no.?show|absent|didn.t show/i, "Instructor Lateness"],
      [/inattentive|modification|safety/i, "Inattentiveness & Safety Modification Failure"],
    ],
    defaultSub: "Trainer Performance",
    priority: "High",
    status: "awaiting_internal_action",
  },
  "Class Quality": {
    subjectPatterns: [
      /music|loud|volume|sound/i,
      /class quality|feedback.*class|class.*feedback|walked out|left.*class|class.*experience/i,
      /weights|equipment|intensity|level|challenging|too easy|too hard/i,
      /QA form|quality assurance/i,
    ],
    subcategoryMap: [
      [/music|loud|volume|sound/i, "Atmosphere / Music Volume"],
      [/weights|equipment/i, "Equipment / Weights Arrangement"],
      [/intensity|level|challenging|too easy|too hard/i, "Trainer Performance / Intensity Level"],
      [/walked out|left.*class|quit.*class/i, "Trainer Performance / Intensity Level"],
      [/QA|quality assurance/i, "Quality Assurance Process"],
      [/experience|overall|general/i, "Instructor/Music Balance & Schedule Fit"],
    ],
    defaultSub: "Class Experience Feedback",
    priority: "Medium",
    status: "unresolved",
  },
  "Facility / Hygiene": {
    subjectPatterns: [
      /AC|air.?con|temperature|cold|hot|ventilation|air quality|stuffy/i,
      /facility|hygiene|clean|dirty|smell|odor|locker room|bathroom|toilet/i,
      /boutique|retail|merchandise|product/i,
    ],
    subcategoryMap: [
      [/AC|air.?con|temperature|cold|hot/i, "Studio Temperature / AC"],
      [/ventilation|air quality|stuffy/i, "Ventilation and Air Quality"],
      [/locker room|bathroom|toilet|hygiene|clean|dirty/i, "Locker Security & Maintenance"],
      [/boutique|retail|merchandise|product/i, "Boutique / Retail Offerings"],
    ],
    defaultSub: "Facility Concern",
    priority: "Medium",
    status: "unresolved",
  },
  "Booking / Scheduling": {
    subjectPatterns: [
      /schedule|booking|cancel|cancell|class cancel|class timing|class time|slot/i,
      /late entry|late.?policy|no entry|denied entry|entry denied/i,
      /overbooking|overbooked|headcount|capacity|waitlist/i,
      /private.*class|hosted class|group.*booking|workshop/i,
      /trainer.*no.?show|instructor.*no.?show|class.*no.?show/i,
      /reschedule|rescheduling|postpone/i,
    ],
    subcategoryMap: [
      [/late entry|late.?policy|no entry|denied entry/i, "Late Entry Policy & Schedule Inflexibility"],
      [/overbooking|overbooked|headcount|capacity/i, "Class Overbooking / Headcount Error"],
      [/cancel|cancell/i, "Class Cancellation & Schedule Imbalance"],
      [/private.*class|hosted class|group.*booking/i, "Hosted Class / Instructor Swap Request"],
      [/trainer.*no.?show|instructor.*no.?show/i, "Trainer No-show / Late Arrival"],
      [/workshop/i, "Workshop Scheduling / Capacity Planning"],
      [/reschedule|timing|slot/i, "Class Timing / Schedule Feedback"],
    ],
    defaultSub: "Class Availability / Variety",
    priority: "Medium",
    status: "unresolved",
  },
  "Access / Check-in": {
    subjectPatterns: [
      /check.?in|access|entry|late entry|gate|door|membership.*access/i,
    ],
    subcategoryMap: [
      [/late entry/i, "Late Entry Policy Enforcement"],
      [/check.?in|access/i, "Check-in Process"],
    ],
    defaultSub: "Late Entry Policy Enforcement",
    priority: "Low",
    status: "unresolved",
  },
  "Communication Gap": {
    subjectPatterns: [
      /follow.?up|communication|no.*response|no.*reply|unanswered|not.*informed|feedback.*trail|feedback.*email/i,
      /lead.*feedback|feedback.*lead|hosted class.*feedback/i,
      /survey|schedule.*feedback|class.*schedule.*feedback/i,
    ],
    subcategoryMap: [
      [/hosted class|hosted.*feedback/i, "Hosted Class Lead Feedback"],
      [/lead.*feedback|feedback.*lead/i, "Lead Feedback & Follow-up"],
      [/survey|class.*schedule.*feedback/i, "B2B Operations / Schedule Feedback Survey"],
      [/follow.?up|no.*response|not.*informed/i, "Class Schedule Delay / Internal Follow-up"],
    ],
    defaultSub: "Internal Feedback / Sales Reporting",
    priority: "Low",
    status: "awaiting_internal_action",
  },
  "Internal Systems": {
    subjectPatterns: [
      /handover|hand.?over|MOM|minutes of meeting|meeting notes/i,
      /CRM|momence|zoho|HRIS|system|data|database|tech/i,
      /payment|reconcil|invoice|refund|cash|UPI|transaction/i,
      /SOP|standard operating|procedure|policy/i,
      /marketing|campaign|content|social media|creative|design|collateral/i,
      /partnership|collaboration|B2B|corporate|association/i,
      /onboarding|performance review|payroll|salary|appraisal/i,
      /lead.*track|sales.*track|report.*lead|event.*report/i,
      /anniversary|challenge|eras tour|community wall|influencer/i,
    ],
    subcategoryMap: [
      [/handover/i, "Handover / Shift Reporting"],
      [/MOM|minutes of meeting|meeting notes/i, "Marketing / Operational Workflow"],
      [/CRM|momence/i, "Data Accuracy & CRM Integration"],
      [/zoho|HRIS/i, "Zoho Shift Scheduling / HRIS Access"],
      [/payment|reconcil|invoice|UPI|cash/i, "Payment Reconciliation"],
      [/SOP|standard operating|procedure/i, "Standard Operating Procedures (SOP)"],
      [/marketing|campaign|content|social media|creative|collateral/i, "Marketing Campaign Launch & Internal Alignment"],
      [/partnership|collaboration|B2B|corporate|association/i, "Partnership / Collaboration Approval"],
      [/onboarding/i, "SOP / Operational Checklist Alignment"],
      [/performance review|payroll|salary|appraisal/i, "Performance Review / Payroll"],
      [/lead.*track|sales.*track|event.*report/i, "Event Reporting / Sales Lead Tracking"],
      [/influencer/i, "Influencer/Partnership Approval"],
      [/community wall/i, "Creative Asset Production"],
      [/challenge|eras tour|anniversary/i, "Internal Campaign Coordination"],
    ],
    defaultSub: "Internal Operations Memo",
    priority: "Low",
    status: "awaiting_internal_action",
  },
  "Other": {
    subjectPatterns: [/.*/],
    subcategoryMap: [
      [/resign|resign|leave|maternity|notice/i, "Maternity Leave / Resignation"],
      [/competitor|poach|solicitation/i, "Competitor Solicitation / Client Poaching"],
      [/nutritionist|collaboration|partnership/i, "Marketing Collateral Review"],
    ],
    defaultSub: "Internal Session Reporting / Post-Class Feedback",
    priority: "Low",
    status: "unresolved",
  },
};

// Senders who are clearly internal staff
const INTERNAL_STAFF_DOMAINS = [
  "physique57india.com", "physique57mumbai.com", "physique57bengaluru.com",
  "copperandcloves.com",
];
const INTERNAL_STAFF_EMAILS = [
  "jagtianireyna@gmail.com", "richard",
];

function isInternal(from) {
  const email = extractEmail(from);
  return INTERNAL_STAFF_DOMAINS.some(d => email.includes(d)) ||
    INTERNAL_STAFF_EMAILS.some(e => email.includes(e));
}

function categorize(subject, from, to, allMessages) {
  const subj = subject || "";
  const fromStr = from || "";

  for (const [cat, cfg] of Object.entries(CATEGORIES)) {
    if (cat === "Other") continue;
    const matches = cfg.subjectPatterns.some(p => p.test(subj));
    if (matches) {
      let sub = cfg.defaultSub;
      for (const [pat, label] of cfg.subcategoryMap) {
        if (pat.test(subj)) { sub = label; break; }
      }
      return { category: cat, subcategory: sub, priority: cfg.priority, status: cfg.status };
    }
  }

  // Fallback: internal staff → Internal Systems
  if (isInternal(fromStr)) {
    return { category: "Internal Systems", subcategory: "Internal Operations Memo", priority: "Low", status: "awaiting_internal_action" };
  }

  return { category: "Other", subcategory: "Internal Session Reporting / Post-Class Feedback", priority: "Low", status: "unresolved" };
}

function priorityFromCategory(cat, sub, subject) {
  const subj = subject || "";
  if (/stolen|theft|missing cash|assault|harass|injury|injured|fainting|emergency/i.test(subj)) return "Critical";
  if (cat === "Injury / Safety") return "High";
  if (cat === "Trainer Conduct") return /harass|assault/i.test(subj) ? "Critical" : "High";
  if (/refund|chargeback|money back|cancel.*member/i.test(subj)) return "High";
  if (cat === "Class Quality" && /walked out|left.*class/i.test(subj)) return "High";
  if (cat === "Internal Systems" && /payment|reconcil|SOP|handover/i.test(subj)) return "Medium";
  if (cat === "Communication Gap") return "Low";
  return "Low";
}

function statusFromCategory(cat, subject) {
  const subj = subject || "";
  if (/resolved|closed|done|fixed|completed/i.test(subj)) return "resolved";
  if (cat === "Injury / Safety") return "awaiting_internal_action";
  if (cat === "Trainer Conduct") return "awaiting_internal_action";
  if (/refund|chargeback/i.test(subj)) return "escalated";
  if (cat === "Internal Systems") return "awaiting_internal_action";
  return "unresolved";
}

function sentimentFromPriority(priority, subject) {
  const subj = subject || "";
  const hasAngry = /upset|angry|furious|frustrated|unacceptable|disgusted|terrible|horrible/i.test(subj);
  const map = {
    Critical: { frustration_level: "Severe", churn_likelihood: "Very High" },
    High: { frustration_level: hasAngry ? "Severe" : "High", churn_likelihood: "High" },
    Medium: { frustration_level: "Medium", churn_likelihood: "Medium" },
    Low: { frustration_level: "Low", churn_likelihood: "Low" },
  };
  const s = map[priority] || map.Low;
  return {
    frustration_level: s.frustration_level,
    emotional_tone: priority === "Critical" || hasAngry ? "Frustrated and demanding immediate resolution." :
      priority === "High" ? "Concerned and seeking prompt action." :
      priority === "Medium" ? "Mildly dissatisfied, open to resolution." :
      "Neutral / professional.",
    churn_likelihood: s.churn_likelihood,
    risk_indicators: priority === "Critical" ? "High risk of public escalation or churn." :
      priority === "High" ? "Moderate risk of churn if unaddressed promptly." :
      "Low immediate risk.",
  };
}

function slaClassification(cat, priority) {
  if (priority === "Critical") return "Urgent — Respond within 2 hours";
  if (priority === "High") return "High Priority — Respond within 24 hours";
  if (cat === "Internal Systems") return "Internal Operations Memo";
  return "Standard — Respond within 48 hours";
}

function ownershipFromSender(from, cat) {
  const email = extractEmail(from);
  if (email.includes("shifa@")) return "Shifa Ali (Regional Operations)";
  if (email.includes("jimmeey@")) return "Jimmeey Gondaa (Corporate/Executive Leadership)";
  if (email.includes("mitali@")) return "Mitali Kumar (COO)";
  if (email.includes("shipra@")) return "Shipra Bhika (Bandra Studio)";
  if (email.includes("imran@")) return "Imran Shaikh (Mumbai)";
  if (email.includes("ayesha@")) return "Ayesha (Marketing/Social)";
  if (email.includes("akshay@")) return "Akshay Rane (Sales & Client Servicing)";
  if (email.includes("saachi@")) return "Saachi Shetty (Operations)";
  if (email.includes("vivaran@")) return "Vivaran Dhasmana (Mumbai Studio)";
  if (email.includes("zahur@") || email.includes("zaheer@")) return "Zahur / Zaheer (Mumbai Studio)";
  if (email.includes("nadiya@")) return "Nadiya Shaikh (Sales)";
  if (email.includes("deesha@")) return "Deesha Changwani (Finance/Operations)";
  if (email.includes("tahira@") || email.includes("taahira@")) return "Tahira Sayyed (Mumbai Studio)";
  if (email.includes("reyna") || email.includes("jagtiani")) return "Reyna Jagtiani (Sales)";
  if (email.includes("vahishta@")) return "Vahishta Fitter (Client Servicing)";
  if (email.includes("pushyank@")) return "Pushyank Nahar (Bengaluru)";
  if (email.includes("richard")) return "Richard (External/Trainer)";
  if (cat === "Internal Systems") return "Jimmeey (Corporate/Executive Leadership)";
  return "Studio Management";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const newTickets = [];

for (const thread of threads) {
  const msgs = thread.messages || [];
  if (msgs.length === 0) {
    // No metadata — create minimal ticket
    newTickets.push({
      ticket_id: ticketId(thread.thread_id),
      customer_name: "Unknown",
      customer_email: "unknown",
      date_opened: "unknown",
      last_response_date: "unknown",
      current_status: "unresolved",
      priority: "Low",
      sla_classification: "Standard — Respond within 48 hours",
      complaint_category: "Other",
      complaint_subcategory: "Internal Session Reporting / Post-Class Feedback",
      sentiment: sentimentFromPriority("Low", ""),
      issue_summary: "Email thread — content unavailable (metadata only).",
      root_cause: "Unknown",
      key_customer_statements: [],
      internal_risk_flags: [],
      recommended_actions: ["Review thread manually."],
      response_strategy: "Manual review required.",
      suggested_reply: "N/A",
      sla_aging: "Unknown",
      ownership: "Studio Management",
      unknowns: "Full email body not accessible.",
      _thread_id: thread.thread_id,
    });
    continue;
  }

  const firstMsg = msgs[0];
  const lastMsg = msgs[msgs.length - 1];
  const subject = firstMsg.subject || "(No Subject)";
  const from = firstMsg.from || "";
  const to = firstMsg.to || "";
  const dateOpened = parseDate(firstMsg.date);
  const lastResponseDate = msgs.length > 1 ? parseDate(lastMsg.date) : dateOpened;
  const senderName = extractName(from);
  const senderEmail = extractEmail(from);
  const isInternalSender = isInternal(from);

  const { category, subcategory } = categorize(subject, from, to, msgs);
  const priority = priorityFromCategory(category, subcategory, subject);
  const status = statusFromCategory(category, subject);
  const sentiment = sentimentFromPriority(priority, subject);
  const ownership = ownershipFromSender(from, category);

  // Determine customer name — for internal emails, use sender; for external, try to extract from subject
  let customerName = senderName;
  let customerEmail = senderEmail;

  // Try to extract client name from subject (e.g. "Client X's issue")
  const clientMatch = subject.match(/[Cc]lient\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (clientMatch && !isInternalSender) {
    customerName = clientMatch[1];
  } else if (clientMatch && isInternalSender) {
    customerName = clientMatch[1] + " (via " + senderName.trim() + ")";
    customerEmail = "unknown";
  }

  // Key statements derived from subject
  const keyStatements = [subject];
  if (msgs.length > 1) keyStatements.push(`Thread has ${msgs.length} messages (${dateOpened} to ${lastResponseDate})`);

  // Recommended actions based on category
  const actionMap = {
    "Injury / Safety": [
      "Review incident details with studio manager.",
      "File formal incident report.",
      "Follow up with affected client/staff within 24 hours.",
    ],
    "Trainer Conduct": [
      "Speak with trainer privately regarding the incident.",
      "Document complaint in HR file.",
      "Follow up with reporting staff/client.",
    ],
    "Class Quality": [
      "Acknowledge feedback from client.",
      "Brief instructor on client preferences.",
      "Schedule follow-up check-in.",
    ],
    "Facility / Hygiene": [
      "Inspect reported facility issue.",
      "Schedule maintenance if required.",
      "Notify studio manager.",
    ],
    "Booking / Scheduling": [
      "Verify booking records.",
      "Coordinate with scheduling team.",
      "Offer alternative solution to client.",
    ],
    "Access / Check-in": [
      "Review access logs for the reported date.",
      "Clarify late entry policy with client.",
    ],
    "Communication Gap": [
      "Ensure follow-up is completed.",
      "Update CRM with current status.",
      "Set internal reminder for lead conversion.",
    ],
    "Internal Systems": [
      "Review and address the reported operational issue.",
      "Coordinate with relevant department head.",
      "Document resolution in internal records.",
    ],
    "Other": [
      "Review thread and determine appropriate action.",
      "Assign to relevant department.",
    ],
  };

  newTickets.push({
    ticket_id: ticketId(thread.thread_id),
    customer_name: customerName,
    customer_email: customerEmail,
    date_opened: dateOpened,
    last_response_date: lastResponseDate,
    current_status: status,
    priority,
    sla_classification: slaClassification(category, priority),
    complaint_category: category,
    complaint_subcategory: subcategory,
    sentiment,
    issue_summary: `[${subject}] — ${category}: ${subcategory}. Reported by ${senderName} on ${dateOpened}.${msgs.length > 1 ? ` Thread spans ${msgs.length} messages through ${lastResponseDate}.` : ""}`,
    root_cause: category === "Internal Systems" ? "Internal operational process or system issue." :
      category === "Injury / Safety" ? "Physical incident or security breach at studio." :
      category === "Trainer Conduct" ? "Staff conduct or performance concern." :
      category === "Class Quality" ? "Class experience did not meet client expectations." :
      category === "Facility / Hygiene" ? "Facility maintenance or hygiene concern." :
      category === "Booking / Scheduling" ? "Scheduling conflict or booking process failure." :
      category === "Communication Gap" ? "Internal communication or follow-up failure." :
      "Miscellaneous operational issue.",
    key_customer_statements: keyStatements,
    internal_risk_flags: priority === "Critical" ? ["Urgent escalation required", "High churn/PR risk"] :
      priority === "High" ? ["Prompt action required"] : [],
    recommended_actions: actionMap[category] || actionMap["Other"],
    response_strategy: isInternalSender ?
      "Internal managerial review and operational follow-through required." :
      "Client-facing response required; acknowledge concern and outline resolution steps.",
    suggested_reply: isInternalSender ? "N/A — Internal thread." :
      `Dear ${customerName.split(" ")[0]}, thank you for bringing this to our attention. We are reviewing your concern regarding "${subject}" and will respond within 24 hours.`,
    sla_aging: `${dateOpened} — ${msgs.length} message(s)`,
    ownership,
    unknowns: "Full email body not accessible via current API scope; categorization based on subject and sender metadata.",
    _thread_id: thread.thread_id,
  });
}

// Merge with existing 80 tickets (existing take priority)
const existingIds = new Set(existing.map(t => t._thread_id));
const merged = [
  ...existing,
  ...newTickets.filter(t => !existingIds.has(t._thread_id)),
].map((ticket) => ({
  ...ticket,
  ...classifyEmailType(ticket),
}));

writeFileSync("public/data/tickets.json", JSON.stringify(merged, null, 2));
console.log(`Done! Existing: ${existing.length}, New: ${newTickets.length}, Total: ${merged.length}`);

// Stats
const cats = {};
for (const t of newTickets) cats[t.complaint_category] = (cats[t.complaint_category] || 0) + 1;
console.log("\nNew ticket categories:");
Object.entries(cats).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

const pris = {};
for (const t of newTickets) pris[t.priority] = (pris[t.priority] || 0) + 1;
console.log("\nPriority breakdown:");
Object.entries(pris).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
