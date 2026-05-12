import assert from "node:assert/strict";
import { classifyEmailType } from "./email-intelligence.mjs";

const cases = [
  {
    name: "classifies direct service failures as complaint tickets",
    input: {
      complaint_category: "Class Quality",
      complaint_subcategory: "Atmosphere / Music Volume",
      issue_summary: "Client walked out mid-class and reported that the music was too loud.",
      key_customer_statements: ["Client walked out because the music was too loud."],
      customer_email: "member@example.com",
    },
    expectedType: "Complaint",
    expectedBucket: "CX Ticket",
  },
  {
    name: "classifies missing items as incident tickets",
    input: {
      complaint_category: "Injury / Safety",
      complaint_subcategory: "Theft / Missing Items",
      issue_summary: "Client reported a missing cash envelope from her locker.",
      key_customer_statements: ["Missing cash from locker."],
      customer_email: "unknown",
    },
    expectedType: "Incident",
    expectedBucket: "CX Ticket",
  },
  {
    name: "classifies hosted class lead summaries outside CX ticket queue",
    input: {
      complaint_category: "Communication Gap",
      complaint_subcategory: "Hosted Class Lead Tracking",
      issue_summary: "Consolidated internal reporting for three hosted classes with attendee counts and lead potential.",
      key_customer_statements: ["33 total attendees across three dates."],
      customer_email: "jagtianireyna@gmail.com",
    },
    expectedType: "Hosted Class Report",
    expectedBucket: "Business Intelligence",
  },
  {
    name: "classifies payment confirmations as finance admin",
    input: {
      complaint_category: "Internal Systems",
      complaint_subcategory: "Payment Reconciliation",
      issue_summary: "Kindly confirm if we have received the UPI amount.",
      key_customer_statements: ["Kindly confirm if we have received the UPI amount."],
      customer_email: "deesha@physique57mumbai.com",
    },
    expectedType: "Finance / Reconciliation",
    expectedBucket: "Admin Workflow",
  },
  {
    name: "classifies marketing approvals outside CX ticket queue",
    input: {
      complaint_category: "Internal Systems",
      complaint_subcategory: "Marketing Campaign Launch & Internal Alignment",
      issue_summary: "Final creatives for Community Weekend need approval before launch.",
      key_customer_statements: ["Final creatives for Community Weekend."],
      customer_email: "ayesha@physique57mumbai.com",
    },
    expectedType: "Marketing / Partnership",
    expectedBucket: "Business Intelligence",
  },
];

for (const testCase of cases) {
  const result = classifyEmailType(testCase.input);
  assert.equal(result.email_type, testCase.expectedType, testCase.name);
  assert.equal(result.intelligence_bucket, testCase.expectedBucket, testCase.name);
}

console.log(`email-intelligence: ${cases.length} cases passed`);
