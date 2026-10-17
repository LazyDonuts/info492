import test from "node:test";
import assert from "node:assert/strict";
import { makeAgent } from "../server/agent.js";
import { packet, extraction } from "./demo2-fixtures.js";
const env = {
  AI_PROVIDER: "gemini",
  GEMINI_API_KEY: "unit-test-google-key",
  GEMINI_MODEL: "gemini-2.5-flash",
  GEMINI_MIN_INTERVAL_MS: "0",
  DEMO2_ACCESS_TOKEN: "t".repeat(40),
};
const ten = () => Array.from({ length: 10 }, (_, i) => packet(i + 1));
const run = (a) =>
  a.assess(
    { records: ten(), config_hash: a.config().metadata.config_hash },
    () => {},
  );
test("Gemini uses stateless server-only JSON schema requests and preserves evidence and usage", async () => {
  let calls = 0;
  const a = makeAgent({
    env,
    rubric: "test",
    providerFetch: async (url, opts) => {
      calls++;
      assert.equal(
        url,
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      );
      assert.equal(opts.headers["x-goog-api-key"], env.GEMINI_API_KEY);
      assert.ok(!opts.headers.Authorization);
      const body = JSON.parse(opts.body),
        r = JSON.parse(body.contents[0].parts[0].text);
      assert.equal(body.contents.length, 1);
      assert.ok(!body.tools);
      assert.ok(body.systemInstruction.parts[0].text);
      assert.equal(
        body.generationConfig.responseJsonSchema.additionalProperties,
        false,
      );
      assert.equal(body.generationConfig.thinkingConfig.thinkingBudget, 0);
      return Response.json({
        responseId: "google-" + r.rfi_id,
        modelVersion: env.GEMINI_MODEL,
        usageMetadata: { promptTokenCount: 20 },
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [{ text: JSON.stringify(extraction(r.rfi_id)) }],
            },
          },
        ],
      });
    },
  });
  const result = await run(a);
  assert.equal(calls, 10);
  assert.ok(
    result.results.every(
      (r) =>
        r.priority === "P0" && r.provider_response_id.startsWith("google-"),
    ),
  );
  assert.equal(result.metadata.provider, "Google Gemini API");
  assert.equal(result.metadata.item_concurrency, 1);
  assert.ok(!JSON.stringify(result).includes(env.GEMINI_API_KEY));
  assert.equal(result.results[0].usage.promptTokenCount, 20);
});
test("Gemini blocked, truncated and non-text output never becomes an assessment", async () => {
  for (const data of [
    { promptFeedback: { blockReason: "SAFETY" } },
    {
      candidates: [
        { finishReason: "MAX_TOKENS", content: { parts: [{ text: "{}" }] } },
      ],
    },
    {
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ functionCall: { name: "unrequested" } }] },
        },
      ],
    },
  ]) {
    const a = makeAgent({
        env,
        rubric: "test",
        providerFetch: async () => Response.json(data),
      }),
      r = await run(a);
    assert.ok(
      r.results.every(
        (x) => x.assessment_state === "processing_error" && x.priority === null,
      ),
    );
  }
});
test("Gemini quota stops the batch without invoking another provider", async () => {
  let calls = 0;
  const a = makeAgent({
    env,
    rubric: "test",
    providerFetch: async (url) => {
      calls++;
      assert.ok(url.includes("googleapis.com"));
      return Response.json(
        { error: { status: "RESOURCE_EXHAUSTED" } },
        { status: 429 },
      );
    },
  });
  const r = await run(a);
  assert.equal(calls, 1);
  assert.equal(r.results.length, 10);
  assert.ok(r.results.every((x) => x.error.includes("Gemini free-tier")));
});
test("Gemini config requires its own key and model; provider/model changes alter frozen hashes", () => {
  const a = makeAgent({ env, rubric: "test" }),
    b = makeAgent({
      env: {
        ...env,
        GEMINI_API_KEY: "",
        OPENAI_API_KEY: "existing-openai-key",
      },
      rubric: "test",
    });
  assert.equal(b.config().configured, false);
  assert.ok(b.config().setup.includes("GEMINI_API_KEY"));
  assert.notEqual(
    a.config().metadata.config_hash,
    makeAgent({
      env: { ...env, GEMINI_MODEL: "gemini-2.5-flash-lite" },
      rubric: "test",
    }).config().metadata.config_hash,
  );
  assert.equal(
    makeAgent({
      env: { ...env, AI_PROVIDER: "unknown" },
      rubric: "test",
    }).config().configured,
    false,
  );
  assert.equal(
    makeAgent({
      env: { ...env, GEMINI_MODEL: "gemini-2.5-flash?key=bad" },
      rubric: "test",
    }).config().configured,
    false,
  );
});
