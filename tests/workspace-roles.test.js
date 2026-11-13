import test from "node:test";
import assert from "node:assert/strict";
import { allowedActions, initialRecords, visibleTo, contractor, designer, reviseRecord } from "../js/workspace-data.js";

test("submitter sees own records and responder sees only assigned records", () => {
  const records = initialRecords();
  assert.equal(visibleTo(records.find(r => r.id === "RFI-025"), "submitter"), false);
  assert.equal(visibleTo(records.find(r => r.id === "RFI-024"), "responder"), false);
  assert.equal(visibleTo(records.find(r => r.id === "RFI-026"), "responder"), true);
});

test("manager can resubmit revised company records without acquiring external date rights", () => {
  const record = { ...initialRecords()[0], status: "returned", responsibleCompany: designer };
  assert.deepEqual(allowedActions(record, "manager"), ["edit", "submit"]);
  assert.equal(allowedActions({ ...record, originCompany: designer, responsibleCompany: contractor }, "manager").includes("edit"), false);
});

test("readers have no mutation actions in any workflow state", () => {
  for (const status of ["draft", "submitted", "returned", "assigned", "clarification", "responseReview", "answered"]) {
    assert.deepEqual(allowedActions({ ...initialRecords()[0], status }, "reader"), []);
  }
});

test("only the assigned responder can issue a response awaiting sign-off", () => {
  const record = { ...initialRecords()[0], status: "responseReview", assignee: "Priya Shah" };
  assert.equal(allowedActions(record, "checker").includes("release"), false);
  assert.equal(allowedActions(record, "responder").includes("release"), true);
  assert.equal(allowedActions({ ...record, assignee: "Someone Else" }, "responder").includes("release"), false);
  assert.equal(allowedActions({ ...record, status: "assigned" }, "responder").includes("release"), false);
});


test("revision preserves issued evidence and invalidates stale response and recommendation", () => {
  const record = { ...initialRecords()[0], status: "answered", response: "Prior answer", signoff: { reviewer: "Reviewer" }, assignee: "Priya Shah" };
  reviseRecord(record, "Daniel Brooks", "Changed field condition");
  assert.equal(record.status, "submitted");
  assert.equal(record.revisions[0].response, "Prior answer");
  assert.equal(record.revisions[0].signoff.reviewer, "Reviewer");
  assert.equal(record.response, "");
  assert.equal(record.assignee, "");
  assert.equal(record.recommendation, null);
  assert.deepEqual(allowedActions(record, "checker"), ["approve", "return"]);
  assert.deepEqual(allowedActions(record, "responder"), []);
  assert.throws(() => reviseRecord(record, "Daniel", " "));
});
