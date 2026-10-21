import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server/index.js";
import { makeAgent } from "../server/agent.js";
import { packet, extraction } from "./demo2-fixtures.js";
const env = {
  OPENAI_API_KEY: "unit-test-provider-key-not-real",
  OPENAI_MODEL: "test-model",
  DEMO2_ACCESS_TOKEN: "t".repeat(40),
};
const ten = () => Array.from({ length: 10 }, (_, i) => packet(i + 1));
function mockProvider({ invalidId = null, quota = false } = {}) {
  return async (url, opts) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(opts.body),
      r = JSON.parse(body.input);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.ok(!body.previous_response_id);
    assert.ok(!body.tools);
    assert.ok(!body.input.includes("answer_key"));
    if (quota) return new Response("{}", { status: 429 });
    const x = extraction(r.rfi_id);
    if (r.rfi_id === invalidId)
      x.mechanisms[0].evidence.M.quote = "fabricated evidence";
    return Response.json({
      id: `mock-${r.rfi_id}`,
      status: "completed",
      model: "test-model",
      output: [{ content: [{ type: "output_text", text: JSON.stringify(x) }] }],
    });
  };
}
test("batch makes ten stateless structured provider requests and emits reconcilable events", async () => {
  let calls = 0;
  const provider = mockProvider({ invalidId: "TEST-3" });
  const agent = makeAgent({
      env,
      rubric: "Frozen test rubric only",
      providerFetch: (...args) => {
        calls++;
        return provider(...args);
      },
    }),
    events = [];
  const run = await agent.assess(
    { records: ten(), config_hash: agent.config().metadata.config_hash },
    (e) => events.push(e),
  );
  assert.equal(calls, 10);
  assert.equal(events.filter((e) => e.event === "item").length, 10);
  assert.equal(run.results.length, 10);
  assert.equal(run.results.filter((r) => r.priority === "P0").length, 9);
  assert.equal(run.results[2].assessment_state, "processing_error");
  assert.equal(run.results[2].priority, null);
  assert.equal(run.results[2].failure_type, "AI check failed");
  assert.match(run.results[2].error, /Output validation failed/);
  assert.ok(!JSON.stringify(run).includes(env.OPENAI_API_KEY));
  assert.ok(!JSON.stringify(run).includes(env.DEMO2_ACCESS_TOKEN));
});
test("provider quota, missing config, config change and unknown input fail honestly", async () => {
  const a = makeAgent({
    env,
    rubric: "test",
    providerFetch: mockProvider({ quota: true }),
  });
  const r = await a.assess(
    { records: ten(), config_hash: a.config().metadata.config_hash },
    () => {},
  );
  assert.equal(
    r.results.filter((r) => r.assessment_state === "processing_error").length,
    10,
  );
  assert.ok(r.results.every((r) => r.priority === null));
  await assert.rejects(
    a.assess({ records: ten(), config_hash: "changed" }, () => {}),
    /configuration changed/,
  );
  await assert.rejects(
    a.assess(
      {
        records: ten(),
        answer_key: [],
        config_hash: a.config().metadata.config_hash,
      },
      () => {},
    ),
    /answer key/,
  );
  const missing = makeAgent({ env: {}, rubric: "test" });
  assert.equal(missing.config().configured, false);
  await assert.rejects(
    missing.assess({}, () => {}),
    /not configured/,
  );
});
test("HTTP service enforces authentication, origins, static boundaries and streamed API", async (t) => {
  const server = await createServer({ env, providerFetch: mockProvider() });
  server.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const config = await fetch(base + "/api/config").then((r) => r.json());
  assert.equal(config.configured, true);
  assert.equal((await fetch(base + "/.env")).status, 404);
  assert.equal((await fetch(base + "/server/agent.js")).status, 404);
  assert.equal(
    (
      await fetch(base + "/api/config", {
        headers: { Origin: "https://attacker.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    401,
  );
  const opts = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEMO2_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      records: ten(),
      config_hash: config.metadata.config_hash,
    }),
  };
  const response = await fetch(base + "/api/assess", opts),
    events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("Content-Type").includes("ndjson"));
  assert.equal(events.filter((e) => e.event === "item").length, 10);
  assert.equal(events.at(-1).event, "completed");
  const invalid = {
    ...opts,
    body: JSON.stringify({
      records: ten().map((r, i) =>
        i ? r : { ...r, true_priority_tier: "P0" },
      ),
      config_hash: config.metadata.config_hash,
    }),
  };
  assert.equal((await fetch(base + "/api/assess", invalid)).status, 400);
  assert.equal((await fetch(base + "/info492/demo2.html")).status, 200);
});
test("backend rate limits failed authentication without leaking configuration secrets", async (t) => {
  const server = await createServer({ env, providerFetch: mockProvider() });
  server.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (let i = 0; i < 15; i++)
    assert.equal(
      (await fetch(base + "/api/assess", { method: "POST" })).status,
      401,
    );
  const r = await fetch(base + "/api/assess", { method: "POST" });
  assert.equal(r.status, 429);
  assert.ok(!(await r.text()).includes(env.OPENAI_API_KEY));
});

test("provider quota stops remaining calls and reports only safe known error codes", async () => {
  let calls = 0;
  const a = makeAgent({
    env,
    rubric: "test",
    providerFetch: async () => {
      calls++;
      return Response.json(
        {
          error: {
            code: "insufficient_quota",
            message: "private provider payload",
          },
        },
        { status: 429 },
      );
    },
  });
  const run = await a.assess(
    { records: ten(), config_hash: a.config().metadata.config_hash },
    () => {},
  );
  assert.ok(calls <= 2);
  assert.equal(run.results.length, 10);
  assert.ok(
    run.results.every(
      (r) => r.assessment_state === "processing_error" && r.priority === null,
    ),
  );
  assert.ok(run.results.every((r) => r.error.includes("insufficient_quota")));
  assert.ok(!JSON.stringify(run).includes("private provider payload"));
});

test("Render-hosted UI allows only its own HTTPS origin and configured Pages origin", async (t) => {
  const server = await createServer({
    env: {
      ...env,
      RENDER_EXTERNAL_URL: "https://team-demo.onrender.com",
      ALLOWED_ORIGINS: "https://lazydonuts.github.io",
    },
    providerFetch: mockProvider(),
  });
  server.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const origin of [
    "https://team-demo.onrender.com",
    "https://lazydonuts.github.io",
  ]) {
    const response = await fetch(base + "/api/config", {
      headers: { Origin: origin },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  }
  assert.equal(
    (
      await fetch(base + "/api/config", {
        headers: { Origin: "https://other.onrender.com" },
      })
    ).status,
    403,
  );
});

test("simultaneous HTTP batches cannot race past the concurrency gate; oversize input is blocked", async (t) => {
  let release;
  const gate = new Promise((r) => (release = r));
  const provider = mockProvider();
  const server = await createServer({
    env,
    providerFetch: async (...a) => {
      await gate;
      return provider(...a);
    },
  });
  server.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => {
    release();
    server.closeAllConnections();
    server.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`,
    config = await fetch(base + "/api/config").then((r) => r.json());
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.DEMO2_ACCESS_TOKEN}`,
  };
  const huge = await fetch(base + "/api/assess", {
    method: "POST",
    headers,
    body: "x".repeat(270000),
  });
  assert.equal(huge.status, 413);
  const opts = {
    method: "POST",
    headers,
    body: JSON.stringify({
      records: ten(),
      config_hash: config.metadata.config_hash,
    }),
  };
  const first = fetch(base + "/api/assess", opts);
  const second = fetch(base + "/api/assess", opts);
  const responses = await Promise.all([first, second]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 429]);
  release();
  await Promise.all(responses.map((r) => r.text()));
});
