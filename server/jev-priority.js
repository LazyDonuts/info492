import { createHash } from "node:crypto";
import {
  buildJevPriorityRequest,
  validateJevPriorityResponse,
} from "../js/jev-priority.js";

const inputFields = ["submitted_date", "due_date", "description"];
const categories = new Set(["low", "mid", "high", "lacking_info"]);

export class JevPriorityError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "JevPriorityError";
    this.status = status;
  }
}

export function validateJevPriorityRequest(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !["rfi_id", "evaluation_input"].includes(key))
  ) {
    throw new JevPriorityError("Only rfi_id and evaluation_input are accepted.", 400);
  }
  if (typeof body.rfi_id !== "string" || !body.rfi_id.trim() || body.rfi_id.length > 200) {
    throw new JevPriorityError("A valid RFI identifier is required.", 400);
  }
  const input = body.evaluation_input;
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).some((key) => !inputFields.includes(key))) {
    throw new JevPriorityError("Only submitted_date, due_date, and description are accepted as evaluator inputs.", 400);
  }
  for (const field of inputFields) {
    const value = input[field] ?? null;
    const maxLength = field === "description" ? 20000 : 100;
    if (value !== null && (typeof value !== "string" || value.length > maxLength)) {
      throw new JevPriorityError(`Invalid ${field} value.`, 400);
    }
  }
  return {
    rfi_id: body.rfi_id.trim(),
    evaluation_input: Object.fromEntries(inputFields.map((field) => [field, input[field] ?? null])),
  };
}

export function createJevPriorityService({
  apiKey,
  model = "jev-latest",
  fetchImpl = fetch,
  cache = new Map(),
  timeoutMs = 15000,
} = {}) {
  const configured = typeof apiKey === "string" && apiKey.trim().length > 0 &&
    typeof model === "string" && /^[a-zA-Z0-9.-]+$/.test(model);

  async function classify(evaluationInput) {
    if (!configured) throw new JevPriorityError("Jev priority classification is not configured.", 503);
    const key = createHash("sha256").update(JSON.stringify(evaluationInput)).digest("hex");
    if (cache.has(key)) return { ...(await cache.get(key)) };
    const pending = (async () => {
      let response;
      try {
        response = await fetchImpl("https://api.typesafe.ai/v1/systemone", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildJevPriorityRequest(evaluationInput, model)),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw new JevPriorityError("Jev request failed or timed out.");
      }
      if (!response.ok) throw new JevPriorityError(`Jev request failed (HTTP ${response.status}).`);
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new JevPriorityError("Jev returned an invalid response.");
      }
      try {
        const result = validateJevPriorityResponse(payload);
        if (!categories.has(result.category)) throw new Error();
        return result;
      } catch {
        throw new JevPriorityError("Jev returned an invalid priority classification.");
      }
    })();
    cache.set(key, pending);
    try {
      const result = await pending;
      cache.set(key, result);
      return { ...result };
    } catch (error) {
      cache.delete(key);
      throw error;
    }
  }

  return { classify, configured, model };
}
