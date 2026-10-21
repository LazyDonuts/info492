import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  mechanismTier,
  assessExtraction,
  projectDataset,
  validateRecords,
  parseUpload,
  seededSelection,
  disposition,
  sortAssessments,
  baseline,
  parseAnswerKey,
  score,
  csv,
} from "../js/demo2-core.js";
import { parseCSV } from "../js/rfi-data.js";
import { validateExtraction } from "../server/extraction.js";
import { packet, extraction, narrative } from "./demo2-fixtures.js";
const ten = () => Array.from({ length: 10 }, (_, i) => packet(i + 1));
const assess = (v) => assessExtraction(packet(1), extraction("TEST-1", v));
test("rubric critical branches and Unknown protection are explicit", () => {
  assert.equal(assess({ B: "No" }).priority, "P0");
  assert.equal(assess({ B: "Unknown" }).mitigation_unverified, true);
  assert.equal(assess({ B: "Yes" }).rule_branch, "P1_EFFECTIVE_PROTECTION");
  assert.equal(assess({ X: "No", D: "Unknown" }).priority, "P1");
  assert.equal(assess({ X: "Unknown", D: "Unknown", B: "Yes" }).priority, "P1");
  assert.equal(assess({ D: "No" }).rule_branch, "P1_NO_REMAINING_OPPORTUNITY");
});
test("tiered evaluation uses rules for complete evidence and boundary examples for partial packets", () => {
  const rich = assessExtraction(packet(1), extraction());
  assert.equal(rich.priority, "P0");
  assert.equal(rich.basis, "decision_rules");
  assert.ok(["High", "Medium"].includes(rich.confidence));
  assert.ok(rich.data_completeness.found.includes("U"));

  const partialRecord = {
    ...packet(2), title: "Panel dimension clarification",
    description: "Panels are still being fabricated while a dimension clarification remains unresolved. Production continues pending an answer.",
    supporting_text: "", review_context: "",
  };
  const partial = extraction("TEST-2", { M: "Unknown", X: "Unknown", D: "Unknown", B: "Unknown" });
  const ranked = assessExtraction(partialRecord, partial);
  assert.equal(ranked.priority, "P0");
  assert.equal(ranked.confidence, "Low");
  assert.ok(["mixed", "boundary_example_match"].includes(ranked.basis));
  assert.ok(ranked.matched_examples.includes("E1"));
});
test("very sparse information stays Needs Information under documented threshold", () => {
  const record = { ...packet(3), title: "Question", description: "Please clarify.", supporting_text: "", review_context: "" };
  const x = extraction("TEST-3", { U: "Unknown", A: "Unknown", M: "Unknown", X: "Unknown", D: "Unknown", B: "Unknown" });
  x.scope = { value: "unknown", quote: null, source: null };
  const r = assessExtraction(record, x);
  assert.equal(r.assessment_state, "needs_information");
  assert.equal(r.priority, null);
  assert.equal(r.rule_branch, "INSUFFICIENT_SIGNAL");
  assert.equal(r.confidence, "Low");
});
test("partial rule facts can use a boundary example, while contradictions remain unassigned", () => {
  for (const k of ["U", "A", "M", "X", "D"]) {
    const r = assess({ [k]: "Unknown" });
    assert.equal(r.priority, "P0");
    assert.equal(r.assessment_state, "assigned");
    assert.ok(r.matched_examples.length);
    assert.ok(r.missing_information.length);
  }
  const x = extraction();
  x.mechanisms[0].contradictions = [
    { explanation: "No cost vs replacement", evidence: [] },
  ];
  assert.equal(assessExtraction(packet(1), x).priority, null);
});
test("bounded Low needs affirmative evidence and absent monetary mechanism", () => {
  const x = extraction("TEST-1", { M: "No" });
  x.mechanisms[0].bounded_clarification = {
    value: "Yes",
    quote: narrative,
    source: "description",
  };
  assert.equal(assessExtraction(packet(1), x).priority, "P2");
  x.mechanisms[0].bounded_clarification.value = "Unknown";
  assert.equal(assessExtraction(packet(1), x).priority, "P0");
});
test("multiple mechanisms preserve supported P0 and unresolved questions", () => {
  const x = extraction();
  x.mechanisms.push(extraction("TEST-1", { X: "Unknown" }).mechanisms[0]);
  const r = assessExtraction(packet(1), x);
  assert.equal(r.priority, "P0");
  assert.ok(r.missing_information.some((q) => q.includes("normal review")));
  x.mechanisms[0] = extraction("TEST-1", { X: "No" }).mechanisms[0];
  assert.equal(assessExtraction(packet(1), x).priority, "P0");
  x.mechanisms.pop();
  assert.equal(assessExtraction(packet(1), x).priority, "P1");
});
test("resolved, out-of-scope, scope uncertainty and safety remain distinct", () => {
  for (const v of ["resolved", "out_of_scope"]) {
    const x = extraction();
    x.scope.value = v;
    assert.equal(assessExtraction(packet(1), x).assessment_state, "excluded");
  }
  const x = extraction("TEST-1", { M: "Unknown" });
  x.safety = {
    value: true,
    quote: "energized cable",
    source: "supporting_text",
  };
  const r = assessExtraction(packet(1), x);
  assert.equal(r.priority, "P0");
  assert.equal(r.safety_escalation, true);
  x.scope.value = "unknown";
  assert.equal(assessExtraction(packet(1), x).priority, "P0");
});
test("all 729 predicate combinations have coherent states; P0 never lacks required Yes evidence", () => {
  const vs = ["Yes", "No", "Unknown"];
  let count = 0;
  for (const U of vs)
    for (const A of vs)
      for (const M of vs)
        for (const X of vs)
          for (const D of vs)
            for (const B of vs) {
              const r = assess({ U, A, M, X, D, B });
              assert.ok(
                ["assigned", "needs_information"].includes(r.assessment_state),
              );
              if (r.priority === "P0" && r.basis === "decision_rules")
                assert.deepEqual([U, A, M, X, D], Array(5).fill("Yes"));
              if (r.assessment_state === "needs_information")
                assert.equal(r.priority, null);
              count++;
            }
  assert.equal(count, 729);
});
test("upload parses quoted CSV, BOM, aliases and rejects unsupported/duplicate/short records", () => {
  const rows = ten();
  assert.equal(
    parseUpload("\uFEFF" + JSON.stringify(rows), "sample.json").length,
    10,
  );
  assert.equal(parseUpload(csv(rows), "sample.csv").length, 10);
  assert.throws(() => parseUpload("not json", "x.txt"), /CSV or JSON/);
  assert.throws(() => validateRecords(rows.slice(0, 9), { exactlyTen: true }), /exactly 10/);
  rows[1].rfi_id = rows[0].rfi_id.toLowerCase();
  assert.throws(() => validateRecords(rows), /Duplicate/);
  const bad = ten();
  bad[0].description = "urgent";
  assert.throws(() => validateRecords(bad), /narrative/);
  const future = ten();
  future[0].true_priority_tier = "P1";
  assert.throws(() => validateRecords(future), /unsupported fields/);
  const aliases = ten().map(({ title, ...r }) => ({ ...r, subject: title }));
  assert.equal(
    validateRecords(aliases)[0].title,
    "Synthetic fixture panel dimension",
  );
  const collide = ten();
  collide[0].subject = "duplicate";
  assert.throws(() => validateRecords(collide), /mapped field/);
  assert.throws(
    () =>
      parseUpload(JSON.stringify({ records: ten(), answer_key: [] }), "x.json"),
    /only a records/,
  );
});
test("dates, nested objects, oversized content and malformed CSV fail without dropping rows", () => {
  const rows = ten();
  rows[0].submitted_date = "2026-02-30";
  assert.throws(() => validateRecords(rows), /valid YYYY/);
  rows[0] = packet(1);
  rows[0].supporting_text = { wrong: true };
  assert.throws(() => validateRecords(rows), /nested/);
  assert.throws(() => parseUpload("x".repeat(300000), "large.csv"), /256 KB/);
  assert.throws(
    () => parseUpload('rfi_id,title,description\na,"bad"junk,test', "x.csv"),
    /Unexpected/,
  );
});
test("source projection whitelists submission evidence and excludes every later outcome", async () => {
  const rows = parseCSV(await readFile("data/rfis.csv", "utf8")),
    projected = projectDataset(rows);
  assert.equal(projected.length, 1370);
  for (const r of projected)
    for (const k of Object.keys(r))
      assert.ok(
        !/(true_priority|impact_score|est_cost|closed|response_date|linked_|status|actual)/.test(
          k,
        ),
      );
  assert.equal(projected[0].attachments, rows[0].attachments);
  assert.ok(projected[0].provenance.includes("Synthetic"));
});
test("seeded selection is exact, unique and reproducible without modifying dataset", () => {
  const a = Array.from({ length: 30 }, (_, i) => packet(i)),
    before = JSON.stringify(a);
  assert.deepEqual(seededSelection(a, "one"), seededSelection(a, "one"));
  assert.notDeepEqual(seededSelection(a, "one"), seededSelection(a, "two"));
  assert.equal(
    new Set(seededSelection(a, "one").map((r) => r.rfi_id)).size,
    10,
  );
  assert.equal(JSON.stringify(a), before);
});
test("evidence citations require exact submitted excerpts, known fields and valid schema", () => {
  assert.ok(validateExtraction(extraction(), packet(1)));
  const cases = [
    (x) => (x.mechanisms[0].evidence.M.quote = "invented money"),
    (x) => (x.mechanisms[0].evidence.M.source = "true_priority_tier"),
    (x) => (x.rfi_id = "WRONG"),
    (x) => (x.mechanisms[0].evidence.X.value = "Maybe"),
    (x) => (x.extra = "bad"),
    (x) => (x.mechanisms = []),
  ];
  for (const change of cases) {
    const x = extraction();
    change(x);
    assert.throws(() => validateExtraction(x, packet(1)));
  }
  const u = extraction("TEST-1", { X: "Unknown" });
  u.mechanisms[0].evidence.X.quote = "invented";
  assert.throws(() => validateExtraction(u, packet(1)), /Unknown/);
  const c = extraction();
  c.mechanisms[0].contradictions = [{ explanation: "conflict", evidence: [] }];
  assert.throws(() => validateExtraction(c, packet(1)), /two cited/);
});
test("sorting prioritizes tiers, supported dates, timestamp and stable IDs; unknown is unranked", () => {
  const records = ten();
  const results = [
    { rfi_id: "TEST-1", priority: null },
    { rfi_id: "TEST-2", priority: "P1" },
    { rfi_id: "TEST-3", priority: "P0", decision_date: "2026-10-03" },
    { rfi_id: "TEST-4", priority: "P0", decision_date: "2026-10-02" },
    { rfi_id: "TEST-5", priority: "P2" },
  ];
  assert.deepEqual(
    sortAssessments(results, records).map((r) => r.rfi_id),
    ["TEST-4", "TEST-3", "TEST-2", "TEST-5", "TEST-1"],
  );
});
test("baseline is deliberately simple, handles whole words and has known negation limitation", () => {
  const r = baseline([
    {
      rfi_id: "A",
      title: "No demolition",
      description: "No demolition needed.",
    },
    { rfi_id: "B", title: "clarify", description: "No need to demolish." },
    { rfi_id: "C", title: "relocate", description: "additional work" },
    { rfi_id: "D", title: "clarify", description: "replacement" },
  ]);
  assert.deepEqual(
    r.map((x) => x.priority),
    ["P2", "P0", "P1", "P2"],
  );
});
test("reference validation is exact ten with independent labels and adjudication; failures stay wrong", () => {
  const records = ten(),
    key = records.map((r) => ({
      rfi_id: r.rfi_id,
      reviewer_a: "P0",
      reviewer_b: "P0",
      final_label: "P0",
      provenance: "synthetic test fixture",
      rationale: "test",
      adjudication: "test only",
    }));
  assert.equal(parseAnswerKey(csv(key), "key.csv", records).length, 10);
  const results = records.map((r) => ({
    rfi_id: r.rfi_id,
    assessment_state: "assigned",
    priority: "P0",
  }));
  results[0] = {
    rfi_id: records[0].rfi_id,
    assessment_state: "processing_error",
    priority: null,
  };
  const s = score(results, key);
  assert.equal(s.matches, 9);
  assert.equal(s.total, 10);
  assert.equal(s.highRecall.denominator, 10);
  assert.equal(s.failures, 1);
  assert.equal(s.coverage, 9);
  key[0].reviewer_b = "";
  assert.throws(() => parseAnswerKey(JSON.stringify(key), "key.json", records));
});
test("CSV exports prevent formula injection and preserve quoted/multiline evidence", () => {
  const out = csv([
    { id: "=SUM(A1)", text: 'quote " and\nnewline', other: " @x" },
  ]);
  assert.ok(out.includes("'=SUM"));
  assert.ok(out.includes("' @x"));
  assert.equal(parseCSV(out)[0].text, 'quote " and\nnewline');
});

test("prototype-named fields and null JSON cannot bypass the submission whitelist", () => {
  for (const field of ["constructor", "toString", "__proto__"]) {
    const rows = ten();
    Object.defineProperty(rows[0], field, {
      value: "outcome label",
      enumerable: true,
    });
    assert.throws(() => validateRecords(rows), /unsupported fields/);
  }
  assert.throws(() => parseUpload("null", "x.json"), /JSON must/);
  assert.throws(() => parseUpload("42", "x.json"), /JSON must/);
});

test("deadline citations cannot promote submission timestamps into decision deadlines", () => {
  const x = extraction();
  x.decision_date = {
    value: "2026-10-01",
    quote: "2026-10-01",
    source: "submitted_date",
  };
  assert.throws(
    () => validateExtraction(x, packet(1)),
    /narrative|invalid enum/,
  );
  x.decision_date = {
    value: "2026-10-02",
    quote: "Release date: 2026-10-02.",
    source: "supporting_text",
  };
  assert.ok(validateExtraction(x, packet(1)));
  x.decision_date.value = "2026-10-03";
  assert.throws(() => validateExtraction(x, packet(1)), /verbatim/);
});

test("short flag excerpts can document contradictions but cannot establish monetary mechanisms", () => {
  const r = { ...packet(1), contractor_claims_cost_impact: "Y" };
  const x = extraction();
  x.mechanisms[0].contradictions = [
    {
      explanation: "Source assertion conflicts with narrative",
      evidence: [
        { quote: "Y", source: "contractor_claims_cost_impact" },
        { quote: "No demolition is required", source: "description" },
      ],
    },
  ];
  assert.ok(validateExtraction(x, r));
  x.mechanisms[0].contradictions = [];
  x.mechanisms[0].evidence.M = {
    value: "Yes",
    quote: "Y",
    source: "contractor_claims_cost_impact",
  };
  assert.throws(
    () => validateExtraction(x, r),
    /narrative evidence|invalid enum/,
  );
});
