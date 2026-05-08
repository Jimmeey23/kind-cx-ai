import { createFileRoute } from "@tanstack/react-router";
import { readFileSync, existsSync } from "fs";

export const Route = createFileRoute("/api/tickets")({
  server: {
    handlers: {
      GET: async () => {
        // Prefer the live, continuously-updated file in /tmp; fall back to the
        // snapshot bundled in public/data so the app still works in production.
        const live = "/tmp/tickets.json";
        const snapshot = "public/data/tickets.json";
        const path = existsSync(live) ? live : snapshot;
        try {
          const raw = readFileSync(path, "utf-8");
          return new Response(raw, {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          });
        } catch {
          return Response.json([]);
        }
      },
    },
  },
});
