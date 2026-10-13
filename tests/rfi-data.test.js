import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DATA_FILES,
  parseCSV,
  buildModel,
  queryRecords,
  summarize,
  number,
  date,
  loadData,
} from "../js/rfi-data.js";
const tables = Object.fromEntries(
  await Promise.all(
    DATA_FILES.map(async (k) => [
      k,
      parseCSV(
        await readFile(new URL(`../data/${k}.csv`, import.meta.url), "utf8"),
      ),
    ]),
  ),
);
const model = buildModel(tables);
test("CSV preserves escaped commas, quotes, multiline text, BOM and blank/zero distinctions", () => {
  const rows = parseCSV(
    '\uFEFFRFI ID,description,amount\r\nA1,"A, B and ""C""\nD",0\r\nA2,plain,\r\n',
  );
  assert.equal(rows[0].description, 'A, B and "C"\nD');
  assert.equal(number(rows[0].amount), 0);
  assert.equal(number(rows[1].amount), null);
  assert.throws(() => parseCSV("id,id\n1,2"), /unique/);
  assert.throws(() => parseCSV("id,name\n1"), /fields/);
  assert.throws(() => parseCSV('id\n"broken'), /Unclosed/);
});
test("number and date parsing reject missing, invalid and rolled-over dates", () => {
  assert.equal(number("$1,250.50"), 1250.5);
  assert.equal(number("N/A"), null);
  assert.equal(number("abc"), null);
  assert.equal(date("2024-02-29"), "2024-02-29");
  assert.equal(date("2024-02-31"), null);
  assert.equal(date(""), null);
});
test("actual source has all RFIs, contracts, change orders and relationships", () => {
  assert.equal(model.records.length, 1370);
  assert.equal(model.tableCounts.contracts, 7);
  assert.equal(model.tableCounts.change_orders, 328);
  assert.equal(model.tableCounts.rfi_change_order_link, 399);
  assert.equal(model.options.category.length, 12);
  assert.equal(model.options.trade.length, 11);
  assert.equal(model.records[0].id, "E320-RFI-0001");
  assert.equal(model.records.at(-1).id, "DRLE-RFI-0340");
  assert.deepEqual(model.warnings, []);
});
test("summary reconciles counts and response duration to raw source", () => {
  const s = summarize(model.records);
  assert.equal(s.closed, 1327);
  assert.equal(s.withdrawn, 43);
  assert.equal(s.open, 0);
  assert.equal(s.cost, 652);
  assert.equal(s.responseN, 1370);
  const rawAverage =
    tables.rfis.reduce((n, r) => n + Number(r.response_days_final), 0) / 1370;
  assert.equal(s.response, rawAverage);
});
test("combined search/category/trade/reviewer/status/package/cost filters use AND", () => {
  const f = {
    category: "Utility Conflict / Relocation",
    trade: "Civil/Utilities",
    responsible: "Design-Build EOR / ST Design Review",
    status: "Closed",
    package: "DRLE",
    cost: "estimate",
    search: "conflict",
  };
  const expected = tables.rfis.filter(
    (r) =>
      r.content_category === f.category &&
      r.discipline === f.trade &&
      r.assigned_reviewer === f.responsible &&
      r.status === f.status &&
      r.package_id === f.package &&
      (r.contractor_est_cost_high_usd !== "" ||
        r.contractor_est_cost_low_usd !== "") &&
      (r.subject + " " + r.description).toLowerCase().includes("conflict"),
  );
  assert.deepEqual(
    queryRecords(model.records, f, "id", "asc").map((r) => r.id),
    expected.map((r) => r.rfi_id).sort(),
  );
  assert.equal(
    queryRecords(model.records, { search: "e320-rfi-0001" })[0].id,
    "E320-RFI-0001",
  );
  assert.equal(
    queryRecords(model.records, { search: "no-such-record" }).length,
    0,
  );
  assert.equal(queryRecords(model.records, {}).length, 1370);
});
test("sorting by estimates/date/allocated amount uses numeric or chronological values and puts missing last", () => {
  for (const key of ["estimate", "submitted", "approved"]) {
    const sorted = queryRecords(model.records, {}, key, "desc");
    const val = (r) =>
      key === "estimate"
        ? (r.estimateHigh ?? r.estimateLow)
        : key === "approved"
          ? r.linkedIds.length
            ? r.approved
            : null
          : r.submitted;
    const values = sorted.map(val).filter((v) => v !== null);
    for (let i = 1; i < values.length; i++)
      assert.ok(values[i - 1] >= values[i]);
  }
});
test("each CO allocation sums to one and totals are reconciled without multiplying whole CO cost", () => {
  let allocated = 0;
  const sums = new Map();
  for (const e of tables.rfi_change_order_link) {
    allocated += Number(e.allocated_approved_cost_usd);
    sums.set(e.co_id, (sums.get(e.co_id) || 0) + Number(e.allocation_share));
  }
  for (const sum of sums.values()) assert.ok(Math.abs(sum - 1) < 0.0001);
  const rfiSum = model.records.reduce(
    (n, r) => n + (r.linkedIds.length ? r.approved : 0),
    0,
  );
  assert.equal(rfiSum, allocated);
  const coTotal = tables.change_order_outcomes.reduce(
    (n, r) => n + Number(r.final_approved_cost_usd),
    0,
  );
  assert.ok(
    Math.abs(coTotal - allocated) <= 328,
    `source rounding: ${coTotal - allocated}`,
  );
});
test("many-to-many association retains allocation, never attributes whole CO to every RFI", () => {
  const m = buildModel({
    rfis: [{ rfi_id: "A" }, { rfi_id: "B" }],
    change_orders: [{ co_id: "CO" }],
    change_order_outcomes: [{ co_id: "CO", final_approved_cost_usd: "100" }],
    rfi_change_order_link: [
      {
        rfi_id: "A",
        co_id: "CO",
        allocation_share: ".4",
        allocated_approved_cost_usd: "40",
      },
      {
        rfi_id: "B",
        co_id: "CO",
        allocation_share: ".6",
        allocated_approved_cost_usd: "60",
      },
    ],
  });
  assert.equal(m.records[0].approved, 40);
  assert.equal(m.records[1].approved, 60);
});
test("missing fields remain missing; submission contractor is never used as responder", () => {
  const m = buildModel({
    rfis: [
      {
        rfi_id: "A",
        contractor: "Submitter",
        contractor_est_cost_low_usd: "",
        true_priority_tier: "P1 – Critical",
        impact_score_0_100: "100",
      },
    ],
  });
  assert.equal(m.records[0].responsible, null);
  assert.equal(m.records[0].estimateLow, null);
  assert.equal(m.records[0].status, null);
  assert.equal(summarize(m.records).open, null);
  assert.deepEqual(m.options.trade, []);
  assert.equal(queryRecords(m.records, { search: "Critical" }).length, 0);
  assert.equal(queryRecords(m.records, { responsible: "__missing" }).length, 1);
});
test("duplicate IDs/links are rejected and orphan links are visible", () => {
  assert.throws(
    () => buildModel({ rfis: [{ rfi_id: "A" }, { rfi_id: "A" }] }),
    /Duplicate/,
  );
  assert.throws(
    () =>
      buildModel({
        rfis: [{ rfi_id: "A" }],
        rfi_change_order_link: [
          { rfi_id: "A", co_id: "X" },
          { rfi_id: "A", co_id: "X" },
        ],
      }),
    /Duplicate/,
  );
  assert.ok(
    buildModel({
      rfis: [{ rfi_id: "A" }],
      rfi_change_order_link: [{ rfi_id: "B", co_id: "X" }],
    }).warnings.some((w) => w.includes("Orphan")),
  );
});
test("HTTP loading reports optional-table failure and fails clearly on missing primary data", async () => {
  const fetcher = async (u) => ({
    ok: u.endsWith("rfis.csv"),
    status: 404,
    text: async () => "rfi_id,description\nA,example",
  });
  assert.equal((await loadData("test/", fetcher)).warnings.length, 5);
  await assert.rejects(
    loadData("test/", async () => ({ ok: false, status: 404 })),
    /Could not load rfis/,
  );
});
test("empty source produces an honest empty model", () => {
  const m = buildModel({ rfis: [] });
  assert.equal(summarize(m.records).total, 0);
  assert.equal(summarize(m.records).response, null);
  assert.equal(queryRecords(m.records).length, 0);
});
