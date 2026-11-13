export const project = "East Link · Station Systems";
export const contractor = "Meridian Constructors";
export const designer = "Northline Design";

export const roles = {
  submitter: {
    name: "Alex Rivera", company: contractor, label: "RFI submitter",
    title: "My RFIs", description: "Submit field questions, track decisions, and follow up on returned requests.",
  },
  checker: {
    name: "Morgan Chen", company: contractor, label: "Checker",
    title: "Review Queue", description: "Check incoming submissions for completeness and route approved RFIs.",
  },
  responder: {
    name: "Priya Shah", company: designer, label: "Responder",
    title: "Assigned to Me", description: "Review the source material and prepare responses to your assigned RFIs.",
  },
  manager: {
    name: "Daniel Brooks", company: contractor, label: "Schedule manager",
    title: "Schedule & Deadlines", description: "Track company obligations and keep response deadlines current.",
  },
  reader: {
    name: "Taylor Williams", company: contractor, label: "Reader",
    title: "Project RFI Register", description: "Find project RFIs, verify their status, and reference official responses.",
  },
};

export const statuses = {
  draft: "Draft",
  submitted: "Awaiting check",
  returned: "Revision requested",
  assigned: "Assigned",
  clarification: "Clarification requested",
  responseReview: "Awaiting response sign-off",
  answered: "Answered",
};

export function dateIn(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0")).join("-");
}

function sample(id, title, status, details) {
  return {
    id, title, status, originator: "Alex Rivera", originCompany: contractor,
    responsibleCompany: contractor, assignee: "", location: "Station concourse",
    reference: "", question: "", requestedBy: "", due: "", response: "",
    attachments: [], reason: "", recommendation: null, history: [], ...details,
  };
}

export function initialRecords() {
  return [
    sample("RFI-024", "Duct route conflicts with structural beam", "submitted", {
      location: "Concourse · Grid C4", requestedBy: dateIn(3),
      question: "The proposed supply duct crosses the beam at Grid C4. Can the duct be rerouted below the beam while maintaining ceiling clearance?",
      recommendation: { priority: "High", reason: "Ceiling coordination is pending and the requested response is due this week.", evidence: "The proposed supply duct crosses the beam at Grid C4." },
      history: [{ date: dateIn(0), actor: "Alex Rivera", text: "Submitted for check." }],
    }),
    sample("RFI-025", "Confirm access panel finish", "submitted", {
      originator: "Jordan Lee", reference: "A-412", requestedBy: dateIn(1), due: dateIn(1),
      question: "Confirm whether the access panel finish should match the adjacent ceiling grid.",
      recommendation: { priority: "Low", reason: "Finish clarification with no recorded installation dependency.", evidence: "Confirm whether the access panel finish should match the adjacent ceiling grid." },
    }),
    sample("RFI-026", "Cable tray clearance at crossing", "assigned", {
      assignee: "Priya Shah", reference: "E-231", due: dateIn(-1), requestedBy: dateIn(-2),
      location: "Service corridor · Grid D2",
      question: "Confirm the required clearance between the cable tray and the existing sprinkler branch at Grid D2.",
    }),
    sample("RFI-027", "Platform edge detail at expansion joint", "answered", {
      assignee: "Priya Shah", reference: "S-520", location: "Platform 2 · Joint J3", due: dateIn(2),
      question: "Which platform edge detail applies at the expansion joint?",
      response: "Use detail 3 on drawing S-520 at Joint J3. Maintain the indicated movement gap.",
      responseDate: dateIn(-1),
    }),
    sample("RFI-028", "Verify conduit entry location", "draft", {
      location: "Electrical room", question: "Confirm which wall the feeder conduits should enter.",
    }),
    sample("RFI-029", "Confirm equipment access opening", "assigned", {
      originator: "Jamie Patel", originCompany: designer, reference: "M-330",
      assignee: "Priya Shah", question: "Confirm the access opening dimensions for replacement of the equipment.",
    }),
    sample("RFI-030", "Verify panel mounting elevation", "submitted", {
      originator: "Jordan Lee", responsibleCompany: designer, reference: "E-301",
      requestedBy: dateIn(7), question: "Confirm the panel mounting elevation at the north wall.",
    }),
  ];
}

export function visibleTo(record, role) {
  switch (role) {
    case "submitter": return record.originator === roles.submitter.name;
    case "checker":
    case "reader": return record.status !== "draft";
    case "responder": return record.assignee === roles.responder.name;
    case "manager":
      return record.originCompany === contractor || record.responsibleCompany === contractor;
    default: return false;
  }
}

export function allowedActions(record, role) {
  const actions = [];
  if (!visibleTo(record, role)) return actions;
  const editable = ["draft", "returned", "clarification"].includes(record.status);
  if (role === "submitter" && editable) actions.push("edit", "submit");
  if (role === "checker" && record.status === "submitted") actions.push("approve", "return");
  if (role === "responder" && record.status === "responseReview") actions.push("draftResponse", "release");
  if (role === "responder" && record.status === "assigned") actions.push("draftResponse", "sendResponse", "clarify");
  if (role === "manager") {
    if (record.responsibleCompany === contractor && record.status !== "answered" && record.status !== "draft") {
      actions.push("date");
    }
    if (record.originCompany === contractor && !editable) actions.push("revise");
    if (record.originCompany === contractor && editable) {
      actions.push("edit");
      if (record.status !== "draft") actions.push("submit");
    }
  }
  return actions;
}

export function reviseRecord(record, actor, reason) {
  if (!reason.trim()) throw new Error("Explain why this revision is needed.");
  const prior = structuredClone(record);
  delete prior.revisions;
  record.revisions ??= [];
  record.revisions.push({ ...prior, date: dateIn(0), actor, revisionReason: reason });
  record.status = "submitted";
  record.assignee = "";
  record.response = "";
  record.responseDate = "";
  record.signoff = null;
  record.recommendation = null;
  record.reason = reason;
}
