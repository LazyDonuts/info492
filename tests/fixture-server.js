// Explicit local browser-QA harness. Not loaded by production or any page.
// Deliberately returns canned extraction objects; never counts as live-model verification.
import { createServer } from "../server/index.js";
import { packet, extraction } from "./demo2-fixtures.js";
import { writeFile } from "node:fs/promises";
const records = Array.from({ length: 10 }, (_, i) => packet(i + 1));
await writeFile(
  "/tmp/info492-demo2-ui-fixture.json",
  JSON.stringify(records, null, 2),
);
const key = records.map((r, i) => ({
  rfi_id: r.rfi_id,
  reviewer_a: [
    "P0",
    "P0",
    "P1",
    "P1",
    "P2",
    "Needs Information",
    "Needs Information",
    "P0",
    "Excluded",
    "Needs Information",
  ][i],
  reviewer_b: [
    "P0",
    "P0",
    "P1",
    "P1",
    "P2",
    "Needs Information",
    "Needs Information",
    "P0",
    "Excluded",
    "Needs Information",
  ][i],
  final_label: [
    "P0",
    "P0",
    "P1",
    "P1",
    "P2",
    "Needs Information",
    "Needs Information",
    "P0",
    "Excluded",
    "Needs Information",
  ][i],
  provenance: "Invented browser-QA fixture, not independent human reference",
  rationale: "Transport test only",
  adjudication: "Not actual annotation",
}));
await writeFile("/tmp/info492-demo2-ui-key.json", JSON.stringify(key));
await writeFile(
  "/tmp/info492-demo2-ui-invalid.json",
  JSON.stringify([...records.slice(0, 9), records[0]]),
);
const providerFetch = async (_url, opts) => {
  const r = JSON.parse(JSON.parse(opts.body).input),
    n = Number(r.rfi_id.split("-")[1]);
  let values = {};
  if (n === 2) values = { B: "Unknown" };
  if (n === 3) values = { X: "No" };
  if (n === 4) values = { B: "Yes" };
  if (n === 5) values = { M: "No" };
  if (n === 6) values = { X: "Unknown" };
  const x = extraction(r.rfi_id, values);
  if (n === 5)
    x.mechanisms[0].bounded_clarification = {
      value: "Yes",
      quote: r.description,
      source: "description",
    };
  if (n === 7)
    x.mechanisms[0].contradictions = [
      {
        explanation: "Synthetic contradiction fixture",
        evidence: [
          { quote: r.description, source: "description" },
          { quote: r.description, source: "description" },
        ],
      },
    ];
  if (n === 8) {
    x.mechanisms.push(extraction(r.rfi_id, { X: "Unknown" }).mechanisms[0]);
    x.safety = {
      value: true,
      quote: "energized cable",
      source: "supporting_text",
    };
  }
  if (n === 9) x.scope.value = "resolved";
  if (n === 10)
    x.mechanisms[0].evidence.M.quote =
      "Intentionally invalid source quote to exercise processing failure";
  return Response.json({
    status: "completed",
    id: "TEST-FIXTURE-NO-AI",
    model: "test-fixture",
    output: [{ content: [{ type: "output_text", text: JSON.stringify(x) }] }],
  });
};
const server = await createServer({
  env: {
    OPENAI_API_KEY: "TEST-ONLY",
    OPENAI_MODEL: "test-fixture",
    DEMO2_ACCESS_TOKEN: "test-fixture-token-not-a-real-secret-12345",
    ALLOWED_ORIGINS: "http://127.0.0.1:4923",
  },
  providerFetch,
  executionMode: "test_fixture",
});
server.listen(4923, "127.0.0.1", () =>
  console.log(
    "Explicit TEST FIXTURE at http://127.0.0.1:4923/demo2.html — no real AI. Input/key fixtures written to /tmp; never use for course results.",
  ),
);
