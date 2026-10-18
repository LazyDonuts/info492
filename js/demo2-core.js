import { parseCSV, date } from "./rfi-data.js";
export const RUBRIC_VERSION = "v0.3";
export const ENGINE_VERSION = "demo2-1.0";
export const INPUT_VERSION = "submission-1";
export const MAX_BYTES = 256 * 1024;
export const LABELS = ["P0", "P1", "P2", "Needs Information", "Excluded"];
export const FIELDS = [
  "rfi_id",
  "title",
  "description",
  "submitted_date",
  "decision_time",
  "package_id",
  "location",
  "spec_section",
  "assigned_reviewer",
  "contractor_priority_flag",
  "contractor_claims_cost_impact",
  "contractor_claims_schedule_impact",
  "on_critical_path_at_submittal",
  "required_response_days",
  "attachments",
  "supporting_text",
  "review_context",
  "provenance",
];
const aliases = {
  id: "rfi_id",
  subject: "title",
  question: "description",
  evidence_text: "supporting_text",
};
export function projectDataset(rows) {
  return rows.map((r) =>
    Object.fromEntries(
      FIELDS.map((k) => [
        k,
        k === "title"
          ? r.subject || ""
          : k === "provenance"
            ? "Synthetic development record; not official Sound Transit correspondence."
            : String(r[k] ?? ""),
      ]),
    ),
  );
}
export function validateRecords(rows, { exactlyTen = false, minimum = 2 } = {}) {
  if (
    !Array.isArray(rows) ||
    rows.length < minimum ||
    rows.length > 10 ||
    (exactlyTen && rows.length !== 10)
  )
    throw new Error(exactlyTen
      ? "Provide exactly 10 RFI records for evaluation. No records were omitted."
      : `Provide ${minimum}–10 RFI records. No records were omitted.`);
  const ids = new Set();
  return rows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw new Error(`Record ${index + 1}: expected an object.`);
    const unknown = Object.keys(row).filter(
      (k) => !FIELDS.includes(k) && !Object.hasOwn(aliases, k),
    );
    if (unknown.length)
      throw new Error(
        `Record ${index + 1}: unsupported fields ${unknown.join(", ")}. Remove outcomes/answer labels and use the submission template.`,
      );
    const r = {};
    for (const [key, value] of Object.entries(row)) {
      const k = Object.hasOwn(aliases, key) ? aliases[key] : key;
      if (k in r)
        throw new Error(
          `Record ${index + 1}: both ${key} and its mapped field were supplied.`,
        );
      if (
        value !== null &&
        !["string", "number", "boolean"].includes(typeof value)
      )
        throw new Error(
          `Record ${index + 1}: ${key} must be text, not a nested object.`,
        );
      r[k] = value == null ? "" : String(value).trim();
      if (
        r[k].length >
          (["description", "supporting_text", "review_context"].includes(k)
            ? 12000
            : 1000) ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(r[k])
      )
        throw new Error(
          `Record ${index + 1}: ${key} is too long or contains unsupported control characters.`,
        );
    }
    for (const k of FIELDS) r[k] ??= "";
    if (!/^[\p{L}\p{N}][\p{L}\p{N}._ /-]{0,99}$/u.test(r.rfi_id))
      throw new Error(
        `Record ${index + 1}: provide an ID (1–100 letters, digits, spaces, . _ / -).`,
      );
    const id = r.rfi_id.toLowerCase();
    if (ids.has(id)) throw new Error(`Duplicate RFI ID: ${r.rfi_id}.`);
    ids.add(id);
    if (!r.title || r.description.length < 20)
      throw new Error(
        `${r.rfi_id}: title and a narrative of at least 20 characters are required. Supply actual text; do not invent missing facts.`,
      );
    if (r.submitted_date && !date(r.submitted_date))
      throw new Error(
        `${r.rfi_id}: submitted_date must be a valid YYYY-MM-DD.`,
      );
    // Decision time is a declared snapshot, not the current wall clock.
    if (r.decision_time && !date(r.decision_time))
      throw new Error(`${r.rfi_id}: decision_time must be YYYY-MM-DD.`);
    return r;
  });
}
export function parseUpload(text, filename, options = {}) {
  if (new TextEncoder().encode(text).length > MAX_BYTES)
    throw new Error(
      "File exceeds 256 KB. Split into a submission-only file of 2–10 records.",
    );
  const ext = filename.split(".").pop().toLowerCase();
  let rows;
  if (ext === "json") {
    const value = JSON.parse(text.replace(/^\uFEFF/, ""));
    if (
      !Array.isArray(value) &&
      (!value ||
        typeof value !== "object" ||
        Object.keys(value).length !== 1 ||
        !Array.isArray(value.records))
    )
      throw new Error(
        "JSON must be an array or an object with only a records array.",
      );
    rows = Array.isArray(value) ? value : value.records;
  } else if (ext === "csv") rows = parseCSV(text);
  else
    throw new Error(
      "Use UTF-8 CSV or JSON. PDF, Word and Excel are not parsed by Demo 2.",
    );
  return validateRecords(rows, options);
}
export function seededSelection(rows, seed) {
  if (rows.length < 10)
    throw new Error("At least ten source records are needed.");
  let s = 2166136261;
  for (const c of String(seed))
    s = Math.imul(s ^ c.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = rows.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, 10);
}
export function mechanismTier(m) {
  if (m.contradictions.length)
    return { priority: null, branch: "MATERIAL_CONTRADICTION" };
  const e = Object.fromEntries(
    Object.entries(m.evidence).map(([k, v]) => [k, v.value]),
  );
  if (m.bounded_clarification.value === "Yes" && e.M === "No")
    return { priority: "P2", branch: "BOUNDED_CLARIFICATION" };
  if (!["U", "A", "M"].every((k) => e[k] === "Yes"))
    return { priority: null, branch: "ESSENTIAL_FACTS_UNKNOWN" };
  if (e.X === "Yes" && e.D === "Yes" && e.B !== "Yes")
    return {
      priority: "P0",
      branch:
        e.B === "Unknown"
          ? "P0_MITIGATION_UNVERIFIED"
          : "P0_UNPROTECTED_EXPOSURE",
    };
  if (e.X === "No" || e.B === "Yes")
    return {
      priority: "P1",
      branch:
        e.B === "Yes"
          ? "P1_EFFECTIVE_PROTECTION"
          : "P1_NO_TIME_SENSITIVE_EXPOSURE",
    };
  if (e.X !== "Unknown" && e.D === "No")
    return { priority: "P1", branch: "P1_NO_REMAINING_OPPORTUNITY" };
  return { priority: null, branch: "TIMING_OR_OPPORTUNITY_UNKNOWN" };
}
export const branchReasons = {
  P0_MITIGATION_UNVERIFIED:
    "Cost exposure and a remaining decision opportunity are supported; protection is unknown. Verify protection promptly.",
  P0_UNPROTECTED_EXPOSURE:
    "An additional-cost mechanism, time-sensitive exposure and remaining decision opportunity are supported without effective protection.",
  P1_EFFECTIVE_PROTECTION:
    "An additional-cost mechanism is supported, with effective implemented protection through the review window.",
  P1_NO_TIME_SENSITIVE_EXPOSURE:
    "An additional-cost mechanism is supported with affirmative evidence of no time-sensitive exposure.",
  P1_NO_REMAINING_OPPORTUNITY:
    "No remaining exposure-changing opportunity was identified. This is not evidence of avoidable savings.",
  BOUNDED_CLARIFICATION:
    "The supplied evidence supports a bounded clarification without an identified additional-cost mechanism; this does not guarantee zero loss.",
  MATERIAL_CONTRADICTION:
    "Conflicting evidence must be clarified before assigning a priority.",
  ESSENTIAL_FACTS_UNKNOWN:
    "Essential issue, affected-work or monetary-mechanism evidence is insufficient.",
  TIMING_OR_OPPORTUNITY_UNKNOWN:
    "Timing or remaining decision opportunity is not established where required for classification.",
  MULTIPLE_UNRESOLVED: "An unresolved mechanism could change the overall tier.",
  SCOPE_UNKNOWN:
    "The submission does not establish whether this is an active in-scope RFI.",
  EXCLUDED:
    "Resolved or out-of-scope submission; excluded from the active queue.",
};
export function assessExtraction(record, x) {
  let decision;
  const decisions = x.mechanisms.map(mechanismTier);
  if (x.scope.value === "resolved" || x.scope.value === "out_of_scope")
    decision = { priority: null, branch: "EXCLUDED" };
  else if (x.scope.value !== "active")
    decision = { priority: null, branch: "SCOPE_UNKNOWN" };
  else
    decision =
      decisions.find((d) => d.priority === "P0") ||
      (decisions.some((d) => d.priority === null)
        ? {
            priority: null,
            branch:
              decisions.length === 1
                ? decisions[0].branch
                : "MULTIPLE_UNRESOLVED",
          }
        : decisions.find((d) => d.priority === "P1") || decisions[0]);
  const state =
    decision.branch === "EXCLUDED"
      ? "excluded"
      : decision.priority
        ? "assigned"
        : "needs_information";
  const requiredMissing = [];
  const missing = requiredMissing;
  const questions = {
    U: "What question remains unresolved at this decision time?",
    A: "Which specific work, commitment or paid resource is affected?",
    M: "How does the issue cause additional expenditure?",
    X: "What exposure occurs before normal review, and what supports that review window?",
    D: "What action can earlier review still inform?",
    B: "Is effective protection implemented through the review window, and does it create other costs?",
  };
  for (const m of x.mechanisms) {
    for (const [k, v] of Object.entries(m.evidence))
      if (v.value === "Unknown") missing.push(questions[k]);
    for (const c of m.contradictions)
      missing.push(`Clarify contradiction: ${c.explanation}`);
  }
  return {
    rfi_id: record.rfi_id,
    assessment_state: state,
    priority: decision.priority,
    rubric_version: RUBRIC_VERSION,
    rule_branch: decision.branch,
    priority_reason: branchReasons[decision.branch],
    mitigation_unverified:
      decisions.some((d) => d.branch === "P0_MITIGATION_UNVERIFIED") &&
      decision.priority === "P0",
    mechanisms: x.mechanisms.map((m, i) => ({ ...m, decision: decisions[i] })),
    potential_cost_mechanism: x.mechanisms
      .map((m) => m.description)
      .join(" · "),
    required_missing_information: [...new Set(requiredMissing)],
    suggested_followups: [...new Set(x.missing_information)],
    missing_information: [...new Set([...missing, ...x.missing_information])],
    safety_escalation: x.safety.value,
    safety_evidence: x.safety,
    expedited_verification: x.expedited_verification.value,
    expedited_evidence: x.expedited_verification,
    decision_date: x.decision_date.value,
    decision_date_evidence: x.decision_date,
    scope: x.scope,
    schedule_considerations: x.schedule_considerations,
    suggested_gc_review_action:
      state === "excluded"
        ? "Review the exclusion through the existing project process."
        : "Verify the cited evidence and missing facts, then coordinate with the supplied reviewer through normal contractual channels. No work or payment is authorized.",
  };
}
export function disposition(r) {
  return r.assessment_state === "processing_error"
    ? "Processing error"
    : r.assessment_state === "excluded"
      ? "Excluded"
      : r.priority || "Needs Information";
}
// Development working queue, requested by the team. Never replaces v0.3
// evidence decisions or the frozen evaluation metric.
export function workingAssessment(result, record) {
  if (result.not_attempted) return {...result, provisional:false, ai_review_failed:true, needs_information_flag:false};
  if (
    result.assessment_state === "excluded" ||
    result.assessment_state === "assigned"
  )
    return {
      ...result,
      provisional: false,
      needs_information_flag: !!result.missing_information?.length,
      ai_review_failed: false,
    };
  const yes = (v) => /^(y|yes|true|1)$/i.test(String(v ?? "").trim());
  const no = (v) => /^(n|no|false|0)$/i.test(String(v ?? "").trim());
  const supportedExposure = result.mechanisms?.some(
    (m) =>
      !m.contradictions.length &&
      ["U", "A", "M", "X"].every((k) => m.evidence[k].value === "Yes") &&
      m.evidence.B.value !== "Yes",
  );
  const cost = yes(record.contractor_claims_cost_impact);
  const schedule = yes(record.contractor_claims_schedule_impact);
  const critical = yes(record.on_critical_path_at_submittal);
  const urgent = /^(urgent|expedite|expedited)$/i.test(
    String(record.contractor_priority_flag || "").trim(),
  );
  const reportedExposure =
    (cost && (schedule || critical || urgent)) || (schedule && critical);
  const reportedClarification =
    [
      record.contractor_claims_cost_impact,
      record.contractor_claims_schedule_impact,
      record.on_critical_path_at_submittal,
    ].every(no) && /clarification|drawing reference/i.test(record.title || "");
  const priority =
    supportedExposure || reportedExposure
      ? "P0"
      : reportedClarification
        ? "P2"
        : "P1";
  const basis = supportedExposure
    ? "Cited cost exposure is time-sensitive; verify the remaining decision opportunity and protection."
    : reportedExposure
      ? `Reported signals: ${[cost && "cost impact", schedule && "schedule impact", critical && "critical-path involvement", urgent && "urgent/expedited request"].filter(Boolean).join(", ")}. Multiple indicators warrant early human verification; they are not proof of financial risk.`
      : reportedClarification
        ? "The item is described as a clarification and the submitter reports no cost, schedule or critical-path impact. Confirm those claims before treating it as low priority."
        : "P1 is the working review default while essential facts are unresolved; missing evidence does not establish low risk.";
  return {
    ...result,
    validated_assessment_state: result.assessment_state,
    validated_priority: result.priority,
    validated_priority_reason: result.priority_reason || null,
    validation_error: result.error || null,
    assessment_state: "assigned",
    priority,
    provisional: true,
    working_policy: "working-triage-0.4",
    working_basis: supportedExposure
      ? "validated_partial_evidence"
      : "submission_rules_not_ai",
    needs_information_flag: true,
    ai_review_failed: result.assessment_state === "processing_error",
    priority_reason: `Provisional ${priority}. ${basis}`,
    missing_information: [
      ...new Set([
        ...(result.missing_information || []),
        ...(result.assessment_state === "processing_error"
          ? [
              "AI evidence check failed. Review the original packet; this working priority is an input-rule suggestion, not a valid AI assessment.",
            ]
          : []),
        "Confirm the added-cost mechanism, time exposure, remaining decision opportunity and effective protection before confirming priority.",
      ]),
    ],
  };
}
export function sortAssessments(results, records) {
  const byId = new Map(records.map((r) => [r.rfi_id, r]));
  const cmp = (a, b) => (a && b ? a.localeCompare(b) : a ? -1 : b ? 1 : 0);
  return results
    .slice()
    .sort(
      (a, b) =>
        (["P0", "P1", "P2"].indexOf(a.priority) < 0
          ? 3
          : ["P0", "P1", "P2"].indexOf(a.priority)) -
          (["P0", "P1", "P2"].indexOf(b.priority) < 0
            ? 3
            : ["P0", "P1", "P2"].indexOf(b.priority)) ||
        cmp(a.decision_date, b.decision_date) ||
        cmp(
          byId.get(a.rfi_id)?.submitted_date,
          byId.get(b.rfi_id)?.submitted_date,
        ) ||
        a.rfi_id.localeCompare(b.rfi_id),
    );
}
export function baseline(records) {
  return records.map((r) => {
    const t = (r.title + " " + r.description)
      .toLowerCase()
      .replace(/\s+/g, " ");
    return {
      rfi_id: r.rfi_id,
      assessment_state: "assigned",
      priority: /\bdemolish\b|\bremove and replace\b/.test(t)
        ? "P0"
        : /\badditional work\b|\brelocate\b/.test(t)
          ? "P1"
          : "P2",
      rule_branch: "FROZEN_KEYWORD_BASELINE",
    };
  });
}
export function parseAnswerKey(text, filename, records) {
  const rows = filename.toLowerCase().endsWith(".csv")
    ? parseCSV(text)
    : JSON.parse(text);
  if (!Array.isArray(rows) || rows.length !== 10)
    throw new Error("Answer key needs exactly ten rows.");
  const ids = new Set(records.map((r) => r.rfi_id)),
    seen = new Set();
  for (const r of rows) {
    if (!r || typeof r !== "object")
      throw new Error("Answer key rows must be objects.");
    if (!ids.has(r.rfi_id) || seen.has(r.rfi_id))
      throw new Error("Answer key IDs must match the frozen set exactly.");
    for (const f of ["reviewer_a", "reviewer_b", "final_label"])
      if (!LABELS.includes(r[f]))
        throw new Error(
          `${r.rfi_id}: ${f} must be P0/P1/P2/Needs Information/Excluded.`,
        );
    for (const f of ["provenance", "rationale", "adjudication"])
      if (typeof r[f] !== "string" || !r[f].trim())
        throw new Error(`${r.rfi_id}: supply ${f} as text.`);
    seen.add(r.rfi_id);
  }
  return rows;
}
export function score(results, key) {
  const expected = new Map(key.map((r) => [r.rfi_id, r.final_label]));
  const highs = key.filter((r) => r.final_label === "P0"),
    predicted = results.filter((r) => r.priority === "P0");
  const tp = predicted.filter((r) => expected.get(r.rfi_id) === "P0").length;
  return {
    matches: results.filter((r) => disposition(r) === expected.get(r.rfi_id))
      .length,
    total: key.length,
    highRecall: { numerator: tp, denominator: highs.length },
    highPrecision: { numerator: tp, denominator: predicted.length },
    coverage: results.filter((r) => r.priority).length,
    failures: results.filter((r) => r.assessment_state === "processing_error")
      .length,
    needsInformation: results.filter(
      (r) => r.assessment_state === "needs_information",
    ).length,
  };
}
export function csv(rows) {
  if (!rows.length) return "";
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const cell = (v) => {
    let s =
      typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    keys.map(cell).join(","),
    ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
  ].join("\r\n");
}
export async function fingerprint(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

// Evaluate the selected policy without counting transport/model failures as success.
export function evaluationResults(run, policy = "v0.3") {
  if (policy !== "working-triage-0.4" || run.kind === "baseline") return run.results;
  return run.results.map(r => r.assessment_state === "processing_error" ? r :
    workingAssessment(r, (run.records || []).find(x=>x.rfi_id===r.rfi_id) || {}));
}
export function compareRuns(a, b) {
  const byId = new Map(b.results.map(r=>[r.rfi_id,r]));
  const changed = [];
  let eligible=0, priorityMatches=0, missingMatches=0;
  for(const r of a.results) {
    const other=byId.get(r.rfi_id);
    if(!other || r.assessment_state==='processing_error' || other.assessment_state==='processing_error') continue;
    eligible++;
    const samePriority=disposition(r)===disposition(other);
    const normalized=x=>[...new Set((x.missing_information||[]).map(q=>q.trim().toLowerCase()))].sort().join('\n');
    const sameMissing=normalized(r)===normalized(other);
    if(samePriority) priorityMatches++;
    if(sameMissing) missingMatches++;
    if(!samePriority || !sameMissing) changed.push(r.rfi_id);
  }
  return {eligible, priorityMatches, missingMatches, changed};
}
