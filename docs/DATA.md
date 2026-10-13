# Demo 1 data guide

## Source and provenance

The team's Google Doc Data subtab links the source workbook:
https://docs.google.com/spreadsheets/d/1sWFj-zqr8wGRHExviHd2x6bNJXIBJ2_9oCucBc8K4XY/edit

Snapshot exported October 12, 2026. The second linked workbook, `RFIs_changeOrder_coOutcomes`, was not needed because the first contains all required tables. No live refresh is implied.

The original workbook is preserved at `data/source/ST_EastLink_DRLE_RFI_synthetic_dataset.xlsx`. Its README is copied verbatim to `data/source/README-from-workbook.txt`. This describes seed 20261012, category-conditioned distributions, the modeled cost calibration and the original generation assumptions. No original generator code was supplied. Our import script does not reconstruct it.

The team's generation request asked for realistic synthetic RFIs, metadata, change orders and outcomes based around the light rail expansion into Bellevue and Redmond. Full request and generated-data justification remain in the [team Data document](https://docs.google.com/document/d/1DtZcle9EkVuVeR8Sq29ZWV9f7MnqZ_dMiSB-OrAZP_Q/edit). Workbook methodology is supplied-source content, not independently verified history. All RFI-level facts, costs and outcomes are generated. Public contract facts and placeholders have distinct `source_status` notes.

## Tables and transformation

| Workbook sheet | CSV | Rows | Key |
| --- | --- | ---: | --- |
| RFIs | rfis.csv | 1,370 | rfi_id |
| Contracts | contracts.csv | 7 | package_id |
| Change_Orders | change_orders.csv | 328 | co_id |
| CO_Outcomes | change_order_outcomes.csv | 328 | co_id |
| RFI_CO_Link | rfi_change_order_link.csv | 399 | rfi_id + co_id |
| Data_Dictionary | data_dictionary.csv | 25 | column(s) |

Import reads cached source values, serializes dates as `YYYY-MM-DD`, preserves blanks and zero, and converts integral numbers to integer strings. It does not change IDs, merge distinct reviewer names, generate rows, fill missing costs or derive trade/responsibility. The Summary formulas are not used: the dashboard recomputes metrics from RFIs.

The CSV parser supports BOM, CRLF, quoted commas, doubled quotes and multiline text. Header spacing is normalized to underscores; row widths, missing/duplicate IDs and duplicate links are checked. Invalid numeric/date values become unavailable, not zero. RFIs are required; related-table errors are surfaced in Data & methodology. All source fields are retained in `record.raw`.

## Display mapping

| UI | Source | Timing / meaning |
| --- | --- | --- |
| RFI ID | rfi_id | Original ID |
| Subject / question | subject, description | At submission |
| Category | content_category | Original 12 categories |
| Trade / discipline | discipline | Original 11 disciplines; no inferred trades |
| Responsible party | assigned_reviewer | Routing reviewer; distinct from submitting contractor |
| Submitting party | contractor, submitted_by | Source fields; timing not explicitly classified in dictionary |
| Package / location / spec | package_id, location, spec_section | At submission |
| Submission date | submitted_date | At submission |
| Contractor priority | contractor_priority_flag | Routine / Expedite / Urgent; source indicator, not AI |
| Cost / schedule claims | contractor_claims_cost_impact, contractor_claims_schedule_impact | At submission, not measured cost/delay |
| Status | status | Retrospective; source has only Closed and Void/Withdrawn |
| Estimate range | contractor_est_cost_low_usd, contractor_est_cost_high_usd | Retrospective according to dictionary N |
| Response duration / dates | response_days_initial, response_days_final, response_date, closed_date | Retrospective calendar days |
| Schedule impacts | schedule_impact_days_claimed, critical_path_delay_days_actual, float_consumed_days_actual | Retrospective, modeled |
| Change orders | RFI_CO_Link → Change_Orders → CO_Outcomes | Retrospective |
| Ground truth | impact_score_0_100, true_priority_rank, true_priority_tier | Outcome-derived target only; never a prediction |

The dictionary describes estimates as “early” but explicitly sets their availability to N. The application follows N conservatively. It retains unknown timing for `project`, `contractor`, `submitted_by`, `discipline` because those are not individually classified in the source dictionary; discipline is usable for organization, not automatically authorized as a future AI feature.

## Cost rules

- RFI amounts sum only `allocated_approved_cost_usd` or `allocated_requested_cost_usd` from distinct link edges.
- `allocation_share` should sum to one per CO; inconsistent sums produce warnings.
- The drawer shows whole CO approved cost separately as a **shared total**. It is never added once per linked RFI.
- If allocation rows are unavailable, existing `linked_approved_cost_usd` / `linked_requested_cost_usd` on RFIs may be displayed as already allocated RFI-level totals, with a missing-link warning.
- An incomplete set of amounts is unavailable rather than silently summed as a partial total.
- A missing estimate is not zero. An approved allocation of 0 is preserved, e.g. a rejected CO.
- No linked CO means “No linked CO recorded,” not a forecast of no cost.
- CO associations are modeled links, not proof of causation.

## Summary definitions

All cards describe the full loaded dataset, not the filtered page. Counts per package reflect the other active filters, excluding the package filter itself, so users can compare packages.

- Total: loaded unique RFI rows.
- Open: records with a known nonterminal status. Terminal statuses are Closed, Resolved, Void/Withdrawn, Withdrawn, Cancelled/Canceled. No source status means unavailable. Coverage is shown.
- Closed: Closed/Resolved; void/withdrawn reported separately. The source is a terminal historical snapshot, not an active construction queue.
- Cost evidence: at least one positive submission claim, populated estimate bound or linked CO.
- Average final response: arithmetic mean of nonnegative numeric `response_days_final`, with valid-record denominator. Unavailable when none exist.

## Missing fields and limitations

There are no unsupported required core fields in this supplied snapshot: category, discipline, reviewer, status and dates exist. No current/open operational records exist. No original synthetic-generation program was provided. We have a source description and conversion script, not proof of reproducibility of the generator. The dataset intentionally builds category effects into outcomes; retrieval experiments are possible, but later predictive success would not establish real-world validity. Demo 1 neither predicts risk nor verifies the 10% savings thesis.
