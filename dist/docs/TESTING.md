# Demo 1 walkthrough and evaluation plan

## Five-minute walkthrough

1. Open the team website and choose **Demo 1 dashboard**.
2. Identify the synthetic-data label and full-source summary. Explain why Open is 0: this historical dataset has 1,327 Closed and 43 Void/Withdrawn records.
3. Search an RFI ID, then search a location or description. Combine category, discipline, reviewer, status and package filters. Point to result count and removable chips.
4. Choose **Recorded estimate (later)**. Sort by estimate amount, open an RFI, and locate its estimate range and information-timing label.
5. Choose **Linked change order (later)**. Open a record with a shared CO. Show the RFI allocation separately from the whole CO total and outcome.
6. Clear filters, navigate pages, switch to Plain list, and open the same RFI. Explain that this is an information-retrieval comparison, not an AI model.
7. Expand **Test information retrieval**, enter a participant code and exact target, start, locate the answer, and record time and observer-scored accuracy. Export results.

## Meaningful paired comparison

Research question: Can a structured RFI dashboard help GCs locate and understand cost-related RFI information more efficiently than a plain RFI list?

Prepare equivalent task pairs before testing. Choose answers directly from the source, including the exact expected IDs/amounts. Use different matched targets in the two conditions to reduce recall. Counterbalance which view comes first. Allow a short practice task. Keep device, screen size, pagination size and observer guidance consistent; disclose that native browser Find can search only the currently rendered page in the plain baseline.

Tasks:
- Find a Closed RFI in Utility Conflict / Relocation with Civil/Utilities discipline in DRLE.
- Find an RFI assigned to DSDC – LTK Engineering in E750.
- Find an RFI with a recorded estimate and report both bounds and its information timing.
- Given an RFI with a linked CO, report CO ID, allocated approved amount and whole CO approved amount. Explain their distinction.

The timer does not choose answers, infer correctness or generate results. Starting a trial resets filters and page for comparability and locks its condition. The observer records answer and Correct / Partially correct / Incorrect / Not scored. Cancel records no trial. Results are local; export CSV before clearing browser storage. Use anonymous codes, not personal names.

Record elapsed seconds and answer accuracy separately; an incorrect fast answer is not a success. Report sample size, median paired time difference, individual times, errors and limitations. Do not convert retrieval-time differences into cost savings. Include cases with missing estimates and zero approved costs.

## Actual user-testing results — pending

No participant retrieval study has been conducted by this implementation. Populate after real testing:

| Participant code | Condition order | Exact task | Expected answer | Observed answer | Seconds | Accuracy | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## Engineering validation

`npm test` checks CSV quoting, blank/zero preservation, source counts, combined filters, numeric/date sorting, missing fields, duplicate IDs, related-file errors, and many-to-many allocations. `npm run build` verifies static production files and local links. Browser checks cover loaded cards, filters, no-match/reset, detail preservation, paging, plain baseline, study controls and responsive overflow. These checks are not participant experiment results.

### Implementation verification — October 12, 2026

- 12 automated tests passed; static production validation passed.
- Browser combined-filter case returned 38 matching RFIs and retained those filters after closing details.
- No-match query returned 0; Clear all restored 1,370. Pagination moved to 26–50 and returned to page 1.
- Shared-CO example E320-RFI-0014 displayed its $4,000 allocation separately from the $95,100 whole E320-CO-003 amount.
- Local engineering-only trial was recorded and exported successfully; the CSV contents were checked. The trial was removed afterward, leaving no participant results.
- Page widths at 390 and 768 pixels matched the viewport; the wide table scrolled within its container. Mobile drawer and Escape/focus restoration were checked.

These are engineering checks, not evidence of improved retrieval performance.

### Refinement verification — October 13, 2026

The expanded 24-test suite covers every actual category/trade/reviewer/status/package choice, combined package filters, both sort directions, literal search punctuation, missing and zero costs, partial links, malformed amounts/dates, source relationships and per-CO reconciliation. The initially stricter reconciliation tests exposed genuine source discrepancies; these are now asserted and surfaced, not suppressed or altered.

Browser checks executed in Chrome:

- Seven combined criteria returned 38 RFIs; estimate sorting, detail open/close and page 2 (26–38) preserved the correct result set.
- No-positive-evidence filter returned 718; entirely-unrecorded filter returned 0. Empty-state reset restored 1,370 and focused search.
- Keyboard Enter opened details; Escape restored the record button. Clicking a package preserved keyboard focus on its selected button.
- Shared CO E320-CO-003 displayed $4,000 allocated versus $95,100 whole CO. E330-CO-006 displayed its $10 source discrepancy. E320-RFI-0003 showed source duration 16 days versus 18 calendar days.
- An isolated temporary site tested primary CSV 404 and successful Retry, optional-table failure, invalid amounts/dates, a partial two-CO link set and a long description with literal HTML characters. Production source data was not modified.
- Viewports 320, 390, 768, 1024 and 1440 pixels had no document-wide horizontal overflow. Table scrolling remained inside the register. Mobile filter disclosure and the detail drawer were exercised.
- A labeled engineering trial was saved, retained across reload, exported and inspected, then removed. Cancel produced no result. These are not participant measurements.
- The actual-data local page showed no captured JavaScript console errors. Fault-injection requests intentionally produced missing-resource responses.

Trial starts now reset to 25 rows/page, default submitted-date sorting (dashboard) or source order (baseline), and page 1. View and page-size controls are locked during a trial. Both conditions use the same font size, bounded scroll area and detail view. A participant-facing task appears beside the register; **keep expected answers in a separate observer answer key**, not in that visible task. Export includes initial sort and page size. Counterbalance condition order and use matched, different target records to reduce recall.

Browser testing used Chrome; Safari/Firefox and a full assistive-technology audit remain unverified. No lint or type-check tool is configured; JavaScript syntax checks and the static production validator are used.
