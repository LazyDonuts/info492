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

test("malformed currencies and dates are unavailable, never silently repaired", () => {
  for (const value of ['1,2', '12,34.00', '1 2', '0x10', '1.2.3', '$', 'Infinity', 'NaN', '1e3'])
    assert.equal(number(value), null, value);
  for (const [input, expected] of [['$1,234.50',1234.5],['-12.50',-12.5],['.5',.5],['0',0],['1,000,000',1000000]])
    assert.equal(number(input), expected);
  assert.equal(date('2024-02-29Tgarbage'), null);
  assert.equal(date('2024-13-01'), null);
  assert.equal(date('2023-02-29'), null);
  assert.throws(() => parseCSV('id,name\nA,"question"junk'), /Unexpected text/);
});

test("partial allocation files preserve all listed CO IDs and never present a partial sum as total", () => {
  const m = buildModel({rfis:[{rfi_id:'A',linked_co_ids:'X; Y',linked_approved_cost_usd:'100'}],
    change_orders:[{co_id:'X'},{co_id:'Y'}],
    rfi_change_order_link:[{rfi_id:'A',co_id:'X',allocation_share:'1',allocated_approved_cost_usd:'40'}]});
  assert.deepEqual(m.records[0].linkedIds, ['X','Y']);
  assert.deepEqual(m.records[0].missingLinks, ['Y']);
  assert.equal(m.records[0].approved, null);
  assert.ok(m.warnings.some(w=>w.includes('Missing allocation links for A: Y')));
  const fallback = buildModel({rfis:[{rfi_id:'A',linked_co_ids:'X; Y',linked_approved_cost_usd:'100'}]});
  assert.equal(fallback.records[0].approved,100);
  assert.ok(fallback.warnings.some(w=>w.includes('Missing allocation links')));
});

test("missing amounts within a linked set do not become a partial or zero aggregate", () => {
  const m=buildModel({rfis:[{rfi_id:'A'}],rfi_change_order_link:[
    {rfi_id:'A',co_id:'X',allocation_share:'1',allocated_approved_cost_usd:'0'},
    {rfi_id:'A',co_id:'Y',allocation_share:'1',allocated_approved_cost_usd:''}
  ]});
  assert.equal(m.records[0].approved,null);
  assert.equal(m.records[0].linkedCOs[0].approved,0);
});

test("cost absence distinguishes no positive evidence from entirely unrecorded information", () => {
  assert.equal(queryRecords(model.records,{cost:'missing'}).length,1370-652);
  assert.equal(queryRecords(model.records,{cost:'unavailable'}).length,0);
  const m=buildModel({rfis:[
    {rfi_id:'unknown'},
    {rfi_id:'negative',contractor_claims_cost_impact:'N'},
    {rfi_id:'positive',contractor_claims_cost_impact:'Y'},
    {rfi_id:'zero-estimate',contractor_est_cost_high_usd:'0'}
  ]});
  assert.deepEqual(queryRecords(m.records,{cost:'missing'},'id','asc').map(r=>r.id),['negative','unknown']);
  assert.deepEqual(queryRecords(m.records,{cost:'unavailable'}).map(r=>r.id),['unknown']);
  assert.equal(summarize(m.records).cost,2);
});

test("all source filter choices match independent raw-table counts", () => {
  const mapping={status:'status',category:'content_category',trade:'discipline',responsible:'assigned_reviewer',package:'package_id'};
  for (const [ui,raw] of Object.entries(mapping)) {
    for (const value of model.options[ui]) {
      assert.equal(queryRecords(model.records,{[ui]:value}).length,tables.rfis.filter(r=>r[raw]===value).length,`${ui} ${value}`);
      if (ui !== "package") for (const packageId of model.options.package)
        assert.equal(queryRecords(model.records,{[ui]:value,package:packageId}).length,tables.rfis.filter(r=>r[raw]===value && r.package_id===packageId).length);
    }
  }
  assert.equal(queryRecords(model.records,{cost:'flag'}).length,621);
  assert.equal(queryRecords(model.records,{cost:'estimate'}).length,603);
  assert.equal(queryRecords(model.records,{cost:'linked'}).length,399);
});

test("search handles whitespace, case, partial IDs and literal punctuation without regex injection", () => {
  assert.equal(queryRecords(model.records,{search:'   '}).length,1370);
  const lower=queryRecords(model.records,{search:'e320-rfi-00'}).map(r=>r.id);
  assert.deepEqual(queryRecords(model.records,{search:'E320-RFI-00'}).map(r=>r.id),lower);
  assert.equal(lower.length,99);
  for (const q of ['(SR 202)','8-in.','.*','<script>','"',"'",'TPSS/OCS']) {
    const words=q.toLowerCase().split(/\s+/);
    const expected=tables.rfis.filter(r=>words.every(w=>[r.rfi_id,r.subject,r.description,r.location,r.content_category,r.discipline,r.assigned_reviewer,r.package_id].join(' ').toLowerCase().includes(w)));
    assert.equal(queryRecords(model.records,{search:q}).length,expected.length,q);
  }
});

test("all supported sorts remain ordered after filtering, in both directions, with nulls last", () => {
  for(const key of ['id','submitted','estimate','approved','category','responsible','priority','status'])
    for(const direction of ['asc','desc']) {
      const result=queryRecords(model.records,{package:'DRLE'},key,direction);
      const value=r=>key==='estimate'?(r.estimateHigh??r.estimateLow):key==='approved'?(r.linkedIds.length?r.approved:null):r[key];
      let missing=false;
      for(let i=0;i<result.length;i++) {
        const v=value(result[i]);
        if(v===null) {missing=true;continue;}
        assert.equal(missing,false);
        if(i && value(result[i-1])!==null) {
          const prev=value(result[i-1]);
          const cmp=typeof v==='number'?prev-v:String(prev).localeCompare(String(v),undefined,{numeric:true});
          assert.ok(direction==='asc'?cmp<=0:cmp>=0,`${key} ${direction}`);
        }
      }
    }
});

test("source keys, category codes, dates and package relationships are internally consistent", () => {
  const rfis=new Map(tables.rfis.map(r=>[r.rfi_id,r]));
  const cos=new Map(tables.change_orders.map(r=>[r.co_id,r]));
  const packages=new Set(tables.contracts.map(r=>r.package_id));
  const categories=new Map();
  for(const r of tables.rfis) {
    assert.ok(packages.has(r.package_id));
    if(categories.has(r.content_category_code)) assert.equal(categories.get(r.content_category_code),r.content_category);
    categories.set(r.content_category_code,r.content_category);
    for(const k of ['submitted_date','response_date','closed_date']) assert.ok(date(r[k]),`${r.rfi_id} ${k}`);
    const initial=(Date.parse(r.response_date)-Date.parse(r.submitted_date))/86400000;
    const final=(Date.parse(r.closed_date)-Date.parse(r.submitted_date))/86400000;
    assert.ok(initial >= 0 && final >= initial);
  }
  for(const co of tables.change_orders) {
    assert.ok(packages.has(co.package_id));
    const links=tables.rfi_change_order_link.filter(e=>e.co_id===co.co_id);
    assert.equal(links.length,number(co.linked_rfi_count));
    assert.deepEqual(links.map(e=>e.rfi_id).sort(),co.linked_rfi_ids.split(/[;,|]/).map(v=>v.trim()).sort());
  }
  for(const e of tables.rfi_change_order_link) {
    assert.ok(rfis.has(e.rfi_id)); assert.ok(cos.has(e.co_id));
    assert.equal(rfis.get(e.rfi_id).package_id,cos.get(e.co_id).package_id);
  }
  for(const outcome of tables.change_order_outcomes) {
    assert.ok(cos.has(outcome.co_id));
    assert.equal(outcome.package_id,cos.get(outcome.co_id).package_id);
  }
});

test("each RFI and CO reconciles its own allocation totals, not only the global total", () => {
  for(const r of model.records.filter(r=>r.linkedIds.length)) {
    assert.equal(r.approved,number(r.raw.linked_approved_cost_usd));
    assert.equal(r.requested,number(r.raw.linked_requested_cost_usd));
  }
  for(const co of tables.change_order_outcomes) {
    const links=tables.rfi_change_order_link.filter(e=>e.co_id===co.co_id);
    const allocated=links.reduce((n,e)=>n+number(e.allocated_approved_cost_usd),0);
    const diff=allocated-number(co.final_approved_cost_usd);
    const expected={'E330-CO-006':-10,'E330-CO-039':10};
    assert.equal(diff,expected[co.co_id] || 0,co.co_id);
  }
});

test("invalid metadata and unresolved relationships are surfaced without editing source", () => {
  const tables={rfis:[{rfi_id:'A',package_id:'missing',submitted_date:'2024-02-31',contractor_est_cost_high_usd:'1,2',contractor_claims_cost_impact:'perhaps',linked_co_ids:'X'}],
    change_orders:[{co_id:'X',package_id:'other'}],
    rfi_change_order_link:[{rfi_id:'A',co_id:'X',allocation_share:'2',allocated_approved_cost_usd:'30'}]};
  const copy=JSON.stringify(tables);
  const m=buildModel(tables);
  assert.equal(m.records[0].submitted,null);assert.equal(m.records[0].estimateHigh,null);assert.equal(m.records[0].costFlag,null);
  for(const text of ['Invalid submitted_date','Invalid contractor_est_cost_high_usd','Invalid contractor_claims_cost_impact','Contract package missing','Package mismatch','CO outcome missing','Invalid allocation share'])
    assert.ok(m.warnings.some(w=>w.includes(text)),text);
  assert.equal(JSON.stringify(tables),copy);
});

test("package chart includes missing packages and reconciles totals after all other filters", async () => {
  const {packageCounts}=await import('../js/rfi-data.js');
  const counts=packageCounts(model.records,{package:'DRLE',cost:'estimate'});
  assert.equal(counts.reduce((n,[,v])=>n+v,0),603);
  assert.equal(counts.find(([p])=>p==='DRLE')[1],queryRecords(model.records,{package:'DRLE',cost:'estimate'}).length);
  const m=buildModel({rfis:[{rfi_id:'A'},{rfi_id:'B',package_id:'P'}]});
  assert.deepEqual(packageCounts(m.records),[['__missing',1],['P',1]]);
});

test("source duration and CO discrepancies are exposed rather than silently rewritten", () => {
  assert.equal(model.reconciliation.durations.initial.length,401);
  assert.equal(model.reconciliation.durations.final.length,390);
  assert.deepEqual(model.reconciliation.allocations.filter(r=>r.field==='allocated_approved_cost_usd').map(r=>[r.coId,r.difference]),[['E330-CO-006',-10],['E330-CO-039',10]]);
  const r=model.records.find(r=>r.id==='E320-RFI-0003');
  assert.equal(r.responseDays,16);
  assert.equal(r.finalCalendarDays,18);
  assert.equal(r.raw.response_days_final,'16');
});
