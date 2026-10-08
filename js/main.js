"use strict";
// Fictional examples only. These fixed ratings illustrate a review workflow,
// not a model, measured cost prediction, or data from California High-Speed Rail.
const requests = [
  {
    id: "018",
    title: "Lobby finish specification",
    trade: "Finishes",
    days: 8,
    risk: "low",
    score: 20,
    description:
      "The subcontractor needs clarification on the specified lobby wall finish.",
    reason:
      "The example concerns a localized finish choice, with no assumed structural rework or critical activity dependency.",
    action: "Confirm the finish specification with the design team.",
  },
  {
    id: "024",
    title: "Service routing clarification",
    trade: "MEP",
    days: 6,
    risk: "medium",
    score: 58,
    description:
      "Two service routes share the same ceiling zone and need coordination before installation.",
    reason:
      "The assumed conflict could require rerouting and coordination across trades. Review before installation to limit rework.",
    action:
      "Coordinate the affected trades and request a design clarification.",
  },
  {
    id: "031",
    title: "Structural detail conflict",
    trade: "Structural",
    days: 3,
    risk: "high",
    score: 94,
    description:
      "A connection detail conflicts with the current structural layout before fabrication.",
    reason:
      "In this fictional scenario, fabrication is waiting on clarification. A wrong decision could create costly structural rework.",
    action: "Escalate to the structural design team for early human review.",
  },
  {
    id: "037",
    title: "Signage mounting height",
    trade: "Architectural",
    days: 2,
    risk: "low",
    score: 15,
    description:
      "The installation team needs confirmation of a signage mounting height.",
    reason:
      "This example assumes a narrow clarification with limited downstream cost exposure. It still needs a response.",
    action: "Confirm the applicable drawing and mounting requirement.",
  },
  {
    id: "042",
    title: "Foundation / utility conflict",
    trade: "Civil",
    days: 1,
    risk: "high",
    score: 88,
    description:
      "A proposed foundation location overlaps an existing utility route.",
    reason:
      "The assumed clash could interrupt excavation and require redesign or relocation. Early coordination may prevent avoidable work.",
    action: "Review utility information with the civil and structural teams.",
  },
  {
    id: "045",
    title: "Equipment access clearance",
    trade: "Mechanical",
    days: 0,
    risk: "medium",
    score: 52,
    description:
      "The team needs to confirm maintenance clearance around a mechanical unit.",
    reason:
      "Insufficient clearance could require a layout change. The example assumes the unit has not yet been installed.",
    action:
      "Verify clearance with the mechanical designer before installation.",
  },
];
let selectedId = "031";
let sortMode = "arrival";
const list = document.getElementById("rfi-list");
const detail = document.getElementById("rfi-detail");
const status = document.getElementById("queue-status");
function renderDetail() {
  const item = requests.find((request) => request.id === selectedId);
  detail.innerHTML = `<p class="eyebrow">WHY THIS REQUEST?</p><p class="detail-id">RFI / ${item.id} · ${item.trade.toUpperCase()}</p><h3 id="detail-title">${item.title}</h3><span class="row-risk detail-risk risk-${item.risk}">${item.risk.toUpperCase()} RISK SIGNAL</span><p class="detail-description">${item.description}</p><div class="detail-reason"><span>ILLUSTRATIVE REASONING</span><p>${item.reason}</p></div><p class="detail-action">Suggested next step: ${item.action}</p>`;
}
function renderQueue(animate = false) {
  const ordered = [...requests].sort((a, b) =>
    sortMode === "risk" ? b.score - a.score : b.days - a.days,
  );
  list.innerHTML = ordered
    .map(
      (item, index) =>
        `<button type="button" class="rfi-row${item.id === selectedId ? " selected" : ""}${animate ? " enter" : ""}" data-id="${item.id}" aria-pressed="${item.id === selectedId}" aria-controls="rfi-detail" style="animation-delay:${index * 35}ms"><span><span class="row-title">${item.title}</span><span class="row-meta">RFI ${item.id} / ${item.trade} / ${item.days === 0 ? "Today" : item.days + (item.days === 1 ? " day waiting" : " days waiting")}</span></span><span class="row-risk risk-${item.risk}">${item.risk.toUpperCase()}</span></button>`,
    )
    .join("");
}
list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  selectedId = button.dataset.id;
  // Keep keyboard focus on the existing row instead of replacing all buttons.
  list.querySelectorAll("[data-id]").forEach((row) => {
    const selected = row.dataset.id === selectedId;
    row.classList.toggle("selected", selected);
    row.setAttribute("aria-pressed", String(selected));
  });
  renderDetail();
  status.textContent = `Selected RFI ${selectedId}. ${requests.find((item) => item.id === selectedId).reason}`;
});
document.querySelectorAll("[data-sort]").forEach((button) =>
  button.addEventListener("click", () => {
    sortMode = button.dataset.sort;
    document.querySelectorAll("[data-sort]").forEach((control) => {
      const active = control.dataset.sort === sortMode;
      control.classList.toggle("active", active);
      control.setAttribute("aria-pressed", String(active));
    });
    renderQueue(true);
    status.textContent =
      sortMode === "risk"
        ? "Requests sorted by preset risk priority. Structural detail conflict is first."
        : "Requests sorted by arrival order. Lobby finish specification is first.";
  }),
);
renderQueue();
renderDetail();
if (
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  document.documentElement.classList.add("js-reveal");
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.08 },
  );
  document
    .querySelectorAll(".reveal")
    .forEach((element) => observer.observe(element));
}
