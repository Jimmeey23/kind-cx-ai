/**
 * Google Apps Script — Export Issues/Complaints threads to a Google Sheet
 * 
 * HOW TO USE:
 * 1. Go to https://script.google.com → New Project
 * 2. Paste this entire script
 * 3. Click Run → "exportEmailsToSheet"
 * 4. Authorize when prompted (allow Gmail + Sheets access)
 * 5. After it finishes, share the resulting Google Sheet link with the agent
 */

function exportEmailsToSheet() {
  const LABEL_NAME = "Issues/Complaints";
  const MAX_THREADS = 500; // adjust if needed

  // Create or get output sheet
  const ss = SpreadsheetApp.create("P57 Issues Complaints Export — " + new Date().toDateString());
  const sheet = ss.getActiveSheet();
  sheet.setName("Threads");

  // Headers
  sheet.appendRow([
    "thread_id",
    "message_count",
    "subject",
    "from_name",
    "from_email",
    "to",
    "date_opened",
    "last_response_date",
    "body_first_message",
    "body_last_message",
    "all_senders",
  ]);

  const label = GmailApp.getUserLabelByName(LABEL_NAME);
  if (!label) {
    Browser.msgBox("Label '" + LABEL_NAME + "' not found. Check the label name.");
    return;
  }

  let processed = 0;
  let start = 0;
  const batchSize = 50;

  while (processed < MAX_THREADS) {
    const threads = label.getThreads(start, batchSize);
    if (threads.length === 0) break;

    for (const thread of threads) {
      const messages = thread.getMessages();
      const first = messages[0];
      const last = messages[messages.length - 1];

      const fromFull = first.getFrom() || "";
      const fromEmail = fromFull.match(/<([^>]+)>/)?.[1] || fromFull;
      const fromName = fromFull.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || fromEmail;

      // Get body text — strip HTML tags, limit to 3000 chars
      function cleanBody(msg) {
        try {
          let body = msg.getPlainBody() || msg.getBody() || "";
          body = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          return body.slice(0, 3000);
        } catch (e) {
          return "(error reading body)";
        }
      }

      const allSenders = messages
        .map(m => m.getFrom())
        .filter((v, i, a) => a.indexOf(v) === i)
        .join("; ");

      sheet.appendRow([
        thread.getId(),
        messages.length,
        first.getSubject() || "(no subject)",
        fromName,
        fromEmail,
        first.getTo() || "",
        first.getDate().toISOString().slice(0, 10),
        last.getDate().toISOString().slice(0, 10),
        cleanBody(first),
        messages.length > 1 ? cleanBody(last) : "",
        allSenders,
      ]);

      processed++;
    }

    start += batchSize;
    Utilities.sleep(500); // avoid rate limits
    Logger.log("Processed " + processed + " threads so far...");
  }

  Logger.log("Done! Sheet: " + ss.getUrl());
  Browser.msgBox("Done! " + processed + " threads exported.\n\nSheet URL:\n" + ss.getUrl());
}
