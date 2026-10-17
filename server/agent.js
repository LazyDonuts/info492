import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  validateRecords,
  assessExtraction,
  RUBRIC_VERSION,
  ENGINE_VERSION,
  INPUT_VERSION,
} from "../js/demo2-core.js";
import {
  EXTRACTION_SCHEMA,
  validateExtraction,
  extractionPrompt,
  PROMPT_VERSION,
} from "./extraction.js";
const hash = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
export function makeAgent({
  env = process.env,
  rubric,
  providerFetch = fetch,
  executionMode = "provider",
}) {
  const prompt = extractionPrompt(rubric);
  const metadata = {
    provider:
      executionMode === "test_fixture"
        ? "DEVELOPMENT TEST FIXTURE — no AI model call"
        : "OpenAI Responses API",
    execution_mode: executionMode,
    model: env.OPENAI_MODEL || null,
    prompt_version: PROMPT_VERSION,
    rubric_version: RUBRIC_VERSION,
    engine_version: ENGINE_VERSION,
    input_version: INPUT_VERSION,
    implementation_hash: hash(
      ["./agent.js", "./extraction.js", "../js/demo2-core.js"]
        .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
        .join("\n"),
    ),
    rubric_hash: hash(rubric),
    prompt_hash: hash(prompt),
    schema_hash: hash(EXTRACTION_SCHEMA),
    max_output_tokens: 7000,
    temperature: "not set",
    tools: "none",
    store: false,
  };
  metadata.config_hash = hash(metadata);
  const configured = !!(
    env.OPENAI_API_KEY &&
    env.OPENAI_MODEL &&
    env.DEMO2_ACCESS_TOKEN?.length >= 32
  );
  return {
    config: () => ({
      configured,
      metadata,
      setup: configured
        ? null
        : "Configure server OPENAI_API_KEY, OPENAI_MODEL and a DEMO2_ACCESS_TOKEN of at least 32 characters. See docs/DEMO2-SETUP.md. No simulated analysis is used.",
    }),
    async assess(body, emit) {
      if (!configured)
        throw Object.assign(
          new Error("AI backend is not configured. See docs/DEMO2-SETUP.md."),
          { status: 503 },
        );
      if (
        !body ||
        Object.keys(body).some((k) => !["records", "config_hash"].includes(k))
      )
        throw Object.assign(
          new Error(
            "Only records and config_hash are allowed; no answer key or outcome fields.",
          ),
          { status: 400 },
        );
      if (body.config_hash !== metadata.config_hash)
        throw Object.assign(
          new Error(
            "Model/prompt configuration changed. Refresh connection; a frozen evaluation needs a new study.",
          ),
          { status: 409 },
        );
      const records = validateRecords(body.records);
      const run = {
        run_id: randomUUID(),
        started_at: new Date().toISOString(),
        input_hash: hash(records),
        metadata,
        system_prompt: prompt,
      };
      emit({ event: "started", ...run });
      const results = new Array(records.length);
      let next = 0;
      let providerBlocked = null;
      const work = async () => {
        while (next < records.length) {
          const i = next++,
            r = records[i];
          let result;
          try {
            if (providerBlocked)
              throw new Error(
                `Not attempted after provider limit: ${providerBlocked}`,
              );
            const response = await providerFetch(
              "https://api.openai.com/v1/responses",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                  "Content-Type": "application/json",
                },
                signal: AbortSignal.timeout(45000),
                body: JSON.stringify({
                  model: env.OPENAI_MODEL,
                  store: false,
                  instructions: prompt,
                  input: JSON.stringify(r),
                  max_output_tokens: 7000,
                  text: {
                    format: {
                      type: "json_schema",
                      name: "rfi_evidence",
                      strict: true,
                      schema: EXTRACTION_SCHEMA,
                    },
                  },
                }),
              },
            );
            if (response.status === 429) {
              let code;
              try {
                code = (await response.json()).error?.code;
              } catch {}
              // Only interpret known codes; never echo arbitrary provider bodies.
              providerBlocked = [
                "insufficient_quota",
                "credit_balance_exhausted",
                "organization_spend_limit_exceeded",
                "project_spend_limit_exceeded",
                "organization_usage_limit_exceeded",
                "usage_limit_exceeded",
              ].includes(code)
                ? `OpenAI API quota unavailable (${code}). Check API billing, credit balance and project limits before retrying.`
                : ["rate_limit_exceeded", "slow_down"].includes(code)
                  ? "OpenAI request/token rate limit exceeded. Wait and review project limits before retrying."
                  : "Provider quota/rate limit (HTTP 429). Check API billing and project limits before retrying.";
              throw new Error(providerBlocked);
            }
            if (!response.ok)
              throw new Error(
                response.status === 401
                  ? "Provider authentication failed. Ask the operator to check server credentials."
                  : `Provider request failed (HTTP ${response.status}).`,
              );
            const data = await response.json();
            if (data.status !== "completed")
              throw new Error(
                `Provider output incomplete (${data.status || "unknown"}); not a valid Needs Information assessment.`,
              );
            const content = (data.output || []).flatMap((o) => o.content || []);
            if (content.some((c) => c.type === "refusal"))
              throw new Error(
                "Provider refused this assessment. No substitute result was generated.",
              );
            const raw = content
              .filter((c) => c.type === "output_text")
              .map((c) => c.text)
              .join("");
            try {
              const extraction = validateExtraction(JSON.parse(raw), r);
              result = {
                ...assessExtraction(r, extraction),
                raw_output: raw,
                provider_response_id: data.id || null,
                provider_model: data.model || env.OPENAI_MODEL,
                usage: data.usage || null,
              };
            } catch (err) {
              result = {
                rfi_id: r.rfi_id,
                assessment_state: "processing_error",
                priority: null,
                error: `Output validation failed: ${err.message}`,
                raw_output: raw,
                provider_response_id: data.id || null,
              };
            }
          } catch (err) {
            result = {
              rfi_id: r.rfi_id,
              assessment_state: "processing_error",
              priority: null,
              error:
                err.name === "TimeoutError"
                  ? "Provider request timed out; no assessment was assigned."
                  : err.message,
            };
          }
          results[i] = result;
          emit({ event: "item", result });
        }
      };
      await Promise.all([work(), work()]);
      const completed = {
        event: "completed",
        run_id: run.run_id,
        completed_at: new Date().toISOString(),
        results,
      };
      emit(completed);
      return { ...run, ...completed };
    },
  };
}
