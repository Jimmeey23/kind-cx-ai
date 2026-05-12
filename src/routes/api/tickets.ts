import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tickets")({
  server: {
    handlers: {
      GET: async () => {
        // Prefer the live, continuously-updated file in /tmp; fall back to the
        // snapshot bundled in public/data so the app still works in production.
        const { readFileSync, existsSync } = await import("node:fs");
        const { join } = await import("node:path");
        const live = "/tmp/tickets.json";
        const snapshotPaths = [
          "public/data/tickets.json",
          ".output/public/data/tickets.json",
          "../public/data/tickets.json",
          join(process.cwd(), "public/data/tickets.json"),
          join(process.cwd(), ".output/public/data/tickets.json"),
          join(process.cwd(), "../public/data/tickets.json"),
        ];
        const path = existsSync(live)
          ? live
          : snapshotPaths.find((candidate) => existsSync(candidate));
        try {
          if (!path) throw new Error("tickets snapshot not found");
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
