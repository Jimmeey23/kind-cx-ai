import { writeFileSync, readFileSync } from "fs";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error("Token error:", JSON.stringify(data));
    process.exit(1);
  }
  return data.access_token;
}

async function gmailGet(token, path) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

function decodeBody(part) {
  if (!part) return "";
  if (part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8");
  }
  if (part.parts) {
    return part.parts.map(decodeBody).join("\n");
  }
  return "";
}

function extractText(payload) {
  let text = "";
  const mime = payload.mimeType || "";
  if (mime === "text/plain" && payload.body?.data) {
    text = Buffer.from(payload.body.data, "base64url").toString("utf-8");
  } else if (mime === "text/html" && payload.body?.data) {
    const html = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } else if (payload.parts) {
    for (const p of payload.parts) {
      const t = extractText(p);
      if (t) { text += "\n" + t; break; }
    }
    if (!text) {
      for (const p of payload.parts) {
        text += "\n" + extractText(p);
      }
    }
  }
  return text.trim();
}

function getHeader(headers, name) {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

async function main() {
  const token = await getAccessToken();
  console.log("Got access token");

  // Find the Issues/Complaints label
  const labels = await gmailGet(token, "labels");
  console.log("All labels:", labels.labels?.map(l => `${l.id}: ${l.name}`).join("\n"));

  const label = labels.labels?.find(l =>
    l.name?.toLowerCase().includes("issues") ||
    l.name?.toLowerCase().includes("complaint") ||
    l.name?.toLowerCase().includes("issues/complaints")
  );
  if (!label) {
    console.error("Could not find Issues/Complaints label. Available:", labels.labels?.map(l => l.name).join(", "));
    process.exit(1);
  }
  console.log("Found label:", label.name, label.id);

  // Load existing thread IDs
  const existing = JSON.parse(readFileSync("public/data/tickets.json", "utf-8"));
  const existingIds = new Set(existing.map(t => t._thread_id).filter(Boolean));
  console.log("Existing thread IDs:", existingIds.size);

  // List all threads in the label (paginate)
  let threads = [];
  let pageToken = undefined;
  let page = 0;
  do {
    const url = `threads?labelIds=${label.id}&maxResults=500${pageToken ? "&pageToken=" + pageToken : ""}`;
    const data = await gmailGet(token, url);
    if (data.threads) threads = threads.concat(data.threads);
    pageToken = data.nextPageToken;
    page++;
    console.log(`Page ${page}: got ${data.threads?.length || 0} threads, total so far: ${threads.length}`);
  } while (pageToken);

  console.log("Total threads in label:", threads.length);

  // Find new (unprocessed) threads
  const newThreads = threads.filter(t => !existingIds.has(t.id));
  console.log("New (unprocessed) threads:", newThreads.length);

  if (newThreads.length === 0) {
    console.log("No new threads to process!");
    writeFileSync("scripts/new-threads.json", JSON.stringify([], null, 2));
    process.exit(0);
  }

  // Fetch full content for each new thread
  const results = [];
  for (let i = 0; i < newThreads.length; i++) {
    const { id } = newThreads[i];
    const thread = await gmailGet(token, `threads/${id}?format=full`);
    const msgs = thread.messages || [];

    const emailData = {
      thread_id: id,
      messages: msgs.map(msg => {
        const h = msg.payload?.headers || [];
        return {
          id: msg.id,
          from: getHeader(h, "From"),
          to: getHeader(h, "To"),
          subject: getHeader(h, "Subject"),
          date: getHeader(h, "Date"),
          body: extractText(msg.payload).slice(0, 3000),
        };
      }),
    };
    results.push(emailData);
    if ((i + 1) % 10 === 0) console.log(`Fetched ${i + 1}/${newThreads.length} threads`);
  }

  console.log(`Fetched full content for ${results.length} threads`);
  writeFileSync("scripts/new-threads.json", JSON.stringify(results, null, 2));
  console.log("Saved to scripts/new-threads.json");
}

main().catch(e => { console.error(e); process.exit(1); });
