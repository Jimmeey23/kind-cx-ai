import { writeFileSync, readFileSync, existsSync } from "fs";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const PROGRESS_FILE = "scripts/fetch-progress.json";
const OUTPUT_FILE = "scripts/new-threads.json";

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

async function fetchBatch(token, ids, startIdx) {
  const results = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const thread = await gmailGet(token, `threads/${id}?format=full`);
      const msgs = thread.messages || [];
      results.push({
        thread_id: id,
        messages: msgs.map(msg => {
          const h = msg.payload?.headers || [];
          return {
            id: msg.id,
            from: getHeader(h, "From"),
            to: getHeader(h, "To"),
            subject: getHeader(h, "Subject"),
            date: getHeader(h, "Date"),
            body: extractText(msg.payload).slice(0, 4000),
          };
        }),
      });
    } catch (e) {
      console.error(`Error fetching thread ${id}:`, e.message);
      results.push({ thread_id: id, messages: [], _error: e.message });
    }
    if ((startIdx + i + 1) % 20 === 0) {
      console.log(`Fetched ${startIdx + i + 1} threads total`);
    }
  }
  return results;
}

async function main() {
  const token = await getAccessToken();
  console.log("Got access token");

  // Load existing thread IDs
  const existing = JSON.parse(readFileSync("public/data/tickets.json", "utf-8"));
  const existingIds = new Set(existing.map(t => t._thread_id).filter(Boolean));

  // Load progress (already-fetched threads)
  let fetched = [];
  let fetchedIds = new Set();
  if (existsSync(OUTPUT_FILE)) {
    fetched = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
    fetchedIds = new Set(fetched.map(t => t.thread_id));
    console.log(`Resuming: already fetched ${fetched.length} threads`);
  }

  // Load progress state
  let allNewThreadIds = [];
  if (existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    allNewThreadIds = progress.newThreadIds;
    console.log(`Loaded ${allNewThreadIds.length} new thread IDs from progress file`);
  } else {
    // Find the label
    const labels = await gmailGet(token, "labels");
    const label = labels.labels?.find(l =>
      l.name?.toLowerCase().includes("issues") ||
      l.name?.toLowerCase().includes("complaint")
    );
    if (!label) {
      console.error("Could not find Issues/Complaints label");
      process.exit(1);
    }
    console.log("Found label:", label.name, label.id);

    // List all threads
    let threads = [];
    let pageToken = undefined;
    do {
      const url = `threads?labelIds=${label.id}&maxResults=500${pageToken ? "&pageToken=" + pageToken : ""}`;
      const data = await gmailGet(token, url);
      if (data.threads) threads = threads.concat(data.threads);
      pageToken = data.nextPageToken;
    } while (pageToken);

    console.log("Total threads in label:", threads.length);
    allNewThreadIds = threads.filter(t => !existingIds.has(t.id)).map(t => t.id);
    console.log("New (unprocessed) threads:", allNewThreadIds.length);

    writeFileSync(PROGRESS_FILE, JSON.stringify({ newThreadIds: allNewThreadIds }, null, 2));
  }

  // Find IDs not yet fetched
  const remaining = allNewThreadIds.filter(id => !fetchedIds.has(id));
  console.log(`Remaining to fetch: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log("All threads already fetched!");
    console.log(`Total fetched: ${fetched.length}`);
    process.exit(0);
  }

  // Fetch next batch (up to 90 threads per run to stay within time limits)
  const BATCH_SIZE = 90;
  const batch = remaining.slice(0, BATCH_SIZE);
  const startIdx = fetched.length;

  const newResults = await fetchBatch(token, batch, startIdx);
  fetched = fetched.concat(newResults);

  writeFileSync(OUTPUT_FILE, JSON.stringify(fetched, null, 2));
  console.log(`Saved ${fetched.length} threads total to ${OUTPUT_FILE}`);

  const stillRemaining = allNewThreadIds.filter(id => !new Set(fetched.map(t => t.thread_id)).has(id));
  console.log(`Still remaining after this run: ${stillRemaining.length}`);
  if (stillRemaining.length > 0) {
    console.log("Run the script again to continue fetching.");
  } else {
    console.log("ALL DONE fetching! Ready for categorization.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
