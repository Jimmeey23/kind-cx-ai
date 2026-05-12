const CX_CATEGORIES = new Set([
  "Access / Check-in",
  "Booking / Scheduling",
  "Class Quality",
  "Facility / Hygiene",
  "Injury / Safety",
  "Trainer Conduct",
]);

const INTERNAL_DOMAINS = [
  "physique57india.com",
  "physique57mumbai.com",
  "physique57bengaluru.com",
  "copperandcloves.com",
];

function textFor(ticket) {
  return [
    ticket.complaint_category,
    ticket.complaint_subcategory,
    ticket.issue_summary,
    ticket.root_cause,
    ...(ticket.key_customer_statements || []),
  ]
    .filter(Boolean)
    .join(" ");
}

function isInternalEmail(email = "") {
  const normalized = String(email).toLowerCase();
  return INTERNAL_DOMAINS.some((domain) => normalized.includes(domain)) ||
    normalized.includes("jagtianireyna@gmail.com");
}

function hasAny(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

export const EMAIL_TYPES = [
  "Member Feedback",
  "Complaint",
  "Issue",
  "Incident",
  "Internal Operations",
  "Sales / Lead Intelligence",
  "Hosted Class Report",
  "Marketing / Partnership",
  "Finance / Reconciliation",
  "HR / Admin",
  "Ignore / Archive",
];

export const INTELLIGENCE_BUCKETS = [
  "CX Ticket",
  "Member Voice",
  "Business Intelligence",
  "Admin Workflow",
  "Needs Review",
];

export function classifyEmailType(ticket) {
  const text = textFor(ticket);
  const category = ticket.complaint_category || "";
  const subcategory = ticket.complaint_subcategory || "";
  const internalSender = isInternalEmail(ticket.customer_email);
  const reasons = [];

  if (category === "Injury / Safety" || hasAny([/theft|stolen|missing cash|assault|harass|faint|injur|emergency|incident/i], text)) {
    reasons.push("Safety, security, or incident language detected.");
    return {
      email_type: "Incident",
      intelligence_bucket: "CX Ticket",
      cx_ticket_confidence: "High",
      cx_ticket_qualified: true,
      classification_reasons: reasons,
    };
  }

  if (hasAny([/payroll|salary|appraisal|performance review|maternity|resignation|notice period|candidate|screened and selected/i], text)) {
    reasons.push("HR, hiring, payroll, or employment administration language detected.");
    return {
      email_type: "HR / Admin",
      intelligence_bucket: "Admin Workflow",
      cx_ticket_confidence: "High",
      cx_ticket_qualified: false,
      classification_reasons: reasons,
    };
  }

  if (hasAny([/payment reconciliation|reconcil|upi|cash deposit|invoice|billing|bank details|amount received|confirm if we have received/i], text)) {
    reasons.push("Finance reconciliation or payment administration language detected.");
    return {
      email_type: "Finance / Reconciliation",
      intelligence_bucket: "Admin Workflow",
      cx_ticket_confidence: "High",
      cx_ticket_qualified: false,
      classification_reasons: reasons,
    };
  }

  if (hasAny([/hosted class|host class|attendees|total signups|lead tracking|lead feedback|package sales|drop-ins|conversion/i], text)) {
    const hasServiceFailure = hasAny([/complain|dissatisf|upset|denied|walked out|late start|no.?show|overbook|injur|missing/i], text);
    reasons.push("Hosted Signature Partnership Experience or lead summary detected.");
    return {
      email_type: "Hosted Class Report",
      intelligence_bucket: hasServiceFailure ? "Member Voice" : "Business Intelligence",
      cx_ticket_confidence: hasServiceFailure ? "Medium" : "High",
      cx_ticket_qualified: hasServiceFailure,
      classification_reasons: hasServiceFailure
        ? [...reasons, "Contains service-friction language that may need CX follow-up."]
        : reasons,
    };
  }

  if (hasAny([/marketing|campaign|creative|collateral|standee|social media|content|ads|launch|community wall|influencer|partnership|collaboration|b2b|corporate|association/i], text)) {
    reasons.push("Marketing, creative, campaign, or partnership planning language detected.");
    return {
      email_type: "Marketing / Partnership",
      intelligence_bucket: "Business Intelligence",
      cx_ticket_confidence: "High",
      cx_ticket_qualified: false,
      classification_reasons: reasons,
    };
  }

  if (hasAny([/mom|minutes of meeting|meeting notes|handover|sop|standard operating|checklist|zoho|hris|crm|database|momence|process implementation|workflow approval/i], text)) {
    const systemIssue = hasAny([/does not give accurate data|issue|missing|not working|gap|delay|error|access/i], text);
    reasons.push("Internal process, meeting, system, SOP, or workflow language detected.");
    return {
      email_type: "Internal Operations",
      intelligence_bucket: systemIssue ? "Admin Workflow" : "Business Intelligence",
      cx_ticket_confidence: systemIssue ? "Medium" : "High",
      cx_ticket_qualified: false,
      classification_reasons: reasons,
    };
  }

  if (category === "Communication Gap" || hasAny([/lead|prospect|trial|new member handover|sales|follow.?up/i], text)) {
    reasons.push("Sales, prospect, or follow-up intelligence detected.");
    return {
      email_type: "Sales / Lead Intelligence",
      intelligence_bucket: "Business Intelligence",
      cx_ticket_confidence: "Medium",
      cx_ticket_qualified: false,
      classification_reasons: reasons,
    };
  }

  if (CX_CATEGORIES.has(category) || hasAny([/complain|concern|dissatisf|upset|frustrat|denied|walked out|too loud|too cold|too hot|dirty|late|no.?show/i], text)) {
    const complaint = hasAny([/complain|dissatisf|upset|frustrat|unacceptable|denied|walked out/i], text);
    reasons.push("Member-facing service concern language detected.");
    return {
      email_type: complaint ? "Complaint" : "Issue",
      intelligence_bucket: "CX Ticket",
      cx_ticket_confidence: internalSender ? "Medium" : "High",
      cx_ticket_qualified: true,
      classification_reasons: internalSender
        ? [...reasons, "Internal sender appears to be documenting member voice."]
        : reasons,
    };
  }

  if (internalSender || category === "Internal Systems") {
    reasons.push("Internal sender or internal systems category without direct member-impact language.");
    return {
      email_type: "Internal Operations",
      intelligence_bucket: "Needs Review",
      cx_ticket_confidence: "Low",
      cx_ticket_qualified: false,
      classification_reasons: reasons,
    };
  }

  reasons.push("No strong feedback, complaint, issue, incident, or admin pattern matched.");
  return {
    email_type: "Member Feedback",
    intelligence_bucket: "Needs Review",
    cx_ticket_confidence: "Low",
    cx_ticket_qualified: false,
    classification_reasons: reasons,
  };
}
