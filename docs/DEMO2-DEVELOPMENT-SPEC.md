# INFO 492 · Team 1
# Demo 2 Development Specification for Codex

**Project:** Prioritizing High-Risk RFIs with AI  
**Deliverable:** Navigation refresh + working Demo 2 AI RFI Prioritization Agent  
**Status:** Implementation request, not a completed-feature report  
**Existing website:** https://lazydonuts.github.io/info492/  
**Existing Demo 1:** https://lazydonuts.github.io/info492/dashboard.html  
**Repository:** https://github.com/LazyDonuts/info492  
**Design references:** Existing Team 1 website and Demo 1 dashboard; the team's workflow and assessment mockups; `RFI Priority Criteria` v0.3 research; INFO 492 Evaluation Lab Worksheet.

> **Instruction to Codex:** Inspect the current repository and the available research/data documents first. Implement and verify the features below in the existing codebase. This is **not** a request to recreate the team website or replace Demo 1. Use the existing site as the source of truth for frameworks, file paths, deployment, and visual design. Where source files are missing, provide explicit setup steps; do not fabricate test outcomes or data.

## 1. Product goal and boundaries

Build a new **Demo 2 — AI RFI Prioritization Agent**, accessible from the existing INFO 492 Team 1 website. General Contractors (GCs) should be able to choose or upload up to **10 RFI records**, send them to a **real AI model**, receive evidence-backed **P0 / P1 / P2** review-priority recommendations (or **Needs Information**), inspect an explanation and potential cost implications for every RFI, and view a sortable ranked result list.

The current thesis is that AI-assisted impact assessment may help GCs identify high-cost-risk RFIs earlier and eventually reduce RFI-related costs by **10% or more**. That cost-reduction percentage is a **hypothesis**, not a measured Demo 1 or Demo 2 outcome. Demo 2 assesses the feasibility and consistency of evidence-backed **GC review prioritization**; it does not establish monetary savings.

The rubric represents the **urgency of GC review to potentially limit avoidable cost exposure**, **not** the predicted size of final financial loss. Cost is the primary dimension; schedule timing and responsible-party information are supporting context. A safety concern is surfaced separately for immediate human review.

**In scope:** top navigation menu, new Demo 2 route/page, 10-item selection/upload, actual AI analysis, rule-grounded classifications and evidence, ranked results, RFI details, a reproducible evaluation mode, QA/tests, accessible UI, documentation.

**Out of scope:** shipping functional Demo 3 or Demo 4, autonomous construction decisions, issuing RFIs on behalf of a GC, creating design responses as an architect, authorizing extra work/payment, claims of cost savings, exposing outcome-based priority labels to the model.

## 2. Global site navigation: change “Demo 1 dashboard” to “Demo Menu”

### Existing navigation and required change

The screenshot shows a white header with the `INFO 492 · Team 1` brand and navigation such as **Demo 1 dashboard**, **The research**, **Experiments**, and **Our team**. Preserve those other items and the current white/soft-blue/navy visual style.

**Replace only** the top-level link **“Demo 1 dashboard”** with a dropdown trigger titled **“Demo Menu”** (or “Demos” if this fits the existing header better). The primary requested behavior is automatic expansion when a desktop user **hovers** over the trigger.

Dropdown entries:

| Label | Destination | Behavior |
|---|---|---|
| **Demo 1 — Structured RFI Dashboard** | Existing `/info492/dashboard.html` | Preserve existing working page and functionality, without changing its URL. |
| **Demo 2 — AI RFI Prioritization Agent** | New page in the same website (e.g. `/info492/demo2.html`, if the repository architecture supports it) | Opens the working new agent. |
| **Demo 3 — Risk-Based Prioritization** | Not yet implemented | Visible as **Coming soon** / disabled; do not navigate to a blank page. |
| **Demo 4 — AI-Assisted Review Comparison** | Not yet implemented | Visible as **Coming soon** / disabled; do not navigate to a blank page. |

If the team’s repository uses different established demo names/routes, inspect it and keep names consistent with existing project documentation. Do not silently relabel future demos or fabricate working destinations.

### Interaction and accessibility requirements

- **Desktop hover:** open on pointer hover over trigger; remain open while moving from trigger into menu; close when pointer leaves the composite trigger/menu area, with a small delay only if needed to prevent accidental collapse.
- **Mouse click:** clicking trigger toggles menu. **Keyboard:** Tab to trigger, Enter/Space to open, arrow navigation where appropriate, Escape to close, and visible focus styling. Use proper `aria-expanded`, `aria-controls`, and menu/link semantics consistent with the chosen pattern.
- **Touch/mobile:** do not rely on hover; tapping trigger must open/close the menu. Keep menu inside viewport; no clipped labels.
- **Navigation:** clicking a live item goes to its page and closes the menu. A direct link/bookmark to the old `dashboard.html` continues to work. Clicking “Coming soon” items must not produce a 404.
- **Current location:** show an active/highlighted Demo 1 or Demo 2 entry as appropriate. Close on outside click and on Escape.
- **Visual consistency:** white menu panel, navy text, subtle border/shadow, blue accent, matching type scale/spacing; avoid a separate dark-themed header.

**Design rationale:** the team is developing four sequential demos, so a single nav dropdown scales better than adding four full-width top-level items; it also keeps the research/team links visible and allows the professor to navigate from Demo 1 to Demo 2 without losing context.

## 3. Demo 2 information architecture and UI

Build Demo 2 as a **dedicated page reached from Demo Menu**. Preserve Demo 1 unchanged. Reuse the existing light blue/white dashboard design language, cards, table system, navigation, footer and typography wherever possible.

### A. Header and context

- Heading: **AI RFI Prioritization Agent**.
- Subtitle: **Demo 2 — Evidence-based GC review priority assessment**.
- Clearly disclose **synthetic development data** when sample/demo records are used; do not imply synthetic records are official Sound Transit RFIs.
- Compact disclosure: **AI recommendations require GC review; not a contractual or design authorization**.
- Links: `Back to Demo 1`, `Priority Criteria / Methodology`, and where relevant `Evaluation Mode`.

### B. Input panel: choose or upload 10 RFIs

Implement **two input paths**, if feasible within the repo structure:

1. **Select from existing dataset:** searchable selector with checkboxes, a count `x / 10 selected`, “Select 10 random” for demonstration, “Clear selection”, and a preview of selected RFI IDs/titles. Random selection must be a deliberate user action; save or display a reproducible seed/set ID if testing requires it.
2. **Upload new RFIs:** support a robust documented minimum of CSV and/or JSON; use a controlled schema for ID, title, description, submission-time metadata, and supporting text. Add PDF/text documents only if they can be parsed safely and reliably. Show mapping/validation errors; never silently omit an uploaded RFI.

For a normal demo, allow exactly **10 records per run** (or explain fewer if a limited partial-test mode is needed); block empty/duplicate IDs and unsupported formats with actionable messages. Show a review/confirmation summary of the **exact text/fields sent to AI** before analysis. Require enough actual narrative for meaningful analysis; never manufacture missing information.

**Important:** selecting 10 **random synthetic RFIs** is fine for product demonstration and debugging. The Evaluation Lab requires **10 fixed, real items** unless the instructor explicitly permits alternatives. These are distinct workflows.

### C. Analyze action and states

- Primary CTA: **Analyze 10 RFIs**.
- Provide real progress indicators: validating inputs, securely requesting AI assessment, processing results, completed/partial failure. Do not create a fake progress animation presented as evidence of a real model call.
- Disable duplicate submissions; allow safe retry after an error. Keep user-selected records intact.
- Show a clear backend/AI unavailable state if no provider/API is configured; **do not replace it silently with fake rule-based “AI” output**.

### D. Results overview

At top, render data-derived count cards for **P0**, **P1**, **P2**, **Needs Information** (and a separate excluded/unprocessed count if applicable). Counts must reconcile to the actual submitted set. No hardcoded sample results and no forced distribution such as 2/3/5.

Main table columns: `RFI ID`, `Issue / short description`, `Assigned priority`, `Evidence / priority reason (short)`, `Potential cost mechanism`, `Status (assessed / needs info / failed)`, and `View details`. Add search/filter/export where practical, but prioritize accuracy and readable interaction.

Sort valid priority recommendations **P0 before P1 before P2**. **Needs Information is unranked and visibly separated**, not treated as P2; excluded/resolved and processing failures get their own clearly labeled state. Within each tier use **supported decision date → submission timestamp → stable RFI ID** as documented in the rubric, never invented dates. For a true unranked status provide a separate queue or filter; do not assign a false rank.

### E. Individual RFI explanation/detail drawer

Clicking a row opens a side drawer or modal without losing table filters/scroll position. Include:

- Full question/description and submission-time metadata.
- **Priority** (P0, P1, P2 or Needs Information) and **why this tier applies**.
- **Structured U / A / M / X / D / B evidence**, each Yes/No/Unknown, with a **verbatim excerpt plus reference to the submitted field/document location** when available.
- Specific **potential additional-cost mechanism**, not a fabricated dollar estimate. Distinguish assertion from verified information.
- Schedule/urgency **only if supported** by submitted evidence.
- **Missing facts and targeted follow-up questions** if priority is withheld.
- **Suggested next GC review/coordination action**, clearly non-authoritative; never authorize scope/cost/time changes or impersonate the architect.
- A separate safety escalation flag where needed.

Use compact section headings (Priority, Evidence, Potential Impact, Missing Information, GC Review). Do not substitute polished generic paragraphs for actual evidence.

## 4. Normative priority rubric — faithfully implement team research v0.3

The attached/team-authored **`RFI Priority Criteria` v0.3** is the authoritative basis for this pilot. **Do not silently replace it with generic weighted scores, arbitrary dollar thresholds or keywords.** Keep its original text/version in the repository, cite it in methodology, and propose changes separately for team approval. If a newer frozen version is supplied, use that exact version and document the change.

### Evidence fields (per mechanism)

| Field | Meaning | Allowed values |
|---|---|---|
| **U** | Specific issue/question unresolved at decision time | Yes / No / Unknown |
| **A** | Identified affected work, component, activity, location, procurement commitment or paid resource | Yes / No / Unknown |
| **M** | Concrete additional-cost mechanism: added work, rework, replacement, committed material loss or paid disruption | Yes / No / Unknown |
| **X** | Delay before normal review would create ongoing charges or lock in avoidable exposure | Yes / No / Unknown |
| **D** | Still-available decision or action could change remaining exposure | Yes / No / Unknown |
| **B** | Effective protection already implemented, covering the relevant exposure without substitute cost | Yes / No / Unknown |

Preserve the meanings of Yes/No/Unknown. **Absence of evidence is Unknown, not No.** A cost-impact or schedule-impact flag can evidence the submitter's corresponding reported assertion without a narrative quote; it does not independently verify actual consequences or establish a dollar amount, remaining decision opportunity, or effective protection. Urgent/Expedite can support routing for verification, not cost, schedule or safety exposure. A suggested hold is not proof it is implemented. Where timing depends on an undocumented normal review window, mark X Unknown rather than inventing one. Record the exact field source for metadata evidence and exact source quotes for narrative evidence.

### Decision rules

1. **Pre-screen:** separately exclude resolved or out-of-scope cases. Do not reclassify them as P2.
2. **P0 — High, earlier GC review:** U=A=M=X=D=Yes and B=No. Also assign **P0 with an explicit “mitigation unverified” flag** when U=A=M=X=D=Yes and B=Unknown, to trigger human verification. This is review precaution, not proof of large eventual loss.
3. **P1 — Medium, planned review:** U=A=M=Yes and supported X=No **or** effective B=Yes. Also apply the documented v0.3 branch for X known and D affirmatively No, with a clear explanation that no remaining exposure-changing opportunity was identified. Ensure no independently supported P0 mechanism is overlooked.
4. **P2 — Low, routine clarification:** evidence adequately supports a bounded clarification without an identified monetary mechanism and without contradictory cost assertions. P2 **does not mean guaranteed zero loss**.
5. **Needs Information (unassigned):** essential facts cannot be determined, a material contradiction remains, or X/D are Unknown where they are required to distinguish tiers. Ask targeted follow-up questions. **This is not a fourth severity or a default low priority.**
6. **Multiple cost mechanisms:** any independently supported P0 sets overall P0, but preserve other outstanding uncertainties; otherwise an unresolved mechanism that could change tier leads to Needs Information. If all mechanisms are assessable, any P1 makes overall P1; P2 requires adequate evidence across the issue.
7. **Special states:** safety issues go to separate human escalation. Preserve initial assessment snapshot; later changes require a new timestamped assessment. Processing errors are not valid Needs Information outcomes.

**Classification implementation recommendation:** use the LLM for **evidence extraction and contextual reasoning** while applying the agreed tier rules in a **deterministic, testable rule engine**. Record the evidence values and rule branch that produced each level. If the model's suggested tier conflicts with the rules, surface a validation error or correct deterministically and log the discrepancy. The model is not authorized to invent criteria.

## 5. AI runtime, data contracts and security

This must be a **real AI-assisted workflow**, not a static mockup. The site currently uses GitHub Pages, so **never place a provider secret/API key inside JavaScript shipped to the browser**, a public configuration file, or a commit. Use a secure proxy/backend endpoint (for example, a service-side function) configured via environment secrets. First inspect the existing deployment constraints; select the smallest maintainable compatible backend rather than arbitrarily migrating the whole site.

Required backend behavior:

- Validate client input, max record count and payload sizes; parse text safely; return actionable upload errors.
- Apply authentication/rate limits or a similarly appropriate abuse/cost control for a publicly reachable endpoint.
- Send only fields available at submittal and necessary evidence to the model. Exclude contractor estimate ranges because the data dictionary marks them unavailable at submittal, as well as outcome-derived labels, final costs, realized delays, change-order approvals, and the evaluation Answer Key.
- Set a controlled model/prompt configuration and log it for reproducibility. Give the team an explicit place to configure environment variables without committing secrets.
- Use a constrained JSON schema; validate responses; detect missing/invalid evidence citations; show partial failures distinctly. Keep source text stable and escape any untrusted content in the UI.
- Do not silently continue with simulated results on provider timeout/quota failure. Synthetic fixtures are allowed only in an explicitly labeled **development preview** mode.
- Keep any uploaded real project correspondence out of public GitHub and unnecessary logs. Document data retention, privacy expectations, and any provider disclosure needed before upload.

**Suggested per-item response contract** (adapt names to the actual app architecture; ensure equivalent information is available):

```json
{
  "rfi_id": "EXAMPLE-ID",
  "assessment_state": "assigned",
  "priority": "P0",
  "rubric_version": "v0.3",
  "evidence": {
    "U": {"value": "Yes", "quote": "...", "source": "description"},
    "A": {"value": "Yes", "quote": "...", "source": "description"},
    "M": {"value": "Yes", "quote": "...", "source": "description"},
    "X": {"value": "Yes", "quote": "...", "source": "description"},
    "D": {"value": "Yes", "quote": "...", "source": "description"},
    "B": {"value": "Unknown", "quote": null, "source": null}
  },
  "rule_branch": "P0_MITIGATION_UNVERIFIED",
  "mitigation_unverified": true,
  "priority_reason": "...",
  "potential_cost_mechanism": "...",
  "schedule_considerations": "...",
  "missing_information": ["Is an effective hold already in place?"],
  "suggested_gc_review_action": "Verify the hold and coordinate review through normal channels.",
  "safety_escalation": false
}
```

This JSON is **a shape example, not a real assessed RFI**. If information is missing, use Unknown/null, not fabricated quotes. Define similar schemas for `needs_information`, `excluded`, and `processing_error`; forbid contradictory state/priority combinations.

## 6. Evaluation mode: comply with the Friday Worksheet

Demo mode and Evaluation mode must be separate. The evaluation should test **the actual Demo 2 agent on the same ten fixed real items**, not an arbitrary random sample. If only synthetic records are available, mark the activity **development-only** and ask the instructor before representing it as the formal 10-real-item evaluation.

### Evaluation preparation (before any scoring run)

1. Team finalizes/fixes the rubric and exact disposition labels: **P0 / P1 / P2 / Needs Information / Excluded** (define whether excluded cases are part of the 10-item scored set before testing).
2. Two human reviewers independently annotate the same 10 real submission-time RFI packets; store both raw labels, disagreements, adjudications and evidence. Do **not** ask AI to author the answer key.
3. **Freeze** sample IDs/content, rubric version, input fields, model/prompt settings, rule engine, success threshold and no-AI baseline. The worksheet requests **one primary metric**. Suggested: **exact correct disposition matches out of 10** (the team must approve the numerical success threshold **before** first scored run; 8/10 is only a proposal).
4. Keep the answer key **outside the model input** and never display ground truth before the runs.

### Three required runs

- **Run 1:** agent on the fixed ten packets; capture per-case output and total exact matches out of 10.
- **Run 2:** same agent, same prompt/settings, same packets again, without Run 1 feedback. Record this score **separately**; do not average it with Run 1.
- **Run 3 (no AI):** a **precommitted simple rule** that can be executed on the same inputs (e.g. one keyword rule or submission-date ordering, as appropriate to the final metric). Do not tune the rule against the answer key after seeing results.

**Diagnostics, not extra primary success metrics:** per-case disagreements, P0 recall/coverage, abstention/Needs Information rate, invalid output count, citation validity, and **cross-role-boundary violations** (reported separately, even when classification is right).

### Role boundaries and failure analysis

Track and categorize failures (unsupported inference/hallucination; wrong tier; missing essential evidence; misrouted responsibility; premature action; output/parser failure). Count GC-specific boundary violations **separately**: answering as the architect, inventing drawing/spec identifiers, bypassing the contractual communication chain, or authorizing work/cost/time changes. An apparently correct classification delivered through an unsafe action remains a failure worth reporting.

### Submission artifacts

Create a `/eval` directory with:

- `answer_key.csv` or `.md` containing case IDs, source provenance, two independent labels, final adjudication, and minimal rationale (never commit confidential documents without permission).
- `rubric_frozen.md`, `baseline_rule.md`, `evaluation_protocol.md`.
- `run1_results.csv`, `run2_results.csv`, `baseline_results.csv` when real runs have occurred.
- `evaluation_report.md` — **one page** with task/metric/threshold, three scores, failure groups and counts, boundary-violation count, whether the agent worked, next fix, and each team member's contribution.

The worksheet says the evaluation report and answer key accompany **Demo 2 by Wednesday, October 21, 2026 at 11:59 PM**. Do not fabricate scores; leave explicit TODO placeholders until measured.

## 7. Test scenarios, QA and acceptance criteria

### Functional cases

- Header dropdown works with hover, click, keyboard and touch; no menu flicker; all four choices visible; future choices honestly marked Coming soon.
- Demo 1 existing direct URL, dataset filters, detail view and navigation still work after changes.
- Dataset selection produces exactly the chosen 10 IDs; random selection is visibly marked as demo-only and repeatable when seed captured.
- CSV/JSON upload schema mapping works; duplicates, empty descriptions, unsupported file sizes and invalid encodings produce clear errors.
- Analyze triggers a verifiable **real server-side model call**, or visibly fails with a setup/error message. No false claims of AI analysis.
- Agent returns structured U/A/M/X/D/B decisions with supporting evidence, tier and rule branch. All labels are drawn from frozen definitions.
- Test **P0 with B=No**, **P0 mitigation-unverified B=Unknown**, **P1 with X=No**, **P1 with B=Yes**, **P2 bounded clarification**, **Needs Information with missing X/D**, **contradictory submission**, **multiple mechanisms**, **resolved/excluded**, **separate safety escalation**, and **backend failure**.
- Results card counts equal processed classifications; per-item details match the selected input; missing cost amounts are not replaced by zero.
- Sorting honors P0>P1>P2 and stable within-tier tie breakers; needs-info, excluded and failures never masquerade as ranked P2.
- Evaluation mode never changes sampled cases between AI Run 1 and Run 2; raw per-run outputs, prompt/rubric versions and logs can be exported; no answer-key leakage.

### Accessibility, visual and engineering checks

- Use semantic navigation/buttons/links; visible keyboard focus; good color contrast for badges; status not conveyed solely by color.
- Responsive desktop/laptop/tablet/mobile layouts; no hidden actionable table columns without alternative access; drawer keyboard controls work.
- Loading, empty, partial failure, network failure, timeout and quota error states are accessible and clear.
- Automated unit tests for deterministic tier rules and data parsing; component tests for menu/selection/results; browser smoke tests if environment supports them.
- Run existing test suite, lint/type check where configured, build and GitHub Pages path check. Report **what actually ran**, not presumed passes.

### Definition of done

- [ ] Existing homepage shows **Demo Menu** instead of **Demo 1 dashboard**.
- [ ] Hover, click, keyboard and touch interactions work; Demo 1 and Demo 2 links open; Demo 3/4 show honest Coming soon states.
- [ ] Demo 1 remains usable at its current address with no regressions.
- [ ] Demo 2 is integrated visually and navigationally, and users can select/upload 10 RFIs.
- [ ] Real AI assessment works through an appropriately secured API/backend with no public secret.
- [ ] Outputs reflect the **team rubric**, including P0/P1/P2, Needs Information, exclusions, evidence and cost mechanisms.
- [ ] Rank/results/details accurately reflect **the current run**, not hardcoded examples.
- [ ] Evaluation mode supports two same-case AI runs plus a fixed no-AI baseline and separate score recording.
- [ ] Rubric, data assumptions, system setup, testing and limitations are documented.
- [ ] Browser and build tests pass where executable, or unresolved blockers are clearly reported.

## 8. Implementation plan for Codex

Execute this in controlled phases, preserving user changes and minimizing regressions:

1. **Audit:** inspect Git state, current pages/routes, CSS, JS framework, data, prior Demo 1 tests, and supplied v0.3 rubric. Identify actual missing documents/columns and deployment constraints.
2. **Navigation:** implement the Demo Menu with accessible responsive behavior. Verify backward compatibility with Demo 1 before proceeding.
3. **Shell/UI:** create the Demo 2 route and matching design; implement input selection/upload, validation and results/detail components.
4. **Real agent integration:** add secure provider/backend, structured extraction, deterministic rubric evaluation, citation validation and safe error paths.
5. **Evaluation tooling:** fixed-ten-case mode, run metadata capture, result exports and `/eval` templates without fabricated results.
6. **QA and polish:** automated/unit/browser tests, data checks, accessibility, responsive refinements, docs and production build.

**Deliver the work, not just a proposal.** If access to model credentials, private real RFIs or infrastructure is missing, implement all independent parts, stop at the genuine external blocker, provide clear configuration instructions and report incomplete live-model validation truthfully. Do not publish or commit secrets or confidential RFI files. Avoid overwriting unrelated work or making destructive Git changes.

## 9. Final response expected from Codex

1. **What changed** — concise features and exact modified/created file paths.
2. **How to use it** — local commands, routes and key interaction paths, including menu hover and Demo 2 input/results.
3. **AI integration status** — provider/back-end architecture, how secrets are configured, whether a real model call was actually verified.
4. **Evaluation status** — rubric version, fixed cases, answer-key handling, any actual run scores or clearly marked pending tasks.
5. **Testing report** — commands executed and pass/fail results; browser/device checks; regression status of Demo 1.
6. **Remaining blockers/risks** — unsupported file inputs, unavailable credentials, gaps in source data, unresolved rubric ambiguities, and next concrete steps.

**Begin with the repository audit and implement the accessible navigation dropdown first. Then build Demo 2 in the existing site without changing the scope of Demo 1.**
