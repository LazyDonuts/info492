import { readFiles, fileUrl } from "./workspace-files.js";
import { allowedActions, dateIn, initialRecords, project, roles, statuses, visibleTo, reviseRecord } from "./workspace-data.js";

const sessionKey = "info492-role-session";
const recordsKey = "info492-role-workspace.records.v1";
const planKey = "info492-role-workspace.checker-plan.v1";
const byId = (id) => document.getElementById(id);
const content = byId("workspace-content");
const dialog = byId("workspace-dialog");
const notice = byId("workspace-notice");
const escape = (value = "") => String(value).replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
);
const open = (record) => record.status !== "answered" && record.status !== "draft";
const overdue = (record) => open(record) && record.due && record.due < dateIn(0);
const dueSoon = (record) => open(record) && record.due >= dateIn(0) && record.due <= dateIn(7);
const noDate = (record) => open(record) && !record.due;
const statusIs = (...values) => (record) => values.includes(record.status);

const filters = {
  submitter: [
    ["All my RFIs", () => true], ["Needs my action", statusIs("returned", "clarification")],
    ["Drafts", statusIs("draft")], ["Answered", statusIs("answered")],
  ],
  checker: [
    ["Awaiting check", statusIs("submitted")],
    ["All project RFIs", () => true],
  ],
  responder: [
    ["Needs response", statusIs("assigned")], ["Waiting for clarification", statusIs("clarification")],
    ["Awaiting sign-off", statusIs("responseReview")], ["All assignments", () => true],
  ],
  manager: [
    ["Our company is responsible", (record) => record.responsibleCompany === roles.manager.company],
    ["Created by our company", (record) => record.originCompany === roles.manager.company],
  ],
  reader: [
    ["All project RFIs", () => true], ["Official responses", statusIs("answered")],
    ["Open RFIs", open],
  ],
};

const actionLabels = {
  revise: "Revise & Resubmit", edit: "Edit RFI", submit: "Submit for Check", approve: "Approve & Route",
  return: "Return for Revision", release: "Confirm & Issue Response",
  returnResponse: "Return Response Draft", draftResponse: "Save Response Draft",
  sendResponse: "Prepare for Sign-off", clarify: "Request Clarification",
  date: "Set Due Date", create: "Save Draft",
};

let role;
let records;
let tab = 0;
let query = "";
let timing = "all";
let fileUrls = [];
let sort = "due";
let selected = "";
let mode = "";
let openedRecord = "";
let saving = false;
let plan = [];

function start() {
  role = JSON.parse(sessionStorage.getItem(sessionKey) || "null")?.role;
  if (!Object.hasOwn(roles, role)) {
    window.location.replace("signin.html");
    return;
  }
  records = JSON.parse(localStorage.getItem(recordsKey) || "null") ?? initialRecords();
  if (role === "checker") {
    const savedPlan = JSON.parse(localStorage.getItem(planKey) || "null");
    if (savedPlan?.date === dateIn(0)) plan = savedPlan.ids;
  }
  localStorage.setItem(recordsKey, JSON.stringify(records));
  const persona = roles[role];
  byId("identity").textContent = `${persona.name} · ${persona.label}`;
  byId("account").hidden = false;
  byId("sign-out").addEventListener("click", () => {
    sessionStorage.removeItem(sessionKey);
    window.location.assign("index.html");
  });
  document.title = `${persona.title} · INFO 492`;
  render();
}

function render() {
  const persona = roles[role];
  const scoped = records.filter((record) => visibleTo(record, role));
  const metrics = {
    submitter: [["Needs my action", statusIs("returned", "clarification")], ["Drafts", statusIs("draft")], ["Answered", statusIs("answered")]],
    checker: [["Awaiting check", statusIs("submitted")], ["Routed", statusIs("assigned", "clarification", "responseReview")], ["Past due", overdue]],
    responder: [["Needs response", statusIs("assigned")], ["Due soon", dueSoon], ["Past due", overdue]],
    manager: [["Missing due date", noDate], ["Due this week", dueSoon], ["Past due", overdue]],
    reader: [["Project RFIs", () => true], ["Official responses", statusIs("answered")], ["Open RFIs", open]],
  };
  const companyScope = role === "manager" ? scoped.filter(filters.manager[0][1]) : scoped;
  content.innerHTML = `
    <div class="workspace-context"><span>${escape(project)} / RFI workspace</span><span class="workspace-tag">Demo workspace</span></div>
    <section class="workspace-heading" aria-labelledby="role-title">
      <div><p class="overline">${escape(persona.company)} · ${escape(persona.label)}</p>
      <h1 id="role-title" tabindex="-1">${escape(persona.title)}</h1><p>${escape(persona.description)}</p></div>
      ${role === "submitter" ? '<button class="workspace-primary" data-new>+ New RFI</button>' : ""}
    </section>
    <div class="workspace-metrics">${metrics[role].map(([label, match]) => `
      <div><strong>${companyScope.filter(match).length}</strong><span>${label}</span></div>`).join("")}</div>
    ${role === "checker" ? dailyReview(scoped) : ""}
    <section class="workspace-panel" aria-label="RFI records">
      <div class="workspace-toolbar" aria-label="Record views">${filters[role].map(([label], index) =>
        `<button type="button" data-tab="${index}" aria-pressed="${tab === index}">${label}</button>`).join("")}</div>
      <div class="workspace-filters">
        <label>Find an RFI<input type="search" id="find-rfi" placeholder="Search ID, title, location or drawing" value="${escape(query)}"></label>
        ${role === "checker" ? `<label>Sort by<select id="sort-rfi">
          <option value="due" ${sort === "due" ? "selected" : ""}>By due date</option>
          <option value="recommended" ${sort === "recommended" ? "selected" : ""}>Recommended</option>
        </select></label>` : ""}
        <label>Timing<select id="timing-rfi">
          <option value="all" ${timing === "all" ? "selected" : ""}>All dates</option>
          <option value="overdue" ${timing === "overdue" ? "selected" : ""}>Past due</option>
          <option value="soon" ${timing === "soon" ? "selected" : ""}>Due this week</option>
          <option value="missing" ${timing === "missing" ? "selected" : ""}>Missing confirmed date</option>
        </select></label>
      </div>
      <div id="rfi-list"></div>
    </section>
    <p class="workspace-footnote">Fictional project records · Changes follow the demo roles in this browser.</p>`;
  renderList();
}

const priorityOrder = { High: 0, Medium: 1, Low: 2 };
const byDate = (a, b) => (a.due || "9999").localeCompare(b.due || "9999") || a.id.localeCompare(b.id);
const byRecommendation = (a, b) =>
  (priorityOrder[a.recommendation?.priority] ?? 3) - (priorityOrder[b.recommendation?.priority] ?? 3) || byDate(a, b);
const awaitsCheck = statusIs("submitted");

function dailyReview(scoped) {
  const pending = scoped.filter(awaitsCheck);
  const suggested = pending.filter(({ id }) => !plan.includes(id)).sort(byRecommendation).slice(0, 5);
  const planned = plan.map((id) => pending.find((record) => record.id === id)).filter(Boolean);
  const completed = scoped.filter((record) => record.history.some(({ actor, date, text }) =>
    actor === roles.checker.name && date === dateIn(0) &&
    ["approve", "return"].some((action) => text.startsWith(actionLabels[action])),
  ));
  const item = (record) => `<button class="workspace-record" data-record="${record.id}">
    <small>${record.id} · ${escape(record.recommendation?.priority || statuses[record.status])}</small>
    <strong>${escape(record.title)}</strong></button>`;
  return `<section class="workspace-daily" aria-labelledby="daily-title">
    <div class="workspace-daily-heading"><div><h2 id="daily-title" tabindex="-1">Today’s RFI Review</h2><p>Plan your submission checks and routing decisions. Sample priorities; review unassessed and overdue RFIs before confirming your plan.</p></div>
      <button type="button" data-plan="generate" ${!pending.length ? "disabled" : ""}>${planned.length ? "Fill Remaining Slots" : "Generate Today’s Plan"}</button></div>
    <div class="workspace-lanes">
      <div><h3>Suggested for Today</h3>${suggested.map((record) => `<div class="workspace-task">
        ${item(record)}<button type="button" data-plan="add" data-id="${record.id}" aria-label="Add ${record.id} to plan">+</button></div>`).join("") || "<p>No additional suggestions.</p>"}</div>
      <div><h3>My Review Plan</h3>${planned.map((record, index) => `<div class="workspace-task">
        ${item(record)}<button type="button" data-plan="up" data-id="${record.id}" aria-label="Move ${record.id} up" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" data-plan="down" data-id="${record.id}" aria-label="Move ${record.id} down" ${index === planned.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" data-plan="remove" data-id="${record.id}" aria-label="Remove ${record.id} from plan">×</button></div>`).join("") || "<p>Add items or generate a plan.</p>"}</div>
      <div><h3>Reviewed Today</h3>${completed.map(item).join("") || "<p>No checks recorded today.</p>"}</div>
    </div></section>`;
}

function updatePlan(button) {
  const pending = records.filter(awaitsCheck);
  const id = button.dataset.id;
  let next = plan.filter((key) => pending.some((record) => record.id === key));
  switch (button.dataset.plan) {
    case "generate": {
      const additions = pending.filter((record) => !next.includes(record.id)).sort(byRecommendation);
      next.push(...additions.slice(0, Math.max(0, 5 - next.length)).map((record) => record.id));
      break;
    }
    case "add": if (pending.some((record) => record.id === id) && !next.includes(id)) next.push(id); break;
    case "remove": next = next.filter((key) => key !== id); break;
    case "up":
    case "down": {
      const index = next.indexOf(id);
      const target = index + (button.dataset.plan === "up" ? -1 : 1);
      if (index >= 0 && target >= 0 && target < next.length) {
        [next[target], next[index]] = [next[index], next[target]];
      }
      break;
    }
  }
  try {
    localStorage.setItem(planKey, JSON.stringify({ date: dateIn(0), ids: next }));
    plan = next;
    render();
    byId("daily-title").focus();
  } catch {
    notice.textContent = "The plan could not be saved. Check browser storage.";
    notice.hidden = false;
  }
}

function renderList() {
  const matches = records.filter((record) =>
    visibleTo(record, role) && filters[role][tab][1](record) &&
    ({ all: () => true, overdue, soon: dueSoon, missing: noDate })[timing](record) &&
    [record.id, record.title, record.location, record.reference].join(" ").toLowerCase().includes(query.trim().toLowerCase()),
  );
  matches.sort(role === "checker" && sort === "recommended" ? byRecommendation : byDate);
  const list = byId("rfi-list");
  if (!matches.length) {
    list.innerHTML = '<p class="workspace-empty">No RFIs match this view.</p>';
    return;
  }
  const recommendationColumn = role === "checker";
  list.innerHTML = `
    <p class="workspace-result-count" aria-live="polite">${matches.length} ${matches.length === 1 ? "record" : "records"}${recommendationColumn && sort === "recommended" ? " · Ranked by sample priority, then confirmed due date" : ""}</p>
    <div class="workspace-table-scroll" tabindex="0" aria-label="Scrollable RFI table">
    <table class="workspace-table">
      <thead><tr><th scope="col">RFI / Subject</th><th scope="col">Status</th><th scope="col">Confirmed due</th>
      <th scope="col">Next owner</th>${recommendationColumn ? '<th scope="col">Recommendation</th>' : ""}</tr></thead>
      <tbody>${matches.map((record) => `<tr>
        <td><button type="button" class="workspace-record" data-record="${record.id}">
          <small>${record.id} · ${escape(record.location)}</small><strong>${escape(record.title)}</strong></button></td>
        <td><span class="workspace-badge" data-status="${record.status}">${statuses[record.status]}</span></td>
        <td>${overdue(record) ? '<span class="workspace-overdue">Past due</span> ' : ""}${escape(record.due || "—")}</td>
        <td>${escape(nextOwner(record))}</td>
        ${recommendationColumn ? `<td>${record.recommendation ? `<span class="workspace-badge" data-priority="${escape(record.recommendation.priority)}">${escape(record.recommendation.priority)}</span>` : "—"}</td>` : ""}
      </tr>`).join("")}</tbody>
    </table></div>`;
}

function nextOwner(record) {
  switch (record.status) {
    case "submitted": return roles.checker.name;
    case "responseReview":
    case "assigned": return record.assignee;
    case "answered": return "—";
    default: return record.originator;
  }
}

function field(label, name, value = "", { type = "text", required = false, multiline = false } = {}) {
  const attrs = `name="${name}" ${required ? "required" : ""}`;
  return `<label>${label}${multiline
    ? `<textarea ${attrs} rows="4" maxlength="2500">${escape(value)}</textarea>`
    : `<input ${attrs} type="${type}" value="${escape(value)}" ${type === "text" ? 'maxlength="220"' : ""}>`}</label>`;
}

function attachments(files = []) {
  return files.map((file) => {
    const url = fileUrl(file);
    if (!url) return "";
    fileUrls.push(url);
    return `<a class="workspace-file" href="${url}" download="${escape(file.name)}">↓ ${escape(file.name)}</a>`;
  }).join("");
}

function details(record) {
  const publicResponse = record.status === "answered";
  const responseDraft = role === "responder" && record.response && !publicResponse;
  const fact = (label, value) => `<div><dt>${label}</dt><dd>${escape(value || "—")}</dd></div>`;
  return `
    <p><span class="workspace-badge" data-status="${record.status}">${statuses[record.status]}</span></p>
    ${role === "reader" || publicResponse ? `<section class="workspace-detail-section official-response">
      <h3>Official Response</h3><p>${publicResponse ? escape(record.response) : "No official response issued."}</p>
      ${publicResponse ? `<p class="workspace-secondary">Issued ${escape(record.responseDate)} · Reference ${escape(record.reference)}</p>` : ""}</section>` : ""}
    <dl class="workspace-facts">
      ${fact("Location", record.location)}${fact("Drawing / specification", record.reference)}
      ${fact("Requested by date", record.requestedBy)}${fact("Confirmed due date", record.due)}
      ${fact("Submitted by", `${record.originator} · ${record.originCompany}`)}
      ${fact("Responsible company", record.responsibleCompany)}${fact("Technical responder", record.assignee)}
      ${fact("Next owner", nextOwner(record))}
    </dl>
    <section class="workspace-detail-section"><h3>Original Question</h3><p>${escape(record.question)}</p>
      ${record.attachments.length ? `<p class="workspace-secondary">Attachment references · ${record.attachments.map(escape).join(", ")}</p>` : ""}</section>
    ${record.files?.length ? `<section class="workspace-detail-section"><h3>Supporting Files</h3><p>Download to open the original attachment.</p>${attachments(record.files)}</section>` : ""}
    ${record.signoff && publicResponse ? `<p class="workspace-secondary">Reviewed by ${escape(record.signoff.reviewer)} · ${escape(record.signoff.reference)} · Issued by ${escape(record.signoff.issuedBy)}</p>` : ""}
    ${record.reason ? `<section class="workspace-detail-section"><h3>Latest Feedback</h3><p>${escape(record.reason)}</p></section>` : ""}
    ${role === "checker" && record.status === "submitted" ? `
      <section class="workspace-detail-section"><h3>Submission Check</h3>
      <p>${record.reference ? "Drawing reference provided." : "Drawing or specification reference is missing."} Confirm the question and references before routing.</p></section>` : ""}
    ${role === "checker" && record.recommendation ? `
      <section class="workspace-detail-section"><h3>Sample Recommendation · ${escape(record.recommendation.priority)}</h3>
      <p>${escape(record.recommendation.reason)}</p><blockquote>${escape(record.recommendation.evidence)}</blockquote></section>` : ""}
    ${responseDraft ? `<section class="workspace-detail-section"><h3>Response Draft</h3><p>${escape(record.response)}</p></section>` : ""}
    ${record.revisions?.length ? `<details class="workspace-detail-section"><summary>Previous revisions (${record.revisions.length})</summary>
      ${record.revisions.slice().reverse().map((revision) => `<section><h3>${escape(revision.title)}</h3>
      <p class="workspace-secondary">${escape(revision.date)} · ${escape(revision.actor)} · ${escape(revision.reference)}</p>
      <p>${escape(revision.question)}</p>
      ${revision.response ? `<h3>Previous response</h3><p>${escape(revision.response)}</p>` : ""}
      ${attachments(revision.files)}
      </section>`).join("")}</details>` : ""}
    <details class="workspace-detail-section"><summary>Activity history</summary>
      ${record.history.length ? `<ol>${record.history.slice().reverse().map(({ date, actor, text }) =>
        `<li><strong>${escape(date)} · ${escape(actor)}</strong><br>${escape(text)}</li>`).join("")}</ol>` : "<p>No activity recorded.</p>"}</details>
    <div class="workspace-actions">${allowedActions(record, role).map((action) =>
      `<button type="button" data-action="${action}" ${["submit", "approve", "release", "sendResponse", "date"].includes(action) ? 'class="workspace-primary"' : ""}>${action === "submit" && record.status === "clarification" ? "Send Clarification to Responder" : actionLabels[action]}</button>`).join("")}</div>`;
}

function showDialog(record, action = "") {
  fileUrls.forEach((url) => URL.revokeObjectURL(url));
  fileUrls = [];
  selected = record?.id || "";
  openedRecord = record ? JSON.stringify(record) : "";
  mode = action;
  const actionTitle = action === "submit" && record?.status === "clarification"
    ? "Send Clarification to Responder" : actionLabels[action];
  let fields = "";
  if (["edit", "create", "revise"].includes(action)) {
    fields = field("Subject", "title", record?.title, { required: true }) +
      field("Location", "location", record?.location, { required: true }) +
      field("Drawing / specification reference", "reference", record?.reference) +
      field("Original question", "question", record?.question, { required: true, multiline: true }) +
      field("Requested by date", "requestedBy", record?.requestedBy, { type: "date" }) +
      field("Attachment reference (optional)", "attachment", record?.attachments.join(", ")) +
      '<label>Add supporting files<input type="file" name="files" accept=".pdf,.png,.jpg,.jpeg" multiple></label><p class="workspace-secondary">PDF, PNG or JPEG · Up to 3 files, 1 MB each. Existing attachments are retained.</p>';
    if (action === "revise") {
      fields += field("Reason for revision", "revisionReason", "", { required: true, multiline: true }) +
        "<p>This creates a new submission for the Checker. The previous question and any issued response remain in version history.</p>";
    }
  } else if (action === "approve") {
    fields = `<label>Route to<select name="assignee" required><option value="">Select responder</option>
      <option value="${roles.responder.name}">${roles.responder.name} · ${roles.responder.company}</option></select></label>`;
  } else if (["return", "returnResponse", "clarify"].includes(action)) {
    fields = field("What needs to change?", "reason", "", { required: true, multiline: true });
  } else if (["draftResponse", "sendResponse"].includes(action)) {
    fields = `<section class="workspace-source"><h3>Question to answer</h3><p>${escape(record.question)}</p><p>Drawing / specification · ${escape(record.reference || "Not supplied")}</p></section>` + field("Technical response", "response", record.response, { required: true, multiline: true });
  } else if (action === "date") {
    fields = field("Confirmed due date", "due", record.due, { required: true, type: "date" }) +
      field("Reason for this date", "reason", "", { required: true, multiline: true });
  } else if (action === "release") {
    fields = `<p>Issue this response to the project RFI register.</p><blockquote>${escape(record.response)}</blockquote>
      ${field("Technical reviewer / approver", "reviewer", "", { required: true })}
      ${field("Sign-off reference or review note", "signoffReference", "", { required: true })}
      <label><input type="checkbox" name="signoff" value="confirmed" required> I confirm that the required technical review and sign-off are complete.</label>`;
  } else if (action === "submit") {
    fields = record.status === "clarification"
      ? "<p>Send the updated information back to the assigned responder?</p>"
      : "<p>Send this question and its references to the project checker?</p>";
  }
  dialog.innerHTML = `
    <header class="workspace-dialog-header"><div><p class="overline">${record?.id || "New record"}</p>
      <h2 id="dialog-title">${escape(action === "create" ? "New RFI" : actionTitle || record.title)}</h2></div>
      <button type="button" data-close aria-label="Close detail">✕</button></header>
    <div class="workspace-dialog-body">${action ? `<form id="rfi-action-form">${fields}
      <p id="form-error" role="alert" hidden></p>
      <div class="workspace-actions"><button type="button" data-back>Cancel</button>
        <button class="workspace-primary" type="submit">${action === "submit" && record.status === "clarification" ? "Send Clarification to Responder" : actionLabels[action]}</button></div>
    </form>` : details(record)}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector("input, textarea, select, [data-close]")?.focus();
}

async function saveAction(event) {
  event.preventDefault();
  if (saving) return;
  saving = true;
  const submitButton = event.target.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const submittedMode = mode;
    const uploaded = await readFiles(Array.from(event.target.elements.files?.files || []));
    if (submittedMode !== mode || !dialog.open) return;
    // Read the latest state after file processing, before committing the transition.
    const updated = JSON.parse(localStorage.getItem(recordsKey) || "null") ?? structuredClone(records);
    let record = updated.find(({ id }) => id === selected);
    if (mode === "create" && role === "submitter") {
      const nextId = Math.max(...updated.map(({ id }) => Number(id.slice(4)))) + 1;
      record = {
        id: `RFI-${String(nextId).padStart(3, "0")}`, status: "draft",
        originator: roles.submitter.name, originCompany: roles.submitter.company,
        responsibleCompany: roles.submitter.company, due: "", response: "", reason: "",
        assignee: "", recommendation: null, history: [],
      };
      updated.push(record);
    } else if (!record || !allowedActions(record, role).includes(mode)) {
      throw new Error("This RFI has changed. Reopen the record to see the latest available actions.");
    }
    if (mode !== "create" && JSON.stringify(record) !== openedRecord) {
      records = updated;
      render();
      throw new Error("Another view updated this RFI. Close this detail and reopen the record before saving.");
    }
    const values = new FormData(event.target);
    for (const input of event.target.querySelectorAll("[required]")) {
      if (!String(values.get(input.name) ?? "").trim()) throw new Error("Complete each required field.");
    }
    const value = (key) => String(values.get(key) || "").trim();
    let activity = mode === "submit" && record.status === "clarification" ? "Sent clarification to responder" : actionLabels[mode];
    switch (mode) {
      case "revise":
        reviseRecord(record, roles[role].name, value("revisionReason"));
        // Apply the revised fields after preserving the previous version.
      case "create":
      case "edit":
        if (mode === "edit") {
          record.revisions ??= [];
          record.revisions.push({
            date: dateIn(0), actor: roles[role].name, title: record.title,
            question: record.question, reference: record.reference,
            location: record.location, requestedBy: record.requestedBy,
          });
        }
        for (const key of ["title", "location", "reference", "question", "requestedBy"]) record[key] = value(key);
        record.attachments = value("attachment") ? [value("attachment")] : [];
        record.files = [...(record.files || []), ...uploaded];
        if (record.files.length > 3) throw new Error("This RFI already has supporting files. A maximum of 3 files is supported.");
        if (mode === "edit") record.recommendation = null;
        break;
      case "submit": record.status = record.status === "clarification" ? "assigned" : "submitted"; record.reason = ""; break;
      case "approve": record.status = "assigned"; record.assignee = value("assignee"); record.reason = ""; break;
      case "return": record.status = "returned"; record.reason = value("reason"); break;
      case "clarify": record.status = "clarification"; record.reason = value("reason"); break;
      case "returnResponse": record.status = "assigned"; record.reason = value("reason"); break;
      case "draftResponse": record.response = value("response"); record.status = "assigned"; break;
      case "sendResponse": record.status = "responseReview"; record.response = value("response"); record.reason = ""; break;
      case "release":
        if (value("signoff") !== "confirmed") throw new Error("Confirm required sign-off before issuing the response.");
        record.status = "answered"; record.responseDate = dateIn(0);
        record.signoff = { reviewer: value("reviewer"), reference: value("signoffReference"), issuedBy: roles[role].name };
        break;
      case "date": {
        const previous = record.due || "No confirmed date";
        record.due = value("due");
        activity = `Due date changed from ${previous} to ${record.due}. ${value("reason")}`;
        break;
      }
    }
    if (["return", "clarify", "returnResponse"].includes(mode)) activity += `. ${record.reason}`;
    record.history.push({ date: dateIn(0), actor: roles[role].name, text: activity });
    if (JSON.stringify(updated).length > 3500000) throw new Error("Local attachment storage is full. Use smaller files or an attachment reference.");
    localStorage.setItem(recordsKey, JSON.stringify(updated));
    records = updated;
    dialog.close();
    render();
    const recordButton = content.querySelector(`[data-record="${record.id}"]`);
    (recordButton || byId("role-title")).focus();
    notice.textContent = `${record.id} · ${statuses[record.status]}. Activity saved.`;
    notice.hidden = false;
  } catch (error) {
    const message = byId("form-error");
    message.textContent = error.message || "The change could not be saved.";
    message.hidden = false;
  } finally {
    saving = false;
    submitButton.disabled = false;
  }
}

content.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  notice.hidden = true;
  if (button.hasAttribute("data-tab")) {
    tab = Number(button.dataset.tab);
    render();
    content.querySelector(`[data-tab="${tab}"]`).focus();
  }
  if (button.dataset.plan && role === "checker") updatePlan(button);
  if (button.hasAttribute("data-new")) showDialog(null, "create");
  if (button.dataset.record) {
    const record = records.find(({ id }) => id === button.dataset.record);
    if (record && visibleTo(record, role)) showDialog(record);
  }
});
content.addEventListener("input", (event) => {
  if (event.target.id === "find-rfi") {
    query = event.target.value;
    renderList();
  }
});
content.addEventListener("change", (event) => {
  if (event.target.id === "timing-rfi") {
    timing = event.target.value;
    renderList();
  }
  if (event.target.id === "sort-rfi") {
    sort = event.target.value;
    renderList();
  }
});
dialog.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.hasAttribute("data-close")) dialog.close();
  const record = records.find(({ id }) => id === selected);
  if (button.hasAttribute("data-back")) {
    if (record) showDialog(record);
    else dialog.close();
  }
  if (button.dataset.action && record && allowedActions(record, role).includes(button.dataset.action)) {
    showDialog(record, button.dataset.action);
  }
});
dialog.addEventListener("submit", saveAction);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) window.location.reload();
});
window.addEventListener("storage", (event) => {
  if (event.key !== recordsKey || !event.newValue) return;
  try {
    records = JSON.parse(event.newValue);
    render();
    notice.textContent = "Project records updated in another view.";
    notice.hidden = false;
  } catch {
    notice.textContent = "Unable to read the updated project records. Reload to try again.";
    notice.hidden = false;
  }
});

try {
  start();
} catch {
  content.innerHTML = '<p class="workspace-empty">The workspace could not load. Check browser storage and <a href="signin.html">return to sign in</a>.</p>';
}
