import {
  loadData,
  queryRecords,
  summarize,
  FILTER_FIELDS,
  MISSING,
  number,
} from "./rfi-data.js";
const $ = (id) => document.getElementById(id);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const display = (value) =>
  value == null || value === "" ? MISSING : escape(value);
const integer = (value) =>
  value === null ? "Unavailable" : value.toLocaleString("en-US");
const money = (value) =>
  value === null
    ? MISSING
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
const days = (value) =>
  value === null
    ? MISSING
    : `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} days`;
const dateText = (value) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value + "T00:00:00Z"))
    : MISSING;
const flagText = (value) => (value === null ? MISSING : value ? "Yes" : "No");
const labels = {
  status: "Status",
  category: "Content category",
  trade: "Trade / discipline",
  responsible: "Responsible party / reviewer",
  package: "Contract package",
  cost: "Cost evidence",
};
const costOptions = {
  flag: "Cost impact claimed at submission",
  estimate: "Recorded estimate (later)",
  linked: "Linked change order (later)",
  missing: "No flag, estimate or linked CO",
};
const state = {
  model: null,
  filters: { search: "" },
  sort: "submitted",
  direction: "desc",
  page: 1,
  size: 25,
  mode: "structured",
};
let opener = null,
  running = null,
  tick = null,
  trials = [],
  storageAvailable = true;
const storageKey = "info492-demo1-trials-v1";
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
  trials = Array.isArray(stored)
    ? stored.filter(
        (r) =>
          r &&
          typeof r.elapsedSeconds === "number" &&
          typeof r.task === "string",
      )
    : [];
} catch {
  storageAvailable = false;
}
function estimate(r) {
  if (!r.hasEstimate) return MISSING;
  if (r.estimateLow !== null && r.estimateHigh !== null)
    return `${money(r.estimateLow)} – ${money(r.estimateHigh)}`;
  return `${r.estimateLow === null ? "Upper bound" : "Lower bound"}: ${money(r.estimateLow ?? r.estimateHigh)}`;
}
function badge(value, kind = "") {
  return `<span class="badge ${escape(kind)}">${display(value)}</span>`;
}
function statusBadge(r) {
  return badge(
    r.status,
    /^(closed|resolved)$/i.test(r.status || "") ? "closed" : "",
  );
}
function priorityBadge(r) {
  return badge(
    r.priority,
    /^(urgent|expedite)$/i.test(r.priority || "")
      ? r.priority.toLowerCase()
      : "",
  );
}
function metric(label, value, note) {
  return `<article class="summary-card"><span class="metric-name">${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}
function renderMetrics() {
  const s = summarize(state.model.records);
  $("metrics").innerHTML =
    metric(
      "Total RFIs",
      integer(s.total),
      `${state.model.options.package.length} contract packages · full dataset`,
    ) +
    metric(
      "Open / unresolved",
      integer(s.open),
      s.statusCoverage
        ? `${s.statusCoverage} records have status · terminal snapshot`
        : "Status field not recorded",
    ) +
    metric(
      "Closed / resolved",
      integer(s.closed),
      `${s.withdrawn} additional records void / withdrawn`,
    ) +
    metric(
      "RFIs with cost evidence",
      integer(s.cost),
      "Cost claim, recorded estimate or linked CO",
    ) +
    metric(
      "Avg. final response",
      s.response === null
        ? "Unavailable"
        : `${s.response.toFixed(1)}<span style="font-size:14px;letter-spacing:0"> d</span>`,
      `Retrospective · ${s.responseN} valid durations`,
    );
}
function createFilters() {
  $("filters").innerHTML =
    FILTER_FIELDS.map((k) => {
      const opts = state.model.options[k],
        missing = state.model.records.some((r) => !r[k]);
      return `<label class="filter-label">${labels[k]}<select data-filter="${k}" ${opts.length ? "" : "disabled"} aria-label="${labels[k]}"><option value="">${opts.length ? "All " + (k === "responsible" ? "reviewers" : k === "package" ? "packages" : k === "trade" ? "disciplines" : k === "category" ? "categories" : "statuses") : "Unavailable in source"}</option>${opts.map((v) => `<option value="${escape(v)}">${escape(v)}</option>`).join("")}${missing && opts.length ? '<option value="__missing">Not recorded</option>' : ""}</select>${!opts.length ? "<small>No values supplied; no assignments generated.</small>" : ""}</label>`;
    }).join("") +
    `<label class="filter-label">${labels.cost}<select data-filter="cost" aria-label="Cost evidence"><option value="">All cost information</option>${Object.entries(
      costOptions,
    )
      .map(([k, v]) => `<option value="${k}">${v}</option>`)
      .join("")}</select></label>`;
  $("filters").addEventListener("change", (e) => {
    if (e.target.dataset.filter) {
      state.filters[e.target.dataset.filter] = e.target.value;
      state.page = 1;
      render();
    }
  });
}
function renderChips() {
  $("chips").innerHTML = Object.entries(state.filters)
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<button class="chip" data-remove="${k}" aria-label="Remove ${escape(k)} filter">${escape(k === "search" ? "Search" : labels[k])}: ${escape(k === "cost" ? costOptions[v] : v === "__missing" ? MISSING : v)} <span aria-hidden="true">×</span></button>`,
    )
    .join("");
}
function renderChart() {
  const context = queryRecords(state.model.records, {
    ...state.filters,
    package: "",
  });
  const counts = new Map(state.model.options.package.map((p) => [p, 0]));
  context.forEach((r) => {
    if (r.package) counts.set(r.package, (counts.get(r.package) || 0) + 1);
  });
  const max = Math.max(...counts.values(), 1);
  $("package-chart").innerHTML = [...counts]
    .map(
      ([p, n]) =>
        `<button class="package-bar" data-package="${escape(p)}" aria-label="Filter package ${escape(p)}, ${n} RFIs" aria-pressed="${state.filters.package === p}"><span>${escape(p)}<strong>${integer(n)}</strong></span><i class="bar-track"><i style="width:${(n / max) * 100}%"></i></i></button>`,
    )
    .join("");
  $("chart-caption").textContent = "Counts after other filters";
}
function render() {
  if (!state.model) return;
  const structured = state.mode === "structured";
  const records = structured
    ? queryRecords(
        state.model.records,
        state.filters,
        state.sort,
        state.direction,
      )
    : state.model.records;
  const pages = Math.max(1, Math.ceil(records.length / state.size));
  state.page = Math.min(state.page, pages);
  const begin = (state.page - 1) * state.size,
    visible = records.slice(begin, begin + state.size);
  $("result-count").textContent =
    `${integer(records.length)} ${structured ? "matching" : "source"} RFIs · ${integer(state.model.records.length)} total`;
  $("page-label").textContent = records.length
    ? `${begin + 1}–${begin + visible.length} of ${integer(records.length)} · Page ${state.page} / ${pages}`
    : "0 records";
  $("previous").disabled = state.page <= 1;
  $("next").disabled = state.page >= pages;
  $("table-wrap").hidden = !structured || !records.length;
  $("plain-list").hidden = structured;
  $("search-sort").hidden = !structured;
  $("chips").hidden = !structured;
  $("baseline-note").hidden = structured;
  document.querySelector(".filter-panel").hidden = !structured;
  document.querySelector(".distribution").hidden = !structured;
  $("metrics").hidden = !structured;
  document.querySelector(".workspace-layout").style.gridTemplateColumns =
    structured ? "" : "minmax(0,1fr)";
  $("empty").hidden = records.length > 0;
  $("structured").setAttribute("aria-pressed", String(structured));
  $("baseline").setAttribute("aria-pressed", String(!structured));
  if (structured) {
    $("rows").innerHTML = visible
      .map(
        (r) =>
          `<tr data-rfi="${escape(r.id)}"><td><button class="record-link" data-rfi="${escape(r.id)}" aria-label="Open ${escape(r.id)}"><span>${escape(r.id)}</span><strong>${escape(r.title)}</strong></button><span class="cell-sub">${display(r.package)} · ${display(r.location)}</span></td><td>${display(r.category)}<span class="cell-sub">${display(r.trade)}</span></td><td>${statusBadge(r)}</td><td>${display(r.responsible)}</td><td>${dateText(r.submitted)}</td><td>${priorityBadge(r)}</td><td><span class="${r.costFlag ? "cost-yes" : "cost-no"}">${r.costFlag === null ? "Flag not recorded" : r.costFlag ? "Cost impact claimed" : "No cost impact claimed"}</span><span class="cell-sub">${r.hasEstimate ? `${escape(estimate(r))}<br>Estimate · recorded later` : "Estimate not recorded"}</span>${r.linkedIds.length ? `<span class="cell-sub">${r.linkedIds.length} linked CO${r.linkedIds.length > 1 ? "s" : ""} · later</span>` : ""}</td></tr>`,
      )
      .join("");
    document
      .querySelectorAll("th[data-sort]")
      .forEach((th) =>
        th.setAttribute(
          "aria-sort",
          th.dataset.sort === state.sort
            ? state.direction === "desc"
              ? "descending"
              : "ascending"
            : "none",
        ),
      );
    renderChips();
    renderChart();
  } else {
    $("plain-list").innerHTML = visible
      .map(
        (r) =>
          `<article><button data-rfi="${escape(r.id)}">Open ${escape(r.id)}</button><div>${escape(`${r.id} | ${r.title}\n${r.description || MISSING}\nCategory: ${r.category || MISSING}\nDiscipline: ${r.trade || MISSING}\nAssigned reviewer: ${r.responsible || MISSING}\nStatus: ${r.status || MISSING} | Package: ${r.package || MISSING}\nSubmitted: ${r.submitted || MISSING} | Contractor priority: ${r.priority || MISSING}\nCost claim at submission: ${flagText(r.costFlag)}\nRecorded estimate (later): ${estimate(r)}\nLinked COs (later): ${r.linkedIds.join(", ") || "None recorded"}\nAllocated approved CO cost (later): ${r.linkedIds.length ? money(r.approved) : "No linked CO recorded"}`)}</div></article>`,
      )
      .join("");
  }
}
function reset() {
  state.filters = { search: "" };
  state.page = 1;
  $("search").value = "";
  document.querySelectorAll("[data-filter]").forEach((el) => (el.value = ""));
  render();
}
function setMode(mode) {
  state.mode = mode;
  state.page = 1;
  render();
}
const entry = (label, value, timing = "") =>
  `<div><dt>${escape(label)}${timing ? `<span class="timing">${escape(timing)}</span>` : ""}</dt><dd>${value}</dd></div>`;
const grid = (entries) => `<dl class="detail-grid">${entries.join("")}</dl>`;
function showDetail(id, trigger) {
  const r = state.model.records.find((r) => r.id === id);
  if (!r) return;
  opener = trigger;
  $("detail-title").textContent = r.id;
  const entries = [
    entry("Content category", display(r.category), "At submission"),
    entry(
      "Trade / discipline",
      display(r.trade),
      "Timing not classified in dictionary",
    ),
    entry("Contract package", display(r.package), "At submission"),
    entry("Location", display(r.location), "At submission"),
    entry("Current recorded status", statusBadge(r), "Retrospective"),
    entry(
      "Contractor priority",
      priorityBadge(r),
      "Original submission flag · not AI",
    ),
  ];
  const retrospectiveKeys = new Set([
    "response_date",
    "response_days_initial",
    "response_on_time",
    "days_overdue_initial",
    "revision_cycles",
    "closed_date",
    "response_days_final",
    "status",
    "schedule_impact_days_claimed",
    "critical_path_delay_days_actual",
    "float_consumed_days_actual",
    "contractor_est_cost_low_usd",
    "contractor_est_cost_high_usd",
    "led_to_change_order",
    "linked_co_ids",
    "linked_requested_cost_usd",
    "linked_approved_cost_usd",
    "linked_time_granted_days",
  ]);
  const knownKeys = new Set([
    "rfi_id",
    "package_id",
    "content_category_code",
    "content_category",
    "location",
    "spec_section",
    "subject",
    "description",
    "submitted_date",
    "required_response_days",
    "contractor_priority_flag",
    "contractor_claims_cost_impact",
    "contractor_claims_schedule_impact",
    "on_critical_path_at_submittal",
    "attachments",
    "num_reviewers",
    "assigned_reviewer",
  ]);
  const truths = [
    "impact_score_0_100",
    "true_priority_rank",
    "true_priority_tier",
  ];
  const meta = Object.entries(r.raw)
    .filter(([k]) => !truths.includes(k))
    .map(
      ([k, v]) =>
        `<dt>${escape(k)}<span class="timing">${retrospectiveKeys.has(k) ? "Retrospective" : knownKeys.has(k) ? "At submission" : "Timing not classified in dictionary"}</span></dt><dd>${display(v)}</dd>`,
    )
    .join("");
  let cos = r.linkedCOs
    .map(
      (co) =>
        `<article class="co-card"><h4>${escape(co.id)}</h4>${grid([entry("Allocation share", co.share === null ? MISSING : `${(co.share * 100).toFixed(1)}%`), entry("Allocated approved amount", money(co.approved)), entry("Allocated requested amount", money(co.requested)), entry("Whole CO approved amount (shared)", money(number(co.outcome.final_approved_cost_usd))), entry("CO outcome", display(co.outcome.outcome || co.order.outcome)), entry("Outcome date", dateText(co.outcome.outcome_date?.match(/^\d{4}-\d{2}-\d{2}$/) ? co.outcome.outcome_date : null)), entry("Allocated time", days(co.time)), entry("Whole CO time granted (shared)", days(number(co.outcome.time_granted_days)))])}<p>The whole CO may involve multiple RFIs. Only the supplied RFI allocation is attributed to this request. Association alone does not establish causation.</p></article>`,
    )
    .join("");
  if (!cos)
    cos = `<p>${r.linkedIds.length ? `Source lists ${escape(r.linkedIds.join(", "))}, but allocation-level records are unavailable. Existing RFI-level allocated amounts are shown above.` : "No linked change order is recorded for this RFI."}</p>`;
  $("detail-content").innerHTML =
    `<section class="drawer-section"><p class="detail-subject">${escape(r.title)}</p><p>${display(r.description)}</p>${grid(entries)}</section>
  <section class="drawer-section"><h3>Responsibility &amp; routing</h3>${grid([entry("Submitting contractor", display(r.contractor)), entry("Submitted by", display(r.submittedBy)), entry("Responsible party / assigned reviewer", display(r.responsible), "At submission"), entry("Submitted", dateText(r.submitted)), entry("Response requirement", days(number(r.raw.required_response_days)), "At submission"), entry("Spec section", display(r.raw.spec_section), "At submission")])}</section>
  <section class="drawer-section"><h3>Cost information</h3><div class="cost-stage">The Data Dictionary marks estimates and CO amounts as unavailable at submission. These are recorded estimates and modeled outcomes, not predictions.</div>${grid([entry("Contractor claims cost impact", flagText(r.costFlag), "At submission"), entry("Contractor estimate range", escape(estimate(r)), "Recorded later · not approved cost"), entry("Allocated approved CO cost", r.linkedIds.length ? money(r.approved) : "No linked CO recorded", "Retrospective RFI-level allocation"), entry("Allocated requested CO cost", r.linkedIds.length ? money(r.requested) : "No linked CO recorded", "Retrospective RFI-level allocation")])}</section>
  <section class="drawer-section"><h3>Linked change orders <span class="timing">Retrospective modeled outcomes</span></h3>${cos}</section>
  <section class="drawer-section"><h3>Schedule &amp; response</h3>${grid([entry("Contractor claims schedule impact", flagText(flagRaw(r.raw.contractor_claims_schedule_impact)), "At submission"), entry("On critical path at submission", flagText(flagRaw(r.raw.on_critical_path_at_submittal)), "At submission"), entry("Claimed schedule impact", days(number(r.raw.schedule_impact_days_claimed)), "Recorded later"), entry("Modeled critical-path delay", days(number(r.raw.critical_path_delay_days_actual)), "Retrospective"), entry("Modeled float consumed", days(number(r.raw.float_consumed_days_actual)), "Retrospective"), entry("Initial response duration", days(r.initialResponseDays), "Retrospective"), entry("Final response duration", days(r.responseDays), "Retrospective"), entry("Response date", dateText(r.responseDate), "Retrospective"), entry("Closed date", dateText(r.closedDate), "Retrospective")])}</section>
  <section class="drawer-section"><h3>Contract context</h3>${grid([entry("Package name", display(r.contract.package_name)), entry("Delivery method", display(r.contract.delivery_method)), entry("Base value", money(number(r.contract.contract_base_usd))), entry("Value provenance", display(r.contract.source_status))])}<p>Contract facts and estimates follow the source workbook. Project-level anchors do not validate these synthetic RFI outcomes.</p></section>
  <details class="source-metadata"><summary>All source fields &amp; information timing</summary><dl>${meta}</dl></details>
  <details class="source-metadata"><summary>Outcome-derived ground truth (future evaluation only)</summary><p>These labels are built from modeled outcomes. Demo 1 does not use them to rank or score RFIs.</p><dl>${truths.map((k) => `<dt>${k}</dt><dd>${display(r.raw[k])}</dd>`).join("")}</dl></details>`;
  $("detail").showModal();
  $("detail").scrollTop = 0;
  $("close-detail").focus();
}
function flagRaw(v) {
  return /^(Y|Yes|true|1)$/i.test(v || "")
    ? true
    : /^(N|No|false|0)$/i.test(v || "")
      ? false
      : null;
}
$("close-detail").addEventListener("click", () => $("detail").close());
$("detail").addEventListener("close", () => {
  if (opener?.isConnected) opener.focus();
});
$("detail").addEventListener("click", (e) => {
  if (
    e.target === $("detail") &&
    e.clientX < $("detail").getBoundingClientRect().left
  )
    $("detail").close();
});
$("data-info").addEventListener("click", () => $("methodology").showModal());
$("close-info").addEventListener("click", () => $("methodology").close());
$("search").addEventListener("input", (e) => {
  state.filters.search = e.target.value;
  state.page = 1;
  render();
});
$("sort").addEventListener("change", (e) => {
  [state.sort, state.direction] = e.target.value.split(":");
  state.page = 1;
  render();
});
$("clear").addEventListener("click", reset);
$("empty-clear").addEventListener("click", reset);
$("chips").addEventListener("click", (e) => {
  const key = e.target.closest("[data-remove]")?.dataset.remove;
  if (!key) return;
  state.filters[key] = "";
  if (key === "search") $("search").value = "";
  else document.querySelector(`[data-filter="${key}"]`).value = "";
  state.page = 1;
  render();
});
$("package-chart").addEventListener("click", (e) => {
  const packageId = e.target.closest("[data-package]")?.dataset.package;
  if (!packageId) return;
  state.filters.package = state.filters.package === packageId ? "" : packageId;
  document.querySelector('[data-filter="package"]').value =
    state.filters.package;
  state.page = 1;
  render();
});
$("rows").addEventListener("click", (e) => {
  const row = e.target.closest("[data-rfi]");
  if (row)
    showDetail(
      row.dataset.rfi,
      e.target.closest("button") || row.querySelector("button"),
    );
});
$("plain-list").addEventListener("click", (e) => {
  const button = e.target.closest("[data-rfi]");
  if (button) showDetail(button.dataset.rfi, button);
});
$("table-wrap").addEventListener("click", (e) => {
  const th = e.target.closest("th[data-sort]");
  if (!th) return;
  state.direction =
    state.sort === th.dataset.sort && state.direction === "asc"
      ? "desc"
      : "asc";
  state.sort = th.dataset.sort;
  state.page = 1;
  const option = [...$("sort").options].find(
    (o) => o.value === `${state.sort}:${state.direction}`,
  );
  if (!option) {
    const custom = new Option(
      `${th.innerText} · ${state.direction === "asc" ? "ascending" : "descending"}`,
      `${state.sort}:${state.direction}`,
    );
    $("sort").append(custom);
  }
  $("sort").value = `${state.sort}:${state.direction}`;
  render();
});
$("page-size").addEventListener("change", (e) => {
  state.size = Number(e.target.value);
  state.page = 1;
  render();
});
$("previous").addEventListener("click", () => {
  state.page--;
  render();
  $("table-wrap").scrollTop = 0;
});
$("next").addEventListener("click", () => {
  state.page++;
  render();
  $("table-wrap").scrollTop = 0;
});
$("structured").addEventListener("click", () => {
  if (running && running.condition !== "structured") {
    $("test-message").textContent =
      "Finish or cancel the current trial before switching condition.";
    return;
  }
  setMode("structured");
});
$("baseline").addEventListener("click", () => {
  if (running && running.condition !== "baseline") {
    $("test-message").textContent =
      "Finish or cancel the current trial before switching condition.";
    return;
  }
  setMode("baseline");
});
function renderTrials() {
  $("trial-count").textContent = String(trials.length);
  $("export-tests").disabled = !trials.length;
  $("trials").innerHTML = trials.length
    ? trials
        .slice()
        .reverse()
        .map(
          (t) =>
            `<div class="trial"><p><strong>${escape(t.participant)} · ${escape(t.condition)}</strong> · ${t.elapsedSeconds.toFixed(1)} s · ${escape(t.accuracy)}<br>${escape(t.target)}<br>Answer: ${escape(t.answer || "Not recorded")}</p><button data-delete-trial="${escape(t.id)}" aria-label="Remove trial ${escape(t.participant)}">Remove</button></div>`,
        )
        .join("")
    : "No trials recorded yet.";
}
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(trials));
  } catch {
    storageAvailable = false;
  }
  renderTrials();
}
function lockStudy(active) {
  ["participant", "condition", "task", "target"].forEach(
    (id) => ($(id).disabled = active),
  );
  $("start-test").disabled = active;
  $("finish-test").disabled = !active;
  $("cancel-test").disabled = !active;
}
$("start-test").addEventListener("click", () => {
  if (!state.model) return;
  const participant = $("participant").value.trim(),
    target = $("target").value.trim();
  if (!participant || !target) {
    $("test-message").textContent =
      "Enter a participant code and an exact task / target before starting.";
    return;
  }
  reset();
  setMode($("condition").value);
  running = {
    participant,
    target,
    condition: $("condition").value,
    task: $("task").value,
    startedAt: new Date().toISOString(),
    started: performance.now(),
  };
  $("answer").value = "";
  $("accuracy").value = "not scored";
  $("timer").value = "00:00";
  lockStudy(true);
  tick = setInterval(() => {
    const seconds = Math.floor((performance.now() - running.started) / 1000);
    $("timer").value =
      `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, 250);
  $("test-message").textContent =
    "Timer running. Record the observed answer and accuracy, then finish.";
});
$("finish-test").addEventListener("click", () => {
  if (!running) return;
  const { started, ...record } = running;
  trials.push({
    ...record,
    id: crypto.randomUUID(),
    elapsedSeconds: (performance.now() - started) / 1000,
    answer: $("answer").value.trim(),
    accuracy: $("accuracy").value,
    dataset: "team-synthetic-20261012",
    datasetRecords: state.model.records.length,
  });
  clearInterval(tick);
  running = null;
  lockStudy(false);
  persist();
  $("test-message").textContent = storageAvailable
    ? "Trial saved on this device. Export the results for your demo note."
    : "Trial recorded in memory. Browser storage is unavailable; download results before closing.";
});
$("cancel-test").addEventListener("click", () => {
  clearInterval(tick);
  running = null;
  lockStudy(false);
  $("timer").value = "00:00";
  $("test-message").textContent = "Trial cancelled; no result recorded.";
});
$("trials").addEventListener("click", (e) => {
  const id = e.target.closest("[data-delete-trial]")?.dataset.deleteTrial;
  if (id) {
    trials = trials.filter((t) => t.id !== id);
    persist();
  }
});
const csvCell = (value) => {
  let s = String(value ?? "");
  if (/^[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
};
$("export-tests").addEventListener("click", () => {
  const keys = [
    "participant",
    "condition",
    "task",
    "target",
    "startedAt",
    "elapsedSeconds",
    "answer",
    "accuracy",
    "dataset",
    "datasetRecords",
  ];
  const content = [keys, ...trials.map((t) => keys.map((k) => t[k]))]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "demo1-retrieval-results.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
async function initialize() {
  try {
    state.model = await loadData();
    createFilters();
    renderMetrics();
    render();
    renderTrials();
    $("load-message").hidden = true;
    $("app").hidden = false;
    $("data-quality").innerHTML =
      `<h3>Loaded source tables</h3><ul>${Object.entries(
        state.model.tableCounts,
      )
        .map(
          ([k, n]) =>
            `<li>${escape(k)}: ${n.toLocaleString("en-US")} records</li>`,
        )
        .join(
          "",
        )}</ul><h3>Data checks</h3>${state.model.warnings.length ? "<ul>" + state.model.warnings.map((w) => `<li>${escape(w)}</li>`).join("") + "</ul>" : "<p>No duplicate identifiers, orphan RFI links or invalid allocation-share totals were found.</p>"}`;
    if (!storageAvailable)
      $("test-message").textContent =
        "Browser storage is unavailable. Download trial results before closing.";
  } catch (error) {
    $("load-message").className = "error-state";
    $("load-message").innerHTML =
      `<h2>Unable to load the RFI register</h2><p>${escape(error.message)}</p><button id="retry">Retry loading</button> <a href="docs/DATA.md" class="text-button">Data setup instructions</a>`;
    $("retry").addEventListener(
      "click",
      () => {
        $("load-message").textContent = "Loading RFI records…";
        initialize();
      },
      { once: true },
    );
  }
}
initialize();
