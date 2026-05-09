import { writeFileSync, readFileSync, existsSync } from "fs";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const OUTPUT_FILE = "scripts/threads-metadata.json";
const PROGRESS_FILE = "scripts/fetch-progress.json";

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN, grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) { console.error("Token error:", data); process.exit(1); }
  return data.access_token;
}

async function gmailGet(token, path) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

function getHeader(headers, name) {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

async function main() {
  const token = await getAccessToken();
  console.log("Got access token");

  const existing = JSON.parse(readFileSync("public/data/tickets.json", "utf-8"));
  const existingIds = new Set(existing.map(t => t._thread_id).filter(Boolean));

  // Load already-fetched metadata
  let fetched = existsSync(OUTPUT_FILE) ? JSON.parse(readFileSync(OUTPUT_FILE, "utf-8")) : [];
  const fetchedIds = new Set(fetched.map(t => t.thread_id));
  console.log(`Already fetched: ${fetched.length}`);

  // Load thread ID list
  const progress = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
  const allNewIds = progress.newThreadIds;
  const remaining = allNewIds.filter(id => !fetchedIds.has(id));
  console.log(`Remaining to fetch: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log("All done!"); process.exit(0);
  }

  const BATCH = 150;
  const batch = remaining.slice(0, BATCH);

  for (let i = 0; i < batch.length; i++) {
    const id = batch[i];
    try {
      const thread = await gmailGet(token,
        `threads/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date&metadataHeaders=Cc`
      );
      const messages = (thread.messages || []).map(msg => {
        const h = msg.payload?.headers || [];
        return {
          id: msg.id,
          from: getHeader(h, "From"),
          to: getHeader(h, "To"),
          cc: getHeader(h, "Cc"),
          subject: getHeader(h, "Subject"),
          date: getHeader(h, "Date"),
          labelIds: msg.labelIds || [],
          sizeEstimate: msg.sizeEstimate,
          internalDate: msg.internalDate,
        };
      });
      fetched.push({ thread_id: id, messages });
    } catch (e) {
      console.error(`Error on ${id}:`, e.message);
      fetched.push({ thread_id: id, messages: [], _error: e.message });
    }
    if ((i + 1) % 30 === 0) console.log(`Fetched ${fetched.length} total`);
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(fetched, null, 2));
  const stillLeft = allNewIds.filter(id => !new Set(fetched.map(t=>t.thread_id)).has(id));
  console.log(`Saved ${fetched.length}. Still remaining: ${stillLeft.length}`);
  if (stillLeft.length > 0) console.log("Run again to continue.");
  else console.log("ALL DONE fetching metadata!");
}

main().catch(e => { console.error(e); process.exit(1); });
