// Pure parsing and query functions. The UI never modifies source records.
export const MISSING = "Not recorded";
export const DATA_FILES = [
  "rfis",
  "contracts",
  "change_orders",
  "change_order_outcomes",
  "rfi_change_order_link",
  "data_dictionary",
];
export function parseCSV(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closedQuote = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (closedQuote && c !== "," && c !== "\n" && c !== "\r")
      throw new Error("Unexpected text after a quoted CSV field.");
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (!field || quoted) {
        closedQuote = quoted;
        quoted = !quoted;
      }
      else throw new Error("Unexpected quote in CSV field.");
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
      closedQuote = false;
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      field = "";
      closedQuote = false;
    } else field += c;
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map((v) =>
    v
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
  );
  if (new Set(headers).size !== headers.length || headers.some((v) => !v))
    throw new Error("CSV headers must be unique and nonempty.");
  return rows.map((values, index) => {
    if (values.length !== headers.length)
      throw new Error(
        `CSV row ${index + 2}: expected ${headers.length} fields, got ${values.length}.`,
      );
    return Object.fromEntries(headers.map((h, i) => [h, values[i].trim()]));
  });
}
export function number(value) {
  if (
    value == null ||
    String(value).trim() === "" ||
    /^(n\/?a|null|unknown|not recorded)$/i.test(String(value).trim())
  )
    return null;
  // Accept decimal/currency values, never repair malformed grouping or coerce hex.
  const input = String(value).trim();
  if (!/^[+-]?\$?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)$/.test(input))
    return null;
  const s = input.replace(/[$,]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function date(value) {
  if (!value) return null;
  const s = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(day + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === day
    ? day
    : null;
}
export function flag(v) {
  return /^(y|yes|true|1)$/i.test(String(v))
    ? true
    : /^(n|no|false|0)$/i.test(String(v))
      ? false
      : null;
}
const text = (v) =>
  v == null || String(v).trim() === "" ? null : String(v).trim();
export const FILTER_FIELDS = [
  "status",
  "category",
  "trade",
  "responsible",
  "package",
];
export function buildModel(tables) {
  const warnings = [],
    rows = tables.rfis || [];
  if (rows.length && !Object.hasOwn(rows[0], "rfi_id"))
    throw new Error("rfis.csv needs an rfi_id column. See docs/DATA.md.");
  const index = (records, key) => {
    const map = new Map();
    for (const r of records || []) {
      const id = text(r[key]);
      if (!id) {
        warnings.push(`Missing ${key} in a related table; row ignored.`);
        continue;
      }
      if (map.has(id))
        throw new Error(
          `Duplicate ${key}: ${id}. Correct the source before loading.`,
        );
      map.set(id, r);
    }
    return map;
  };
  const contracts = index(tables.contracts, "package_id"),
    orders = index(tables.change_orders, "co_id"),
    outcomes = index(tables.change_order_outcomes, "co_id");
  validateValues(tables, warnings);
  for (const r of rows)
    if (text(r.package_id) && !contracts.has(r.package_id))
      warnings.push(`Contract package missing ${r.package_id} for ${r.rfi_id}.`);
  for (const [id, order] of orders) {
    if (!outcomes.has(id)) warnings.push(`CO outcome missing ${id}.`);
    if (text(order.package_id) && !contracts.has(order.package_id))
      warnings.push(`Contract package missing ${order.package_id} for ${id}.`);
  }
  for (const id of outcomes.keys())
    if (!orders.has(id)) warnings.push(`Orphan CO outcome ${id}; register missing.`);
  const ids = new Set(),
    links = new Map(),
    seen = new Set(),
    shareSums = new Map();
  for (const r of rows) {
    if (!text(r.rfi_id))
      throw new Error("An RFI has no rfi_id. IDs must be preserved.");
    if (ids.has(r.rfi_id)) throw new Error(`Duplicate RFI ID: ${r.rfi_id}.`);
    ids.add(r.rfi_id);
  }
  for (const link of tables.rfi_change_order_link || []) {
    const key = `${link.rfi_id}\0${link.co_id}`;
    if (seen.has(key))
      throw new Error(`Duplicate RFI/CO link: ${link.rfi_id} / ${link.co_id}.`);
    seen.add(key);
    if (!ids.has(link.rfi_id)) {
      warnings.push(`Orphan RFI link ${link.rfi_id}; excluded.`);
      continue;
    }
    if (!text(link.co_id)) throw new Error(`Missing co_id in link for ${link.rfi_id}.`);
    const share = number(link.allocation_share);
    if (share === null || share < 0 || share > 1)
      warnings.push(`Invalid allocation share for ${link.rfi_id} / ${link.co_id}.`);
    if (share !== null)
      shareSums.set(link.co_id, (shareSums.get(link.co_id) || 0) + share);
    if (!orders.has(link.co_id))
      warnings.push(
        `CO register missing ${link.co_id}. Allocation record retained.`,
      );
    const edge = {
      id: link.co_id,
      share,
      requested: number(link.allocated_requested_cost_usd),
      approved: number(link.allocated_approved_cost_usd),
      time: number(link.allocated_time_days),
      order: orders.get(link.co_id) || {},
      outcome: outcomes.get(link.co_id) || {},
    };
    if (!links.has(link.rfi_id)) links.set(link.rfi_id, []);
    links.get(link.rfi_id).push(edge);
  }
  for (const [id, sum] of shareSums)
    if (Math.abs(sum - 1) > 0.0001)
      warnings.push(
        `Allocation shares for ${id} sum to ${sum.toFixed(4)}, not 1. Review source.`,
      );
  const records = rows.map((r, i) => {
    const edges = links.get(r.rfi_id) || [];
    const directIds = (r.linked_co_ids || "")
      .split(/[;,|]/)
      .map((v) => v.trim())
      .filter(Boolean);
    const linkedIds = [...new Set([...directIds, ...edges.map((e) => e.id)])];
    const missingLinks = directIds.filter((id) => !edges.some((e) => e.id === id));
    if (missingLinks.length)
      warnings.push(`Missing allocation links for ${r.rfi_id}: ${missingLinks.join(", ")}.`);
    if (Object.hasOwn(r, "linked_co_ids") && edges.some((e) => !directIds.includes(e.id)))
      warnings.push(`RFI/link ID disagreement for ${r.rfi_id}; all supplied links retained.`);
    for (const edge of edges) {
      if (r.package_id && edge.order.package_id && r.package_id !== edge.order.package_id)
        warnings.push(`Package mismatch for ${r.rfi_id} / ${edge.id}.`);
    }
    // Existing allocations from the RFI sheet are already RFI-level amounts, never whole-CO amounts.
    const sumKnown = (field, fallback) =>
      edges.length
        ? !missingLinks.length && edges.every((e) => e[field] !== null)
          ? edges.reduce((n, e) => n + e[field], 0)
          : null
        : number(fallback);
    const record = {
      id: r.rfi_id,
      title: text(r.subject) || text(r.description) || MISSING,
      description: text(r.description),
      category: text(r.content_category),
      trade: text(r.discipline),
      responsible: text(r.assigned_reviewer),
      status: text(r.status),
      package: text(r.package_id),
      location: text(r.location),
      contractor: text(r.contractor),
      submittedBy: text(r.submitted_by),
      submitted: date(r.submitted_date),
      priority: text(r.contractor_priority_flag),
      costFlag: flag(r.contractor_claims_cost_impact),
      estimateLow: number(r.contractor_est_cost_low_usd),
      estimateHigh: number(r.contractor_est_cost_high_usd),
      responseDays: number(r.response_days_final),
      initialResponseDays: number(r.response_days_initial),
      responseDate: date(r.response_date),
      closedDate: date(r.closed_date),
      linkedCOs: edges,
      linkedIds,
      missingLinks,
      approved: sumKnown("approved", r.linked_approved_cost_usd),
      requested: sumKnown("requested", r.linked_requested_cost_usd),
      allocatedTime: sumKnown("time", r.linked_time_granted_days),
      contract: contracts.get(r.package_id) || {},
      raw: r,
      sourceIndex: i,
      initialCalendarDays: calendarDays(r.submitted_date, r.response_date),
      finalCalendarDays: calendarDays(r.submitted_date, r.closed_date),
    };
    record.hasEstimate =
      record.estimateLow !== null || record.estimateHigh !== null;
    record.hasCost =
      record.costFlag === true ||
      record.hasEstimate ||
      record.linkedIds.length > 0;
    record.search = [
      record.id,
      record.title,
      record.description,
      record.location,
      record.category,
      record.trade,
      record.responsible,
      record.package,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return record;
  });
  const options = Object.fromEntries(
    FILTER_FIELDS.map((k) => [
      k,
      [...new Set(records.map((r) => r[k]).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    ]),
  );
  const dictionary = tables.data_dictionary || [];
  return {
    records,
    options,
    warnings: [...new Set(warnings)],
    dictionary,
    tableCounts: Object.fromEntries(
      DATA_FILES.map((k) => [k, (tables[k] || []).length]),
    ),
    tables,
    reconciliation: reconcileSource(records, tables),
  };
}
export function queryRecords(
  records,
  filters = {},
  sortKey = "submitted",
  direction = "desc",
) {
  const words = String(filters.search || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  let result = records.filter(
    (r) =>
      words.every((w) => r.search.includes(w)) &&
      FILTER_FIELDS.every(
        (k) =>
          !filters[k] ||
          (filters[k] === "__missing" ? !r[k] : r[k] === filters[k]),
      ) &&
      (!filters.cost ||
        (filters.cost === "flag" && r.costFlag === true) ||
        (filters.cost === "estimate" && r.hasEstimate) ||
        (filters.cost === "linked" && r.linkedIds.length > 0) ||
        (filters.cost === "missing" &&
          !r.hasEstimate &&
          r.costFlag !== true &&
          r.linkedIds.length === 0) ||
        (filters.cost === "unavailable" &&
          !r.hasEstimate && r.costFlag === null && r.linkedIds.length === 0)),
  );
  if (sortKey === null) return result;
  const value = (r) =>
    sortKey === "estimate"
      ? (r.estimateHigh ?? r.estimateLow)
      : sortKey === "approved"
        ? r.linkedIds.length
          ? r.approved
          : null
        : r[sortKey];
  return result.sort((a, b) => {
    const x = value(a),
      y = value(b);
    if (x == null && y == null) return a.sourceIndex - b.sourceIndex;
    if (x == null) return 1;
    if (y == null) return -1;
    const order =
      typeof x === "number"
        ? x - y
        : String(x).localeCompare(String(y), undefined, { numeric: true });
    return order === 0
      ? a.sourceIndex - b.sourceIndex
      : order * (direction === "desc" ? -1 : 1);
  });
}
export function summarize(records) {
  const statuses = records.filter((r) => r.status),
    response = records
      .map((r) => r.responseDays)
      .filter((v) => v !== null && v >= 0);
  const terminal = (r) =>
    /^(closed|resolved|void\/withdrawn|withdrawn|cancelled|canceled)$/i.test(
      r.status || "",
    );
  return {
    total: records.length,
    statusCoverage: statuses.length,
    open: statuses.length ? statuses.filter((r) => !terminal(r)).length : null,
    closed: statuses.length
      ? statuses.filter((r) => /^(closed|resolved)$/i.test(r.status)).length
      : null,
    withdrawn: statuses.filter((r) =>
      /^(void\/withdrawn|withdrawn|cancelled|canceled)$/i.test(r.status),
    ).length,
    cost: records.filter((r) => r.hasCost).length,
    response: response.length
      ? response.reduce((a, b) => a + b, 0) / response.length
      : null,
    responseN: response.length,
  };
}
export async function loadData(base = "./data/", fetcher = fetch) {
  const issues = [],
    tables = {};
  await Promise.all(
    DATA_FILES.map(async (name) => {
      try {
        const response = await fetcher(`${base}${name}.csv`, {cache: "no-cache"});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        tables[name] = parseCSV(await response.text());
      } catch (error) {
        if (name === "rfis")
          throw new Error(
            `Could not load rfis.csv: ${error.message}. Serve the site over HTTP and check the data folder.`,
          );
        issues.push(
          `${name}.csv unavailable (${error.message}). Related detail may be incomplete.`,
        );
        tables[name] = [];
      }
    }),
  );
  const model = buildModel(tables);
  model.warnings.push(...issues);
  return model;
}

// Data checks never mutate or impute the supplied values.
export function validateValues(tables, warnings = []) {
  const isMissing = (v) => v == null || /^(?:|n\/?a|null|unknown|not recorded)$/i.test(String(v).trim());
  const dateFields = /(?:_date|_window_start|_window_end)$/;
  const numericFields = /(?:_usd|_days|_pct_of_base|_count|_0_100|_rank)$|^(?:required_response_days|response_days_initial|response_days_final|days_overdue_initial|revision_cycles|num_reviewers|attachments|allocation_share|days_notice_to_pricing|days_pricing_to_close|days_notice_to_close|pct_)/;
  const flagFields = /^(?:contractor_claims_.*|on_critical_path_at_submittal|response_on_time|led_to_change_order)$/;
  for (const [table, rows] of Object.entries(tables)) {
    if (table === "data_dictionary") continue;
    for (const [i, row] of rows.entries()) {
      for (const [key, value] of Object.entries(row)) {
        if (isMissing(value)) continue;
        const invalid = dateFields.test(key) ? date(value) === null
          : numericFields.test(key) ? number(value) === null
          : flagFields.test(key) ? flag(value) === null : false;
        if (invalid) warnings.push(`Invalid ${key} in ${table} row ${i + 2}; shown as unavailable.`);
      }
      if (table === "rfis") {
        const low = number(row.contractor_est_cost_low_usd), high = number(row.contractor_est_cost_high_usd);
        if (low !== null && high !== null && low > high)
          warnings.push(`Reversed estimate range for ${row.rfi_id}; source values retained.`);
        if (date(row.response_date) && date(row.submitted_date) && row.response_date < row.submitted_date)
          warnings.push(`Response precedes submission for ${row.rfi_id}.`);
        if (date(row.closed_date) && date(row.response_date) && row.closed_date < row.response_date)
          warnings.push(`Closure precedes response for ${row.rfi_id}.`);
      }
    }
  }
  return warnings;
}
const RANKING_TOP_K = 25;

export function compareCostRanking(records, filters = {}, topK = RANKING_TOP_K) {
  const gold = queryRecords(records, { cost: "estimate" }, "estimate", "desc");
  const organized = queryRecords(records, filters, "estimate", "desc");
  const viewIndex = new Map(organized.map((r, i) => [r.id, i]));
  const estimateOrder = organized.filter((r) => r.hasEstimate);
  const rows = gold.map((record, i) => {
    const viewRank = viewIndex.has(record.id) ? viewIndex.get(record.id) + 1 : null;
    const costRank = i + 1;
    return {
      record,
      costRank,
      viewRank,
      status: viewRank == null ? "missing" : viewRank === costRank ? "same" : "shifted",
    };
  });
  const covered = rows.filter((row) => row.viewRank !== null).length;
  const sameRankCount = rows.filter((row) => row.status === "same").length;
  const top = gold.slice(0, Math.min(Math.max(0, topK), gold.length));
  const extraWithoutEstimate = organized.length - estimateOrder.length;
  return {
    goldCount: gold.length,
    viewCount: organized.length,
    viewEstimateCount: estimateOrder.length,
    covered,
    sameRankCount,
    missingCount: gold.length - covered,
    extraWithoutEstimate,
    identical:
      gold.length === estimateOrder.length &&
      gold.every((record, i) => record.id === estimateOrder[i]?.id),
    identicalLists:
      gold.length === organized.length &&
      gold.every((record, i) => record.id === organized[i]?.id),
    topK: top.length,
    topCovered: top.filter((record) => viewIndex.has(record.id)).length,
    rows,
  };
}

export function packageCounts(records, filters = {}) {
  const counts = new Map();
  for (const record of records) counts.set(record.package || "__missing", 0);
  // No sort is needed to aggregate a distribution.
  for (const record of queryRecords(records, {...filters, package: ""}, null)) {
    const key = record.package || "__missing";
    counts.set(key, counts.get(key) + 1);
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

export function calendarDays(start, end) {
  return date(start) && date(end) ? (Date.parse(end) - Date.parse(start)) / 86400000 : null;
}
export function reconcileSource(records, tables) {
  const durations = {};
  for (const [key, recorded, calendar] of [["initial", "initialResponseDays", "initialCalendarDays"], ["final", "responseDays", "finalCalendarDays"]]) {
    durations[key] = records.filter(r => r[recorded] !== null && r[calendar] !== null && r[recorded] !== r[calendar]).map(r => r.id);
  }
  const allocations = [];
  for (const co of tables.change_order_outcomes || []) {
    const edges = (tables.rfi_change_order_link || []).filter(e => e.co_id === co.co_id);
    if (!edges.length) continue;
    for (const [field, totalField] of [["allocated_approved_cost_usd", "final_approved_cost_usd"], ["allocated_requested_cost_usd", "requested_cost_usd"]]) {
      const values = edges.map(e => number(e[field]));
      const total = number(co[totalField]);
      if (total === null || values.some(v => v === null)) continue;
      const sum = values.reduce((a,b) => a+b, 0);
      if (Math.abs(sum-total) > 0.005) allocations.push({coId: co.co_id, field, total, allocated: sum, difference: sum-total});
    }
  }
  return {durations, allocations};
}
