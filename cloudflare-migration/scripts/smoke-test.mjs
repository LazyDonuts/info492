// Usage: node scripts/smoke-test.mjs <base-url> [--batch]
// Read-only checks by default. --batch sends one 2-record development batch to the
// real AI provider and consumes public allowance.
const base = (process.argv[2] || "").replace(/\/$/, "");
if (!base) throw new Error("Usage: node scripts/smoke-test.mjs https://your-worker.workers.dev [--batch]");
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};
const pages = "https://micahsantos51.github.io";

const config = await fetch(`${base}/api/config`, { headers: { Origin: pages } });
const cfg = await config.json();
check("GET /api/config 200 with CORS for Pages origin", config.status === 200 && config.headers.get("access-control-allow-origin") === pages);
check("provider configured", cfg.configured === true, cfg.setup || `${cfg.metadata?.provider} · ${cfg.metadata?.model}`);
console.log(`      config_hash ${cfg.metadata?.config_hash}\n      access mode ${cfg.access?.mode}`);
if (cfg.access?.limits) console.log(`      allowance ${JSON.stringify(cfg.access.limits)}`);
const jev = await (await fetch(`${base}/api/jev/config`)).json();
check("Jev configured, no token required", jev.configured === true && jev.token_required === false);
check("unknown origin rejected", (await fetch(`${base}/api/config`, { headers: { Origin: "https://attacker.example" } })).status === 403);
check("/api/models requires token", (await fetch(`${base}/api/models`)).status === 401);
check("/.env not served", (await fetch(`${base}/.env`)).status === 404);
check("server code not served", (await fetch(`${base}/server/agent.js`)).status === 404);
for (const page of ["/", "/demo2.html", "/demo3.html", "/dashboard.html", "/info492/demo2.html", "/data/demo2-config.json", "/js/demo2.js"]) {
  const r = await fetch(base + page);
  check(`GET ${page} 200`, r.status === 200, r.headers.get("content-type") || "");
}
const bad = await fetch(`${base}/api/assess`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records: [{}], config_hash: "x" }) });
check("invalid batch rejected before any provider call", [400, 401, 409].includes(bad.status), `HTTP ${bad.status}`);

if (process.argv.includes("--batch")) {
  const narrative = "The request asks for a dimension clarification for the affected panels. Additional fabrication would cause replacement cost. Production is scheduled before normal review.";
  const records = [1, 2].map((i) => ({ rfi_id: `SMOKE-${i}`, title: "Smoke test panel dimension", description: narrative, submitted_date: "2026-10-01", provenance: "Synthetic smoke test" }));
  const started = Date.now();
  const res = await fetch(`${base}/api/assess`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records, config_hash: cfg.metadata.config_hash }) });
  check("batch accepted as NDJSON stream", res.status === 200 && (res.headers.get("content-type") || "").includes("ndjson"), `HTTP ${res.status}`);
  if (res.ok) {
    const decoder = new TextDecoder();
    let buffer = "", events = 0, items = 0, completed = false;
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let i;
      while ((i = buffer.indexOf("\n")) >= 0) {
        const event = JSON.parse(buffer.slice(0, i));
        buffer = buffer.slice(i + 1);
        events++;
        if (event.event === "item") { items++; console.log(`      +${((Date.now() - started) / 1000).toFixed(1)}s item ${event.result.rfi_id}: ${event.result.assessment_state} ${event.result.priority ?? ""}`); }
        if (event.event === "completed") completed = true;
      }
    }
    check("items streamed progressively and completed", completed && items === 2, `${events} events`);
  }
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
