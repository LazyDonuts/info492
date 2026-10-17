import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as pause } from "node:timers/promises";
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
  const selectedProvider = env.AI_PROVIDER || "openai";
  const gemini = selectedProvider === "gemini";
  const model = (gemini ? env.GEMINI_MODEL : env.OPENAI_MODEL) || null;
  const providerKey = gemini ? env.GEMINI_API_KEY : env.OPENAI_API_KEY;
  const spacing = gemini
    ? Math.min(
        60000,
        Math.max(0, Number(env.GEMINI_MIN_INTERVAL_MS ?? 13000) || 0),
      )
    : 0;
  const validProvider = ["openai", "gemini"].includes(selectedProvider);
  const validModel =
    !!model && (!gemini || /^gemini-[A-Za-z0-9.-]+$/.test(model));
  const metadata = {
    provider:
      executionMode === "test_fixture"
        ? "DEVELOPMENT TEST FIXTURE — no AI model call"
        : gemini
          ? "Google Gemini API"
          : "OpenAI Responses API",
    provider_id: selectedProvider,
    execution_mode: executionMode,
    model,
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
    store: gemini
      ? "Stateless generateContent; Google data terms apply"
      : false,
    thinking_budget: gemini && model?.startsWith("gemini-2.5-") ? 0 : "not set",
    item_concurrency: gemini ? 1 : 2,
    min_request_interval_ms: spacing,
    item_timeout_ms: 45000,
  };
  metadata.config_hash = hash(metadata);
  const missing = [];
  if (!validProvider) missing.push("AI_PROVIDER must be openai or gemini");
  if (!providerKey) missing.push(gemini ? "GEMINI_API_KEY" : "OPENAI_API_KEY");
  if (!validModel)
    missing.push(
      gemini ? "GEMINI_MODEL (valid Gemini model ID)" : "OPENAI_MODEL",
    );
  if (!(env.DEMO2_ACCESS_TOKEN?.length >= 32))
    missing.push("DEMO2_ACCESS_TOKEN (at least 32 characters)");
  const configured = missing.length === 0;
  return {
    config: () => ({
      configured,
      metadata,
      setup: configured
        ? null
        : `Missing server configuration: ${missing.join(", ")}. See docs/DEMO2-SETUP.md. No simulated analysis is used.`,
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
      let lastRequestStart = 0;
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
            if (gemini && lastRequestStart)
              await pause(
                Math.max(0, spacing - (Date.now() - lastRequestStart)),
              );
            lastRequestStart = Date.now();
            const response = await providerFetch(
              gemini
                ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
                : "https://api.openai.com/v1/responses",
              {
                method: "POST",
                headers: gemini
                  ? {
                      "x-goog-api-key": providerKey,
                      "Content-Type": "application/json",
                    }
                  : {
                      Authorization: `Bearer ${providerKey}`,
                      "Content-Type": "application/json",
                    },
                signal: AbortSignal.timeout(45000),
                body: JSON.stringify(
                  gemini
                    ? {
                        systemInstruction: { parts: [{ text: prompt }] },
                        contents: [
                          {
                            role: "user",
                            parts: [{ text: JSON.stringify(r) }],
                          },
                        ],
                        generationConfig: {
                          candidateCount: 1,
                          maxOutputTokens: 7000,
                          responseMimeType: "application/json",
                          responseJsonSchema: EXTRACTION_SCHEMA,
                          ...(model.startsWith("gemini-2.5-")
                            ? { thinkingConfig: { thinkingBudget: 0 } }
                            : {}),
                        },
                      }
                    : {
                        model,
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
                      },
                ),
              },
            );
            if (response.status === 429) {
              if (gemini) {
                providerBlocked =
                  "Gemini free-tier quota/rate limit reached (HTTP 429). Check AI Studio limits and retry later; no paid-provider fallback is used.";
                throw new Error(providerBlocked);
              }
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
            if (!response.ok) {
              const failure = [401, 403].includes(response.status)
                  ? "Provider authentication failed. Ask the operator to check server credentials."
                  : response.status === 404
                    ? "Configured provider model is unavailable (HTTP 404). Operator must select an available model before retrying."
                    : `Provider request failed (HTTP ${response.status}).`,
                error = new Error(failure);
              if ([401, 403, 404].includes(response.status))
                providerBlocked = failure;
              throw error;
            }
            let data = await response.json();
            if (gemini) {
              const candidate = data.candidates?.[0];
              if (
                data.promptFeedback?.blockReason ||
                data.candidates?.length !== 1 ||
                candidate.finishReason !== "STOP"
              )
                throw new Error(
                  "Gemini blocked or incomplete output; no assessment was assigned.",
                );
              const parts = candidate.content?.parts;
              if (
                !Array.isArray(parts) ||
                parts.some((p) => typeof p.text !== "string")
              )
                throw new Error("Gemini returned unexpected non-text output.");
              data = {
                status: "completed",
                id: data.responseId || null,
                model: data.modelVersion || model,
                usage: data.usageMetadata || null,
                output: [
                  {
                    content: [
                      {
                        type: "output_text",
                        text: parts
                          .filter((p) => !p.thought)
                          .map((p) => p.text)
                          .join(""),
                      },
                    ],
                  },
                ],
              };
            }
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
                provider_model: data.model || model,
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
      await Promise.all(gemini ? [work()] : [work(), work()]);
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
