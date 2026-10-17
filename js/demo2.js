import { teamTokenStorage } from "./demo2-auth.js";
import { parseCSV } from "./rfi-data.js";
import {
  projectDataset,
  validateRecords,
  parseUpload,
  seededSelection,
  sortAssessments,
  disposition,
  workingAssessment,
  baseline,
  parseAnswerKey,
  score,
  csv,
  fingerprint,
  MAX_BYTES,
} from "./demo2-core.js?v=20261017-batch-range";
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const state = {
  dataset: [],
  selected: [],
  source: "dataset",
  mode: "demo",
  limit: 40,
  busy: false,
  config: null,
  runs: [],
  study: null,
  key: null,
  results: [],
  resultRun: null,
  reviews: {},
};
let detailOpener;
let detailId;
const notice = (message, error = false) => {
  $("notice").textContent = message;
  $("notice").classList.toggle("error", error);
};
function endpoint() {
  const raw = $("endpoint").value.trim();
  if (!raw) return location.origin;
  const url = new URL(raw);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname)
      ))
  )
    throw new Error(
      "Use an HTTPS backend origin, or localhost for development. Do not include credentials or query parameters.",
    );
  if (url.pathname !== "/")
    throw new Error(
      "Enter only the backend origin; the app adds /api/config and /api/assess.",
    );
  return url.origin;
}
let tokenOrigin;
function tokenStore() {
  return teamTokenStorage(() => window.localStorage, endpoint());
}
function restoreToken() {
  $("access-token").value = "";
  try {
    tokenOrigin = endpoint();
    const saved = tokenStore().load();
    $("remember-token").checked = saved.remember;
    $("access-token").value = saved.token;
    $("token-storage-status").textContent = !saved.available
      ? "Browser storage is unavailable. Enter the token for this tab."
      : saved.token ? "Saved token filled automatically for this backend."
      : "Enter your team token once to remember it on this browser.";
  } catch {
    tokenOrigin = null;
    $("token-storage-status").textContent = "Enter a valid backend URL before saving a token.";
  }
}
function saveToken() {
  try {
    if (endpoint() !== tokenOrigin) restoreToken();
    const remember = $("remember-token").checked;
    const ok = tokenStore().save($("access-token").value, remember);
    $("token-storage-status").textContent = !ok
      ? "Could not save in this browser. The token works only in this tab."
      : remember && $("access-token").value.trim()
        ? "Token remembered on this browser for this backend."
        : remember ? "Enter your team token once to remember it on this browser."
        : "Token will not be remembered after this tab closes.";
  } catch { /* Invalid endpoints cannot receive or store a credential. */ }
  controls();
}
async function connect() {
  if (state.busy || state.study) return;
  state.config = null;
  controls();
  $("connection-state").textContent =
    "Connecting to AI backend… A sleeping demo service may take about a minute to start.";
  try {
    const res = await fetch(endpoint() + "/api/config", {
      signal: AbortSignal.timeout(75000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Backend unavailable (HTTP ${res.status}).`);
    const c = await res.json();
    if (
      !c.metadata?.config_hash ||
      !c.metadata?.rubric_hash ||
      c.metadata.rubric_version !== "v0.3"
    )
      throw new Error("Backend contract/rubric mismatch.");
    state.config = c;
    const publicAccess = c.access?.token_required === false;
    for (const id of ["token-field", "token-preferences", "token-storage-status", "token-handling"])
      $(id).hidden = publicAccess;
    $("public-access-status").hidden = !publicAccess;
    $("connection-state").textContent = c.configured
      ? `${c.metadata.provider} · ${c.metadata.model} · rubric v0.3 · ${publicAccess ? "public demo ready · no token needed" : "ready for authorized requests"}`
      : c.setup;
    if (c.metadata.execution_mode === "test_fixture")
      notice(
        "DEVELOPMENT TEST FIXTURE · No real model call. Outputs are transport fixtures, not measured AI results.",
      );
  } catch (err) {
    $("connection-state").textContent =
      `AI unavailable: ${err.message} Run npm start locally or configure an HTTPS backend. No simulated results.`;
  }
  controls();
}
function controls() {
  const locked = state.busy || !!state.study;
  for (const id of [
    "selector-search",
    "random-seed",
    "random-select",
    "clear-selection",
    "upload",
    "paste-input",
    "paste-format",
    "import-text",
    "source-dataset",
    "source-upload",
    "endpoint",
    "access-token",
    "remember-token",
    "forget-token",
    "connect",
    "mode-demo",
    "mode-eval",
  ])
    $(id).disabled = locked;
  document
    .querySelectorAll("[data-select]")
    .forEach(
      (el) =>
        (el.disabled = locked || (state.selected.length >= 10 && !el.checked)),
    );
  document
    .querySelectorAll("[data-remove]")
    .forEach((el) => (el.disabled = locked));
  const ready =
    state.selected.length >= 2 && state.selected.length <= 10 &&
    $("consent").checked &&
    !!state.config?.configured &&
    (state.config?.access?.token_required === false || !!$("access-token").value.trim()) &&
    !state.busy;
  $("analyze").disabled = !ready || state.mode !== "demo";
  $("analyze").innerHTML = `Analyze ${state.selected.length} RFIs <span aria-hidden="true">↗</span>`;
  $("freeze").disabled = !ready || state.selected.length !== 10 || !!state.study;
  $("consent").disabled = locked;
  $("eval-run1").disabled =
    !state.study || state.runs.length !== 0 || state.busy;
  $("eval-run2").disabled =
    !state.study || state.runs.length !== 1 || state.busy;
  $("eval-baseline").disabled =
    !state.study || state.runs.length !== 2 || state.busy;
  $("answer-key").disabled =
    state.runs.length !== 3 || state.busy || !!state.key;
  $("key-text").disabled = $("answer-key").disabled;
  $("import-key-text").disabled = $("answer-key").disabled;
  $("export-study").disabled = !state.study || state.busy;
  $("export-scores").disabled = !state.key;
  $("new-study").hidden = !state.study;
  $("new-study").disabled = state.busy;
  $("demo-actions").hidden = state.mode === "eval";
  $("freeze-fields").hidden = !!state.study;
  $("frozen-summary").hidden = !state.study;
}
function renderCandidates() {
  const q = $("selector-search").value.toLowerCase().trim();
  const list = state.dataset.filter((r) =>
    [r.rfi_id, r.title, r.description].join(" ").toLowerCase().includes(q),
  );
  const selected = new Set(state.selected.map((r) => r.rfi_id));
  $("candidate-list").innerHTML =
    list
      .slice(0, state.limit)
      .map(
        (r) =>
          `<label><input type="checkbox" data-select="${esc(r.rfi_id)}" ${selected.has(r.rfi_id) ? "checked" : ""}><span><strong>${esc(r.rfi_id)}</strong>${esc(r.title)}</span></label>`,
      )
      .join("") || '<p class="empty-note">No matching RFIs.</p>';
  $("candidate-count").textContent =
    `Showing ${Math.min(state.limit, list.length)} of ${list.length} matching synthetic records.`;
  $("more-candidates").hidden = state.limit >= list.length;
  controls();
}
function selectionChanged() {
  state.results = [];
  state.resultRun = null;
  $("results").hidden = true;
  $("consent").checked = false;
  $("selected-count").textContent = `${state.selected.length} selected · minimum 2, maximum 10${state.mode === "eval" ? " · evaluation requires exactly 10" : ""}`;
  $("selected-list").innerHTML = state.selected
    .map(
      (r) =>
        `<li><button data-remove="${esc(r.rfi_id)}" aria-label="Remove ${esc(r.rfi_id)}">×</button><strong>${esc(r.rfi_id)}</strong><small>${esc(r.title)}</small></li>`,
    )
    .join("");
  $("selection-empty").hidden = state.selected.length > 0;
  $("payload-preview").textContent = JSON.stringify(state.selected, null, 2);
  $("source-description").textContent =
    state.source === "dataset"
      ? "Synthetic development dataset · retrospective outcomes excluded"
      : "Uploaded submission packet · provenance supplied by user";
  renderCandidates();
  controls();
}
function source(path) {
  if (state.study || state.busy) return;
  state.source = path;
  state.selected = [];
  $("source-dataset").setAttribute("aria-pressed", String(path === "dataset"));
  $("source-upload").setAttribute("aria-pressed", String(path === "upload"));
  $("dataset-input").hidden = path !== "dataset";
  $("upload-input").hidden = path !== "upload";
  selectionChanged();
}
async function readUpload(file) {
  if (!file) throw new Error("Choose a file.");
  if (file.size > MAX_BYTES)
    throw new Error("File exceeds 256 KB. No records were imported.");
  return new TextDecoder("utf-8", { fatal: true }).decode(
    await file.arrayBuffer(),
  );
}
$("source-dataset").onclick = () => source("dataset");
$("source-upload").onclick = () => source("upload");
$("selector-search").oninput = () => {
  state.limit = 40;
  renderCandidates();
};
$("more-candidates").onclick = () => {
  state.limit += 40;
  renderCandidates();
};
$("candidate-list").onchange = (e) => {
  if (!e.target.matches("[data-select]") || state.busy || state.study) return;
  const id = e.target.dataset.select;
  if (e.target.checked && state.selected.length < 10)
    state.selected.push(state.dataset.find((r) => r.rfi_id === id));
  else state.selected = state.selected.filter((r) => r.rfi_id !== id);
  selectionChanged();
  [...document.querySelectorAll("[data-select]")]
    .find((el) => el.dataset.select === id)
    ?.focus();
};
$("selected-list").onclick = (e) => {
  const b = e.target.closest("[data-remove]");
  if (b && !state.busy && !state.study) {
    state.selected = state.selected.filter(
      (r) => r.rfi_id !== b.dataset.remove,
    );
    selectionChanged();
    $("clear-selection").focus();
  }
};
$("random-select").onclick = () => {
  try {
    state.selected = seededSelection(state.dataset, $("random-seed").value);
    selectionChanged();
    notice(
      `Ten synthetic records selected with seed “${$("random-seed").value}”. Development only; review the exact payload.`,
    );
  } catch (e) {
    notice(e.message, true);
  }
};
$("clear-selection").onclick = () => {
  state.selected = [];
  selectionChanged();
};
$("upload").onchange = async () => {
  try {
    const file = $("upload").files[0];
    const records = parseUpload(await readUpload(file), file.name);
    state.selected = records;
    selectionChanged();
    notice(
      `Imported ${records.length} submission packets. Review the payload and provenance before sending.`,
    );
  } catch (e) {
    state.selected = [];
    selectionChanged();
    notice(`Upload rejected: ${e.message}`, true);
  } finally {
    $("upload").value = "";
  }
};
$("import-text").onclick = () => {
  try {
    state.selected = parseUpload(
      $("paste-input").value,
      `pasted.${$("paste-format").value}`,
    );
    selectionChanged();
    notice(
      `Imported ${state.selected.length} pasted submission packets. Review the exact payload before sending.`,
    );
  } catch (e) {
    state.selected = [];
    selectionChanged();
    notice(`Import rejected: ${e.message}`, true);
  }
};
$("connect").onclick = connect;
$("endpoint").oninput = () => {
  restoreToken();
  state.config = null;
  $("connection-state").textContent =
    "Backend URL changed. Check connection before sending data.";
  controls();
};
$("access-token").oninput = saveToken;
$("remember-token").onchange = saveToken;
$("forget-token").onclick = () => {
  $("access-token").value = "";
  $("remember-token").checked = false;
  let cleared = false;
  try { cleared = tokenStore().forget(); } catch { /* Invalid endpoint. */ }
  $("token-storage-status").textContent = cleared
    ? "Saved token cleared. Enter it again when needed."
    : "Token cleared from this tab. Browser storage could not be updated.";
  controls();
};
$("consent").onchange = controls;
$("mode-demo").onclick = () => setMode("demo");
$("mode-eval").onclick = () => setMode("eval");
function setMode(mode) {
  if (state.busy || state.study) return;
  state.mode = mode;
  $("mode-demo").setAttribute("aria-pressed", String(mode === "demo"));
  $("mode-eval").setAttribute("aria-pressed", String(mode === "eval"));
  $("evaluation").hidden = mode !== "eval";
  $("selected-count").textContent = `${state.selected.length} selected · minimum 2, maximum 10${mode === "eval" ? " · evaluation requires exactly 10" : ""}`;
  controls();
}
async function analyze(slot = null) {
  if (state.busy) return;
  let records;
  try {
    records = validateRecords(
      state.study ? state.study.records : state.selected,
      { exactlyTen: !!state.study },
    );
    if (!state.config?.configured)
      throw new Error("Backend is not configured.");
    if (!$("consent").checked)
      throw new Error("Review and confirm the exact payload first.");
  } catch (e) {
    notice(e.message, true);
    return;
  }
  state.busy = true;
  controls();
  $("run-progress").hidden = false;
  $("progress").value = 0;
  $("progress").max = records.length;
  $("progress-text").textContent = `Validating ${records.length} submission packets…`;
  state.results = [];
  state.resultRun = null;
  const started = new Date().toISOString();
  let run = {
    run_id: crypto.randomUUID(),
    started_at: started,
    metadata: state.config.metadata,
    kind: slot === null ? "development" : `ai-${slot + 1}`,
    results: [],
    received_count: 0,
  };
  const received = new Set();
  let finished = false;
  try {
    const config = await fetch(endpoint() + "/api/config", {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }).then((r) => r.json());
    if (config.metadata?.config_hash !== state.config.metadata.config_hash)
      throw new Error(
        "Backend model/prompt changed. Refresh connection or start a new study.",
      );
    $("progress-text").textContent =
      state.config.metadata.execution_mode === "test_fixture"
        ? "Development transport fixture · no AI request."
        : "Securely requesting AI evidence extraction. Waiting for actual responses…";
    const response = await fetch(endpoint() + "/api/assess", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.access?.token_required === false ? {} : {
          Authorization: `Bearer ${$("access-token").value.trim()}`,
        }),
      },
      body: JSON.stringify({
        records,
        config_hash: state.config.metadata.config_hash,
      }),
      signal: AbortSignal.timeout(600000),
    });
    if (!response.ok) {
      let msg = `Backend error (HTTP ${response.status}).`;
      try {
        msg = (await response.json()).error || msg;
      } catch {}
      throw new Error(msg);
    }
    if (!response.headers.get("Content-Type")?.includes("application/x-ndjson"))
      throw new Error("Unexpected backend response; no assessments accepted.");
    const reader = response.body.getReader(),
      decoder = new TextDecoder();
    let buffer = "";
    const consume = (line) => {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.event === "started") {
        if (event.metadata?.config_hash !== state.config.metadata.config_hash)
          throw new Error(
            "Response configuration differs from the frozen setup.",
          );
        run = { ...run, ...event, kind: run.kind, results: [] };
      } else if (event.event === "item") {
        if (
          !records.some((r) => r.rfi_id === event.result.rfi_id) ||
          received.has(event.result.rfi_id)
        )
          throw new Error("Duplicate or unexpected result ID.");
        const r = event.result;
        if (
          ![
            "assigned",
            "needs_information",
            "excluded",
            "processing_error",
          ].includes(r.assessment_state) ||
          (r.assessment_state === "assigned"
            ? !["P0", "P1", "P2"].includes(r.priority)
            : r.priority !== null)
        )
          throw new Error("Invalid result state/priority contract.");
        received.add(r.rfi_id);
        run.results.push(r);
        run.received_count = received.size;
        state.results = run.results.slice();
        state.resultRun = run;
        $("progress").value = received.size;
        $("progress-text").textContent =
          `Received ${received.size} / ${records.length} assessments (including explicit failures).`;
        renderResults();
      } else if (event.event === "completed") {
        if (received.size !== records.length) throw new Error("Incomplete response set.");
        finished = true;
        run.completed_at = event.completed_at;
      } else if (event.event === "error") throw new Error(event.error);
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 2 * 1024 * 1024)
        throw new Error("Backend response exceeded safe size.");
      let pos;
      while ((pos = buffer.indexOf("\n")) >= 0) {
        consume(buffer.slice(0, pos));
        buffer = buffer.slice(pos + 1);
      }
    }
    if (buffer.trim()) consume(buffer);
    if (!finished) throw new Error("Connection ended before completion.");
    const failures = run.results.filter(
      (r) => r.assessment_state === "processing_error",
    ).length;
    notice(
      failures
        ? run.kind === "development"
          ? `Completed with ${failures} AI check failures. Input-rule working priorities and the original errors are shown together.`
          : `Completed with ${failures} processing failures. These remain failures in the v0.3 evaluation. Export before retrying.`
        : `Completed ${records.length} assessments. Review evidence and confirm every recommendation with the GC.`,
      !!failures,
    );
  } catch (e) {
    run.transport_error = e.message;
    notice(
      `Analysis incomplete: ${e.message} Selected inputs are preserved.`,
      true,
    );
    for (const r of records)
      if (!received.has(r.rfi_id))
        run.results.push({
          rfi_id: r.rfi_id,
          assessment_state: "processing_error",
          priority: null,
          error: `No validated assessment received: ${e.message}`,
        });
  } finally {
    run.completed_at ||= new Date().toISOString();
    run.records = structuredClone(records);
    state.results = run.results;
    state.resultRun = run;
    if (slot !== null) {
      state.runs.push(run);
      renderEvaluation();
    }
    state.busy = false;
    $("progress-text").textContent = finished
      ? "Processing complete. Review the results below."
      : "Request stopped. Missing outputs are labeled processing errors.";
    controls();
    renderResults();
  }
}
$("analyze").onclick = () => analyze();
function displayedResults() {
  if (state.resultRun?.kind !== "development") return state.results;
  const records = state.resultRun.records || state.selected;
  return state.results.map((r) =>
    workingAssessment(r, records.find((x) => x.rfi_id === r.rfi_id) || {}),
  );
}
function renderResults() {
  $("results").hidden = !state.resultRun;
  if (!state.resultRun) return;
  const counts = {
    P0: 0,
    P1: 0,
    P2: 0,
    "Needs Information": 0,
    Excluded: 0,
    "Processing error": 0,
  };
  const working = state.resultRun.kind === "development";
  const visibleResults = displayedResults();
  visibleResults.forEach((r) => {
    if (r.priority) counts[r.priority]++;
    else if (r.assessment_state === "excluded") counts.Excluded++;
    if (
      working
        ? r.needs_information_flag
        : r.assessment_state === "needs_information"
    )
      counts["Needs Information"]++;
    if (
      working ? r.ai_review_failed : r.assessment_state === "processing_error"
    )
      counts["Processing error"]++;
  });
  $("result-cards").innerHTML = Object.entries(counts)
    .map(
      ([k, v]) =>
        `<article><span>${esc(working && k === "Needs Information" ? "Needs information · flag" : working && k === "Processing error" ? "AI check failed · flag" : k)}</span><strong>${v}</strong></article>`,
    )
    .join("");
  $("run-caption").textContent =
    `${state.resultRun.metadata?.execution_mode === "test_fixture" ? "DEVELOPMENT TEST FIXTURE · NO AI MODEL CALL · " : ""}${state.resultRun.kind} · ${state.resultRun.run_id} · ${state.resultRun.kind === "baseline" ? "Non-AI baseline" : `${state.resultRun.received_count ?? state.results.length} / ${(state.resultRun.records || state.selected).length} server outputs received`} · ${state.results.length} items accounted for · rubric v0.3. ${working ? "Working triage v0.4: incomplete cases receive provisional P0/P1/P2. Information and AI-error flags overlap priority counts; v0.3 checks remain available in details." : "v0.3 evaluation: Needs Information, exclusions and failures are unranked."}`;
  const query = $("result-search").value.trim().toLowerCase(),
    filter = $("result-filter").value;
  const records =
      state.resultRun.records || state.study?.records || state.selected,
    byId = new Map(records.map((r) => [r.rfi_id, r]));
  const list = sortAssessments(visibleResults, records).filter((r) =>
    [r.rfi_id, byId.get(r.rfi_id)?.title]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
  if ($("result-sort").value === "id") {
    const tier = (r) =>
      r.priority === "P0"
        ? 0
        : r.priority === "P1"
          ? 1
          : r.priority === "P2"
            ? 2
            : 3;
    list.sort((a, b) => tier(a) - tier(b) || a.rfi_id.localeCompare(b.rfi_id));
    $("order-note").textContent =
      "Inspection view: ID order inside each tier, not the rubric’s within-tier review order. Select Rubric to restore supported deadline ordering.";
  } else
    $("order-note").textContent =
      "P0 → P1 → P2; supported decision date, submission time and ID within each tier. Unassigned queues have no rank.";
  const strictGroups = [
    ["ranked", "Ranked review queue", (r) => !!r.priority],
    [
      "needs_information",
      "Needs Information · unranked",
      (r) => r.assessment_state === "needs_information",
    ],
    [
      "excluded",
      "Excluded · outside active review",
      (r) => r.assessment_state === "excluded",
    ],
    [
      "processing_error",
      "Processing errors · no valid assessment",
      (r) => r.assessment_state === "processing_error",
    ],
  ];
  const groups = !working
    ? strictGroups
    : filter === "needs_information"
      ? [
          [
            "needs_information",
            "Needs information · working priority retained",
            (r) => r.needs_information_flag,
          ],
        ]
      : filter === "processing_error"
        ? [
            [
              "processing_error",
              "AI check failed · input-rule working priorities",
              (r) => r.ai_review_failed,
            ],
          ]
        : strictGroups.filter(([key]) => ["ranked", "excluded"].includes(key));
  $("result-filter").querySelector('[value="needs_information"]').textContent =
    working ? "Needs information · flagged" : "Needs Information · unranked";
  $("result-filter").querySelector('[value="processing_error"]').textContent =
    working ? "AI check failed · flagged" : "Processing errors";
  if (working)
    $("order-note").textContent =
      "P0 → P1 → P2 working review order. Provisional ≠ confirmed. Missing-information and AI-error flags remain visible on the same row.";
  $("result-tables").innerHTML = groups
    .filter(([key]) => filter === "all" || filter === key)
    .map(([key, title, predicate]) => {
      const rows = list.filter(predicate);
      return `<h3 class="queue-heading">${title} (${rows.length})</h3>${rows.length ? `<div class="agent-table-wrap" role="region" tabindex="0" aria-label="${title}"><table class="agent-table"><thead><tr><th scope="col">RFI / issue</th><th scope="col">Assigned priority</th><th scope="col">Evidence / reason</th><th scope="col">Potential cost mechanism</th><th scope="col">Status / details</th></tr></thead><tbody>${rows.map((r) => `<tr data-detail="${esc(r.rfi_id)}"><td><strong>${esc(r.rfi_id)}</strong><br>${esc(byId.get(r.rfi_id)?.title)}</td><td><span class="priority-badge ${r.priority || ""}">${esc(disposition(r))}</span>${r.provisional ? '<p class="working-label">Provisional · human review</p>' : ""}${r.needs_information_flag && working ? "<p>Needs information</p>" : ""}${r.ai_review_failed ? '<p class="error-label">AI check failed · input rules</p>' : ""}${r.mitigation_unverified ? "<p>Mitigation unverified</p>" : ""}${r.safety_escalation ? "<p>Safety · human review</p>" : ""}${r.expedited_verification ? "<p>Expedited verification</p>" : ""}</td><td>${esc(r.priority_reason || r.error)}${r.rule_branch ? `<small> ${esc(r.rule_branch)}</small>` : ""}</td><td>${esc(r.potential_cost_mechanism || "No assessed mechanism available")}</td><td>${r.provisional ? "Provisional · verify missing facts" : r.assessment_state === "assigned" ? "Evidence assessed" : esc(disposition(r))}<br><button data-detail="${esc(r.rfi_id)}">View details<span class="sr-only"> ${esc(r.rfi_id)}</span></button></td></tr>`).join("")}</tbody></table></div>` : '<p class="quiet">No items in this queue.</p>'}`;
    })
    .join("");
}
$("result-search").oninput = renderResults;
$("result-filter").onchange = renderResults;
$("result-sort").onchange = renderResults;
$("result-tables").onclick = (e) => {
  const b = e.target.closest("[data-detail]");
  if (b) {
    detailOpener = b.matches("button") ? b : b.querySelector("button");
    openDetail(b.dataset.detail);
  }
};
function openDetail(id) {
  detailId = id;
  const result = displayedResults().find((r) => r.rfi_id === id),
    record = (
      state.resultRun.records ||
      state.study?.records ||
      state.selected
    ).find((r) => r.rfi_id === id);
  $("agent-detail-title").textContent = id;
  const citation = (e) =>
    e?.quote
      ? `<blockquote>“${esc(e.quote)}”<small>Source: ${esc(e.source)} · supplied statement, not independently verified</small></blockquote>`
      : '<p class="quiet">No supporting excerpt supplied.</p>';
  $("agent-detail-body").innerHTML =
    `<section><h3>${esc(record.title)}</h3><p>${esc(record.description)}</p><details><summary>Full submitted packet</summary><pre>${esc(JSON.stringify(record, null, 2))}</pre></details></section><section><h3>Priority</h3><span class="priority-badge ${result.priority || ""}">${esc(disposition(result))}</span>${result.provisional ? `<p class="agent-detail-flag">Provisional working priority · ${esc(result.working_policy)}. ${result.ai_review_failed ? "AI check failed: this suggestion comes only from submission rules." : "Incomplete evidence: human confirmation required."}</p><p>v0.3 evidence decision: ${esc(result.validated_assessment_state)}. ${esc(result.validated_priority_reason || result.validation_error || "")}</p>` : ""}<p>${esc(result.priority_reason || result.error)}</p><p class="quiet">${esc(result.rule_branch || "No rule applied")} · rubric v0.3</p>${result.mitigation_unverified ? '<p class="agent-detail-flag">Protection is unknown. This P0 is precautionary review, not proof of ineffective mitigation or large loss.</p>' : ""}${result.safety_escalation ? '<p class="agent-detail-flag">Separate safety escalation: request immediate human review under site procedures.</p>' : ""}</section>
 ${
   result.mechanisms
     ?.map(
       (m, i) =>
         `<section><h3>Evidence · mechanism ${i + 1}</h3><p>${esc(m.description)}</p>${Object.entries(
           m.evidence,
         )
           .map(
             ([k, e]) =>
               `<div class="evidence-item"><strong>${k} · ${esc(e.value)}</strong>${citation(e)}</div>`,
           )
           .join(
             "",
           )}<div class="evidence-item"><strong>Bounded clarification · ${esc(m.bounded_clarification.value)}</strong>${citation(m.bounded_clarification)}</div>${m.contradictions.map((c) => `<p class="agent-detail-flag">${esc(c.explanation)}</p>${c.evidence.map(citation).join("")}`).join("")}</section>`,
     )
     .join("") || ""
 }
 <section><h3>Potential Impact</h3><p>${esc(result.potential_cost_mechanism || "Not assessed. No dollar estimate has been generated.")}</p><p>Decision date: ${esc(result.decision_date || "Not established")}</p>${result.decision_date ? citation(result.decision_date_evidence) : ""}${(result.schedule_considerations || []).map(citation).join("")}${result.safety_escalation ? citation(result.safety_evidence) : ""}</section><section><h3>Missing Information</h3>${result.missing_information?.length ? `<ul>${result.missing_information.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : "<p>No follow-up questions returned. This is not a guarantee of completeness.</p>"}</section><section><h3>GC Review</h3><p>${esc(result.suggested_gc_review_action || "No valid assessment. Check the processing error before retrying.")}</p><p>Supplied reviewer: ${esc(record.assigned_reviewer || "Not recorded; GC to verify routing.")}</p>${result.expedited_verification ? citation(result.expedited_evidence) : ""}</section><details><summary>Run and raw output</summary><pre>${esc(JSON.stringify({ metadata: state.resultRun.metadata, raw_output: result.raw_output, provider_response_id: result.provider_response_id }, null, 2))}</pre></details>`;
  if (state.study && state.runs.includes(state.resultRun)) {
    const review = state.reviews[state.resultRun.run_id]?.[id] || {};
    $("agent-detail-body").insertAdjacentHTML(
      "beforeend",
      `<section data-observer-case="${esc(id)}"><h3>Evaluation observer review</h3><p class="quiet">Human observations only; never sent to the model. A correct tier can still cross a role boundary.</p><label>Primary failure group<select id="observer-group"><option value="none">No failure identified</option>${["Unsupported evidence / hallucination", "Wrong tier / missing facts", "Misrouting / premature action", "Parser / transport"].map((g) => `<option ${review.group === g ? "selected" : ""}>${g}</option>`).join("")}</select></label><label class="confirm-label"><input id="observer-boundary" type="checkbox" ${review.boundary ? "checked" : ""}>Crossed a GC role boundary (count separately)</label><label>Review notes<textarea id="observer-notes" maxlength="2000" rows="3">${esc(review.notes || "")}</textarea></label><label class="confirm-label"><input id="observer-reviewed" type="checkbox" ${review.reviewed ? "checked" : ""}>I reviewed this case for evidence and role-boundary errors.</label></section>`,
    );
  }
  $("agent-detail").showModal();
  $("close-agent-detail").focus();
}
$("close-agent-detail").onclick = () => $("agent-detail").close();
$("agent-detail").onclose = () => {
  const target = detailOpener?.isConnected
    ? detailOpener
    : [...document.querySelectorAll("button[data-detail]")].find(
        (b) => b.dataset.detail === detailId,
      );
  (target || $("results-title")).focus();
};
$("agent-detail-body").addEventListener("input", (e) => {
  const section = e.target.closest("[data-observer-case]");
  if (!section || !state.study) return;
  const runId = state.resultRun.run_id;
  state.reviews[runId] ||= {};
  state.reviews[runId][section.dataset.observerCase] = {
    group: $("observer-group").value,
    boundary: $("observer-boundary").checked,
    notes: $("observer-notes").value,
    reviewed: $("observer-reviewed").checked,
  };
  renderEvaluation();
});
function reviewStats(run) {
  const reviews = Object.values(state.reviews[run.run_id] || {}).filter(
    (r) => r.reviewed,
  );
  return {
    reviewed_cases: reviews.length,
    boundary_violations_observed: reviews.filter((r) => r.boundary).length,
    boundary_review_complete: reviews.length === 10,
  };
}
function download(name, value, type = "application/json") {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportRows(run) {
  const metadata = run.metadata?.config_hash
    ? run.metadata
    : state.study?.metadata;
  return run.results.map((result) => ({
    run_id: run.run_id,
    run_kind: run.kind,
    execution_mode:
      run.kind === "baseline" ? "non_ai_baseline" : metadata?.execution_mode,
    study_execution_mode: metadata?.execution_mode,
    track: state.study?.track || "development",
    input_hash: run.input_hash || state.study?.input_hash || "",
    config_hash: metadata?.config_hash || "",
    observer_review: state.reviews[run.run_id]?.[result.rfi_id] || null,
    ...result,
    ...(run.kind === "development"
      ? (() => {
          const view = workingAssessment(
            result,
            (run.records || state.selected).find(
              (r) => r.rfi_id === result.rfi_id,
            ) || {},
          );
          return {
            working_priority: view.priority,
            provisional: view.provisional,
            working_policy: view.working_policy || "v0.3_confirmed",
            working_basis: view.working_basis || "validated_evidence",
            working_reason: view.priority_reason,
            working_missing_information: view.missing_information || [],
            needs_information_flag: view.needs_information_flag,
            ai_review_failed: view.ai_review_failed,
          };
        })()
      : {}),
  }));
}
$("export-results").onclick = () =>
  download(
    `demo2-${state.resultRun.run_id}.csv`,
    csv(exportRows(state.resultRun)),
    "text/csv",
  );
$("freeze").onclick = async () => {
  try {
    const title = $("study-title").value.trim(),
      provenance = $("study-provenance").value.trim(),
      threshold = Number($("study-threshold").value),
      track = $("study-track").value;
    if (
      !title ||
      !provenance ||
      !$("study-threshold").value ||
      !Number.isInteger(threshold) ||
      threshold < 0 ||
      threshold > 10
    )
      throw new Error(
        "Supply study title, provenance/permission and a success target from 0 to 10.",
      );
    if (!$("study-reviewed").checked)
      throw new Error(
        "Confirm independent reference preparation (or development-only readiness).",
      );
    if (
      state.config.metadata.execution_mode === "test_fixture" &&
      track !== "synthetic_development"
    )
      throw new Error(
        "The explicit transport-fixture server supports development checks only, never formal evaluation.",
      );
    if (track === "real" && state.source === "dataset")
      throw new Error(
        "The built-in dataset is synthetic. Upload permitted, documented packets for this track.",
      );
    const records = validateRecords(state.selected, { exactlyTen: true });
    state.study = {
      title,
      provenance,
      threshold,
      track,
      dispositions: ["P0", "P1", "P2", "Needs Information", "Excluded"],
      excluded_policy:
        "Screen out before freeze; later exclusions stay in the ten-case denominator and can match a prepared Excluded reference. Disclose selection issues.",
      frozen_at: new Date().toISOString(),
      records: structuredClone(records),
      metadata: structuredClone(state.config.metadata),
      input_hash: await fingerprint(records),
      baseline_version: "keyword-1",
      seed: state.source === "dataset" ? $("random-seed").value : null,
    };
    $("frozen-summary").textContent =
      `Frozen ${state.study.frozen_at} · ${track} · input SHA-256 ${state.study.input_hash} · target ${threshold}/10. Input, configuration and threshold stay locked. Starting a new study clears tab memory; export first.`;
    notice(
      track === "synthetic_development"
        ? "Frozen development set. These are not formal real-item evaluation results."
        : "Frozen user-declared provenance. The app does not certify source authenticity.",
    );
    controls();
  } catch (e) {
    notice(e.message, true);
  }
};
$("eval-run1").onclick = () => analyze(0);
$("eval-run2").onclick = () => analyze(1);
$("eval-baseline").onclick = () => {
  if (state.runs.length !== 2 || state.busy) return;
  state.runs.push({
    kind: "baseline",
    run_id: crypto.randomUUID(),
    completed_at: new Date().toISOString(),
    metadata: { baseline_version: "keyword-1" },
    records: structuredClone(state.study.records),
    results: baseline(state.study.records),
  });
  renderEvaluation();
  controls();
};
$("new-study").onclick = () => $("reset-study").showModal();
$("cancel-reset").onclick = () => $("reset-study").close();
$("confirm-reset").onclick = () => {
  state.study = null;
  state.runs = [];
  state.key = null;
  state.reviews = {};
  state.results = [];
  state.resultRun = null;
  $("key-text").value = "";
  $("answer-key").value = "";
  $("evaluation-results").innerHTML = "";
  $("consent").checked = false;
  $("results").hidden = true;
  $("reset-study").close();
  controls();
  notice(
    "New study. Reconfirm the payload and freeze a fresh protocol before running.",
  );
  $("study-title").focus();
};
function renderEvaluation() {
  $("evaluation-results").innerHTML =
    `${state.study.metadata.execution_mode === "test_fixture" ? '<p class="source-warning"><strong>DEVELOPMENT TRANSPORT FIXTURES ONLY</strong> · Scores below test the interface, not an AI model.</p>' : ""}<div class="eval-scores">${state.runs
      .map((run, i) => {
        const s = state.key ? score(run.results, state.key) : null;
        return `<article><h3>${i < 2 ? `AI run ${i + 1}` : "Keyword baseline"}</h3><strong>${s ? `${s.matches} / ${s.total}` : "Not scored"}</strong><p>${run.results.length} outputs · ${run.results.filter((r) => r.assessment_state === "processing_error").length} failures</p>${s ? `<p>${s.matches >= state.study.threshold ? "Meets" : "Below"} target · P0 recall ${s.highRecall.denominator ? `${s.highRecall.numerator}/${s.highRecall.denominator}` : "N/A"} · coverage ${s.coverage}/10</p>` : ""}<p>Role-boundary review: ${reviewStats(run).reviewed_cases}/10 reviewed; ${reviewStats(run).boundary_violations_observed} observed${reviewStats(run).boundary_review_complete ? "" : " · incomplete"}.</p><button data-run-view="${i}">Inspect this run</button><button data-run-export="${i}">Export CSV</button></article>`;
      })
      .join(
        "",
      )}</div>${state.runs.length === 2 || state.runs.length === 3 ? `<p>AI disposition agreement: ${state.runs[0].results.filter((r) => disposition(r) === disposition(state.runs[1].results.find((b) => b.rfi_id === r.rfi_id))).length}/10. Shared processing failures are not evidence of reliability.</p>` : ""}`;
}
$("evaluation-results").onclick = (e) => {
  if (e.target.dataset.runView !== undefined) {
    const run = state.runs[Number(e.target.dataset.runView)];
    state.resultRun = run;
    state.results = run.results;
    renderResults();
    $("results-title").focus();
  }
  if (e.target.dataset.runExport !== undefined) {
    const run = state.runs[Number(e.target.dataset.runExport)];
    download(`${run.kind}-results.csv`, csv(exportRows(run)), "text/csv");
  }
};
$("answer-key").onchange = async () => {
  try {
    const file = $("answer-key").files[0];
    state.key = parseAnswerKey(
      await readUpload(file),
      file.name,
      state.study.records,
    );
    renderEvaluation();
    controls();
    notice(
      "Human reference imported locally after all runs. It was not sent to the model. Scores reflect your supplied adjudication.",
    );
  } catch (e) {
    notice(`Answer key rejected: ${e.message}`, true);
    $("answer-key").value = "";
  }
};
$("import-key-text").onclick = () => {
  try {
    const text = $("key-text").value;
    if (new TextEncoder().encode(text).length > MAX_BYTES)
      throw new Error("Reference exceeds 256 KB.");
    state.key = parseAnswerKey(text, "reference.json", state.study.records);
    renderEvaluation();
    controls();
    notice(
      "Prepared human reference imported locally after all runs. No reference data was sent to the model.",
    );
  } catch (e) {
    notice(`Answer key rejected: ${e.message}`, true);
  }
};
$("export-study").onclick = () =>
  download(
    "demo2-study.json",
    JSON.stringify(
      {
        study: state.study,
        runs: state.runs,
        reference: state.key,
        observer_reviews: state.reviews,
        scores: state.key
          ? state.runs.map((r) => ({
              kind: r.kind,
              ...score(r.results, state.key),
            }))
          : null,
      },
      null,
      2,
    ),
  );
$("export-scores").onclick = () =>
  download(
    "demo2-scores.csv",
    csv(
      state.runs.map((r) => ({
        kind: r.kind,
        track: state.study.track,
        execution_mode: state.study.metadata.execution_mode,
        input_hash: state.study.input_hash,
        config_hash: state.study.metadata.config_hash,
        ...reviewStats(r),
        ...score(r.results, state.key),
      })),
    ),
    "text/csv",
  );
window.addEventListener("beforeunload", (e) => {
  if (state.study || state.busy) {
    e.preventDefault();
    e.returnValue = "";
  }
});
async function init() {
  try {
    const res = await fetch("data/demo2-config.json", { cache: "no-store" });
    if (res.ok) {
      const config = await res.json();
      if (typeof config.backend_origin === "string") {
        $("endpoint").value = config.backend_origin;
        endpoint(); // Validate public configuration before any request/token use.
      }
    }
  } catch {
    $("endpoint").value = "";
    notice(
      "Default backend configuration is unavailable. Enter the team backend in Connection settings.",
      true,
    );
  }
  if (
    !$("endpoint").value &&
    ["127.0.0.1", "localhost"].includes(location.hostname) &&
    location.port !== "4922"
  )
    $("endpoint").value = "http://127.0.0.1:4922";
  restoreToken();
  try {
    const res = await fetch("data/rfis.csv", { cache: "no-cache" });
    if (!res.ok) throw new Error(`Dataset HTTP ${res.status}`);
    state.dataset = projectDataset(parseCSV(await res.text()));
    selectionChanged();
    notice(
      `Ready · ${state.dataset.length.toLocaleString()} synthetic development records. Select 2–10 RFIs or upload submission packets.`,
    );
  } catch (e) {
    notice(
      `Dataset unavailable: ${e.message}. Upload CSV or JSON instead.`,
      true,
    );
  }
  await connect();
}
init();
