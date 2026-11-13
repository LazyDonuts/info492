// Cloudflare Workers entry point. Routes, status codes, messages and headers
// mirror server/index.js; only the runtime plumbing differs.
import { timingSafeEqual } from "node:crypto";
import { makeAgent } from "../server/agent.js";
import { MAX_BYTES } from "../js/demo2-core.js";
import {
  createJevPriorityService,
  JevPriorityError,
  validateJevPriorityRequest,
} from "../server/jev-priority.js";
import { RUBRIC, SOURCE_TEXTS } from "./sources.js";
export { Limits } from "./limits.js";

const encoder = new TextEncoder();
const DEFAULT_ORIGINS =
  "https://micahsantos51.github.io,https://lazydonuts.github.io,http://127.0.0.1:4922,http://localhost:4922,http://127.0.0.1:4920";
// Same allowlist as server/index.js (plus signin.html, which dashboard.js redirects to).
const PUBLIC_FILES =
  /^(index\.html|signin\.html|workspace\.html|dashboard\.html|demo2\.html|demo3\.html|methodology\.html|(?:css|js|data|docs|eval)\/[A-Za-z0-9_./-]+)$/;

let shared;
function app(env) {
  if (shared) return shared;
  const providerFetch = (...args) => fetch(...args);
  shared = {
    agent: makeAgent({ env, rubric: RUBRIC, providerFetch, sourceTexts: SOURCE_TEXTS }),
    jev: createJevPriorityService({
      apiKey: env.JEV_API_KEY,
      model: env.JEV_MODEL || "jev-latest",
      fetchImpl: providerFetch,
    }),
    origins: (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map((s) => s.trim()),
    providerFetch,
  };
  return shared;
}

function tokenMatches(request, env) {
  const given = encoder.encode(request.headers.get("authorization") || "");
  const expected = encoder.encode(`Bearer ${env.DEMO2_ACCESS_TOKEN || ""}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Read a JSON body with the same 256 KB cap, content-type and UTF-8 rules as before.
async function readJson(request, json) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || ""))
    return { response: json(415, { error: "Use application/json." }) };
  const reader = request.body?.getReader();
  const chunks = [];
  let bytes = 0;
  if (reader)
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > MAX_BYTES) {
        reader.cancel().catch(() => {});
        return { response: json(413, { error: "Request exceeds 256 KB." }) };
      }
      chunks.push(value);
    }
  const all = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return { body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(all)) };
  } catch {
    return { response: json(400, { error: "Invalid UTF-8 JSON request." }) };
  }
}

async function handle(request, env, ctx) {
  const { agent, jev, origins, providerFetch } = app(env);
  const limits = env.LIMITS.get(env.LIMITS.idFromName("global"));
  const publicDemo = env.DEMO2_PUBLIC_DEMO === "true";
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  const json = (status, data, extra = {}) => {
    const h = new Headers(headers);
    h.set("Content-Type", "application/json");
    for (const [k, v] of Object.entries(extra)) h.set(k, v);
    return new Response(JSON.stringify(data), { status, headers: h });
  };
  // This Worker's own HTTPS origin is allowed (the former RENDER_EXTERNAL_URL behavior).
  const allowed = origins.includes(origin) || (url.protocol === "https:" && origin === url.origin);
  if (origin && !allowed)
    return json(403, { error: "Origin not allowed. Configure ALLOWED_ORIGINS on the backend." });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const path = url.pathname;
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  try {
    if (path === "/api/config" && request.method === "GET")
      return json(200, {
        ...agent.config(),
        access: {
          mode: publicDemo ? "public_demo" : "team_token",
          token_required: !publicDemo,
          ...(publicDemo ? { limits: await limits.publicStatus() } : {}),
        },
      });

    if (path === "/api/jev/config" && request.method === "GET")
      return json(200, {
        configured: jev.configured,
        model: jev.model,
        token_required: false,
        limits: { per_hour: 50, per_utc_day: 250 },
      });

    if (path === "/api/jev/classify" && request.method === "POST") {
      if (!jev.configured)
        return json(503, { error: "Jev priority classification is not configured." });
      const parsed = await readJson(request, json);
      if (parsed.response) return parsed.response;
      let validated;
      try {
        validated = validateJevPriorityRequest(parsed.body);
      } catch (error) {
        return json(error.status || 400, { error: error.message });
      }
      const reservation = await limits.jevReserve(address);
      if (!reservation.allowed)
        return json(
          429,
          { error: "Shared Jev demo limit reached. Keep your input and try later.", retry_after: reservation.retry_after },
          { "Retry-After": String(reservation.retry_after) },
        );
      try {
        const evaluation = await jev.classify(validated.evaluation_input);
        return json(200, { rfi_id: validated.rfi_id, evaluation });
      } catch (error) {
        const status = error instanceof JevPriorityError ? error.status : 502;
        return json(status, { error: error.message || "Jev classification failed." });
      }
    }

    // Operator metadata lookup; never returns prompts, keys or provider bodies.
    if (path === "/api/models" && request.method === "GET") {
      if (env.AI_PROVIDER !== "gemini" || !env.GEMINI_API_KEY)
        return json(503, { error: "Gemini configuration required." });
      if (!(env.DEMO2_ACCESS_TOKEN?.length >= 32) || !tokenMatches(request, env))
        return json(401, { error: "Team access token required." });
      const response = await providerFetch(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
        { headers: { "x-goog-api-key": env.GEMINI_API_KEY }, signal: AbortSignal.timeout(15000) },
      );
      if (!response.ok)
        return json(502, { error: `Gemini model discovery failed (HTTP ${response.status}).` });
      const data = await response.json();
      return json(200, {
        models: (data.models || [])
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => m.name)
          .filter((name) => /^models\/gemini-[A-Za-z0-9.-]+$/.test(name)),
        truncated: !!data.nextPageToken,
      });
    }

    if (path === "/api/assess" && request.method === "POST") {
      if (!(await limits.attempt(address)).allowed)
        return json(429, { error: "Request limit reached. Wait up to one hour." });
      const cfg = agent.config();
      if (!cfg.configured) return json(503, { error: cfg.setup });
      if (!publicDemo && !tokenMatches(request, env))
        return json(401, {
          error: "Enter a valid team access token. Never enter a provider API key in the browser.",
        });
      if (await limits.busy())
        return json(429, {
          error: "Backend batch budget or concurrency limit reached. Keep the set and retry later.",
        });
      const parsed = await readJson(request, json);
      if (parsed.response) return parsed.response;
      try {
        agent.validateRequest(parsed.body);
      } catch (error) {
        return json(error.status || 400, { error: error.message });
      }
      // Body reads yield: re-check atomically, then spend public allowance and take the slot.
      const slot = await limits.acquire(publicDemo);
      if (slot.status === "busy")
        return json(429, {
          error: "Another batch acquired the available slot. Keep your inputs and retry later.",
        });
      if (slot.status === "limited")
        return json(429, slot.reservation, { "Retry-After": String(slot.reservation.retry_after) });

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      let disconnected = false;
      const emit = (data) => {
        if (disconnected) return;
        writer.write(encoder.encode(JSON.stringify(data) + "\n")).catch(() => {
          disconnected = true;
        });
      };
      ctx.waitUntil(
        (async () => {
          try {
            await agent.assess(parsed.body, emit);
          } catch {
            emit({ event: "error", error: "Assessment failed. No replacement output was generated." });
          } finally {
            try { await limits.release(slot.id); } catch { /* lease expiry frees the slot */ }
            try { await writer.close(); } catch { /* client already gone */ }
          }
        })(),
      );
      const h = new Headers(headers);
      h.set("Content-Type", "application/x-ndjson; charset=utf-8");
      h.set("X-Accel-Buffering", "no");
      return new Response(readable, { status: 200, headers: h });
    }

    if (path.startsWith("/api/")) return json(404, { error: "Unknown API route." });
    if (request.method !== "GET" && request.method !== "HEAD")
      return json(405, { error: "Method not allowed." });
    // Only public site files, exactly as before. The build step also omits everything else.
    const local =
      decodeURIComponent(path).replace(/^\/info492(?=\/)/, "").replace(/^\//, "") || "index.html";
    if (!PUBLIC_FILES.test(local) || local.split("/").some((p) => p.startsWith(".")) || local.includes(".."))
      return json(404, { error: "Not found." });
    const asset = await env.ASSETS.fetch(new Request(new URL(`/${local}`, url), { method: request.method }));
    if (asset.status === 404) return json(404, { error: "Not found." });
    const h = new Headers(asset.headers);
    for (const [k, v] of headers) h.set(k, v);
    return new Response(request.method === "HEAD" ? null : asset.body, { status: asset.status, headers: h });
  } catch (error) {
    console.error("Request failed:", error?.name, error?.message); // never log bodies or tokens
    return json(404, { error: "Resource unavailable." });
  }
}

export default {
  fetch: (request, env, ctx) => handle(request, env, ctx),
};
