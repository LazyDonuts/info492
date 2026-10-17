import test from "node:test";
import assert from "node:assert/strict";
import {
  workingAssessment,
  assessExtraction,
  score,
} from "../js/demo2-core.js";
import { packet, extraction } from "./demo2-fixtures.js";
const missing = {
  rfi_id: "TEST-1",
  assessment_state: "needs_information",
  priority: null,
  missing_information: ["Cost mechanism?"],
};
test("incomplete submissions get a flagged working priority without changing the evidence decision", () => {
  const before = structuredClone(missing),
    v = workingAssessment(missing, packet(1));
  assert.equal(v.priority, "P1");
  assert.equal(v.provisional, true);
  assert.equal(v.needs_information_flag, true);
  assert.equal(v.validated_assessment_state, "needs_information");
  assert.deepEqual(missing, before);
  assert.equal(
    score([missing], [{ rfi_id: "TEST-1", final_label: "P1" }]).matches,
    0,
  );
});
test("reported compound exposure can prioritize human verification but never claims validated AI evidence", () => {
  const r = {
    ...packet(1),
    contractor_claims_cost_impact: "Y",
    contractor_claims_schedule_impact: "Yes",
    on_critical_path_at_submittal: "true",
  };
  const v = workingAssessment(missing, r);
  assert.equal(v.priority, "P0");
  assert.equal(v.working_basis, "submission_rules_not_ai");
  assert.equal(v.provisional, true);
  assert.equal(
    workingAssessment(missing, {
      ...r,
      contractor_claims_schedule_impact: "",
      on_critical_path_at_submittal: "",
    }).priority,
    "P1",
  );
});
test("input-only P2 requires explicit no-impact flags and a clarification description; absence defaults to P1", () => {
  const r = {
    ...packet(1),
    title: "Drawing reference clarification",
    contractor_claims_cost_impact: "N",
    contractor_claims_schedule_impact: "No",
    on_critical_path_at_submittal: "false",
  };
  const v = workingAssessment(missing, r);
  assert.equal(v.priority, "P2");
  assert.equal(v.needs_information_flag, true);
  assert.equal(
    workingAssessment(missing, { ...r, contractor_claims_cost_impact: "" })
      .priority,
    "P1",
  );
});
test("processing errors retain raw error and use only submitted input for provisional routing", () => {
  const error = {
    rfi_id: "TEST-1",
    assessment_state: "processing_error",
    priority: null,
    error: "Provider unavailable",
    raw_output: "untrusted invalid output",
  };
  const v = workingAssessment(error, packet(1));
  assert.equal(v.priority, "P1");
  assert.equal(v.ai_review_failed, true);
  assert.equal(v.validation_error, "Provider unavailable");
  assert.equal(v.working_basis, "submission_rules_not_ai");
  assert.ok(v.missing_information.length);
  assert.equal(error.priority, null);
});
test("confirmed priorities and exclusions remain intact", () => {
  const r = assessExtraction(packet(1), extraction());
  const v = workingAssessment(r, packet(1));
  assert.equal(v.priority, "P0");
  assert.equal(v.provisional, false);
  const ex = workingAssessment(
    { assessment_state: "excluded", priority: null },
    packet(1),
  );
  assert.equal(ex.priority, null);
  assert.equal(ex.assessment_state, "excluded");
});
test("validated partial exposure supports provisional P0 with explicit remaining uncertainty", () => {
  const r = assessExtraction(packet(1), extraction("TEST-1", { D: "Unknown" }));
  const v = workingAssessment(r, packet(1));
  assert.equal(r.priority, null);
  assert.equal(v.priority, "P0");
  assert.equal(v.working_basis, "validated_partial_evidence");
  assert.equal(v.provisional, true);
});

test("urgency alone is not P0; financial-plus-urgency and schedule-plus-critical signals are explicit provisional routes", () => {
  const r = { ...packet(1), contractor_priority_flag: "Urgent" };
  assert.equal(workingAssessment(missing, r).priority, "P1");
  assert.equal(
    workingAssessment(missing, { ...r, contractor_claims_cost_impact: "Y" })
      .priority,
    "P0",
  );
  assert.equal(
    workingAssessment(missing, {
      ...r,
      contractor_claims_schedule_impact: "Y",
      on_critical_path_at_submittal: "Y",
    }).priority,
    "P0",
  );
});
