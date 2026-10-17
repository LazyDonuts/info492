import { publicDemoBudget } from "./public-demo.js";
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { timingSafeEqual } from "node:crypto";
import { makeAgent } from "./agent.js";
import { MAX_BYTES } from "../js/demo2-core.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function createServer({
  env = process.env,
  providerFetch = fetch,
  executionMode = "provider",
  now = Date.now,
} = {}) {
  const rubric = await readFile(
    resolve(root, "docs/RFI-PRIORITY-CRITERIA-v0.3.md"),
    "utf8",
  );
  const agent = makeAgent({ env, rubric, providerFetch, executionMode });
  const origins = (
    env.ALLOWED_ORIGINS ||
    "http://127.0.0.1:4922,http://localhost:4922,http://127.0.0.1:4920"
  )
    .split(",")
    .map((s) => s.trim());
  // Render supplies the service's own HTTPS origin. Keep the Pages origin
  // explicitly allowlisted while allowing the same app served by the backend.
  if (env.RENDER_EXTERNAL_URL) {
    const service = new URL(env.RENDER_EXTERNAL_URL);
    if (service.protocol === "https:") origins.push(service.origin);
  }
  const publicDemo = env.DEMO2_PUBLIC_DEMO === "true";
  const publicBudget = publicDemoBudget(now);
  const config = () => ({ ...agent.config(), access: {
    mode: publicDemo ? "public_demo" : "team_token",
    token_required: !publicDemo,
    ...(publicDemo ? { limits: publicBudget.status() } : {}),
  } });
  const attempts = new Map();
  let globalCount = 0,
    windowStart = Date.now(),
    active = 0;
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const json = (status, data) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (origin && !origins.includes(origin))
      return json(403, {
        error: "Origin not allowed. Configure ALLOWED_ORIGINS on the backend.",
      });
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    const path = new URL(req.url, "http://localhost").pathname;
    try {
      if (path === "/api/config" && req.method === "GET")
        return json(200, config());
      // Operator metadata lookup: no prompts, keys or provider response bodies
      // are returned. Use it to select an actually available Gemini model.
      if (path === "/api/models" && req.method === "GET") {
        if (env.AI_PROVIDER !== "gemini" || !env.GEMINI_API_KEY)
          return json(503, { error: "Gemini configuration required." });
        const token = Buffer.from(req.headers.authorization || "");
        const expected = Buffer.from(`Bearer ${env.DEMO2_ACCESS_TOKEN || ""}`);
        if (
          !(env.DEMO2_ACCESS_TOKEN?.length >= 32) ||
          token.length !== expected.length ||
          !timingSafeEqual(token, expected)
        )
          return json(401, { error: "Team access token required." });
        const response = await providerFetch(
          "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
          {
            headers: { "x-goog-api-key": env.GEMINI_API_KEY },
            signal: AbortSignal.timeout(15000),
          },
        );
        if (!response.ok)
          return json(502, {
            error: `Gemini model discovery failed (HTTP ${response.status}).`,
          });
        const data = await response.json();
        return json(200, {
          models: (data.models || [])
            .filter((m) =>
              m.supportedGenerationMethods?.includes("generateContent"),
            )
            .map((m) => m.name)
            .filter((name) => /^models\/gemini-[A-Za-z0-9.-]+$/.test(name)),
          truncated: !!data.nextPageToken,
        });
      }
      if (path === "/api/assess" && req.method === "POST") {
        const current = Date.now();
        if (current - windowStart > 3600000) {
          windowStart = current;
          globalCount = 0;
          attempts.clear();
        }
        const address = req.socket.remoteAddress;
        const count = attempts.get(address) || 0;
        if (count >= 15)
          return json(429, {
            error: "Request limit reached. Wait up to one hour.",
          });
        attempts.set(address, count + 1);
        if (!agent.config().configured)
          return json(503, { error: agent.config().setup });
        const token = Buffer.from(req.headers.authorization || ""),
          expected = Buffer.from(`Bearer ${env.DEMO2_ACCESS_TOKEN}`);
        if (!publicDemo && (
          token.length !== expected.length ||
          !timingSafeEqual(token, expected)
        ))
          return json(401, {
            error:
              "Enter a valid team access token. Never enter a provider API key in the browser.",
          });
        if (globalCount >= 20 || active >= 1)
          return json(429, {
            error:
              "Backend batch budget or concurrency limit reached. Keep the set and retry later.",
          });
        if (
          !/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")
        )
          return json(415, { error: "Use application/json." });
        let bytes = 0,
          chunks = [];
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > MAX_BYTES) {
            json(413, { error: "Request exceeds 256 KB." });
            return;
          }
          chunks.push(chunk);
        }
        let body;
        try {
          body = JSON.parse(
            new TextDecoder("utf-8", { fatal: true }).decode(
              Buffer.concat(chunks),
            ),
          );
        } catch {
          return json(400, { error: "Invalid UTF-8 JSON request." });
        }
        // Body reads yield: recheck atomically before reserving a provider batch.
        if (globalCount >= 20 || active >= 1)
          return json(429, {
            error:
              "Another batch acquired the available slot. Keep your inputs and retry later.",
          });
        if (publicDemo) {
          const reservation = publicBudget.reserve();
          if (!reservation.allowed) {
            res.setHeader("Retry-After", String(reservation.retry_after));
            return json(429, reservation);
          }
        }
        active++;
        globalCount++;
        let streaming = false,
          disconnected = false;
        res.on("close", () => {
          disconnected = true;
        });
        const emit = (data) => {
          if (disconnected) return;
          if (!streaming) {
            res.writeHead(200, {
              "Content-Type": "application/x-ndjson; charset=utf-8",
              "X-Accel-Buffering": "no",
            });
            streaming = true;
          }
          res.write(JSON.stringify(data) + "\n");
        };
        try {
          await agent.assess(body, emit);
          res.end();
        } catch (err) {
          if (streaming) {
            emit({
              event: "error",
              error: "Assessment failed. No replacement output was generated.",
            });
            res.end();
          } else json(err.status || 400, { error: err.message });
        } finally {
          active--;
        }
        return;
      }
      if (path.startsWith("/api/"))
        return json(404, { error: "Unknown API route." });
      if (req.method !== "GET" && req.method !== "HEAD")
        return json(405, { error: "Method not allowed." });
      // Only public site files. Never serve .env, backend code, tests or uploads.
      const local =
        decodeURIComponent(path)
          .replace(/^\/info492(?=\/)/, "")
          .replace(/^\//, "") || "index.html";
      if (
        !/^(index\.html|dashboard\.html|demo2\.html|methodology\.html|(?:css|js|data|docs|eval)\/[A-Za-z0-9_./-]+)$/.test(
          local,
        ) ||
        local.split("/").some((p) => p.startsWith(".")) ||
        local.includes("..")
      )
        return json(404, { error: "Not found." });
      const file = resolve(root, local);
      if (!(await stat(file)).isFile())
        return json(404, { error: "Not found." });
      const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json",
        ".csv": "text/csv; charset=utf-8",
        ".md": "text/plain; charset=utf-8",
        ".xlsx":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
      res.setHeader(
        "Content-Type",
        types[extname(file)] || "application/octet-stream",
      );
      res.writeHead(200);
      res.end(req.method === "HEAD" ? undefined : await readFile(file));
    } catch {
      if (!res.headersSent) json(404, { error: "Resource unavailable." });
      else res.end();
    }
  });
  server.requestTimeout = 240000;
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await createServer();
  server.listen(
    Number(process.env.PORT || 4922),
    process.env.HOST || "127.0.0.1",
    () =>
      console.log(
        `Demo 2 server listening on port ${process.env.PORT || 4922}. Provider configuration is reported by /api/config; no request bodies are logged.`,
      ),
  );
}
