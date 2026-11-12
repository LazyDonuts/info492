# Demo 1 data guide

## Source and provenance

The team's Google Doc Data subtab links the source workbook:
https://docs.google.com/spreadsheets/d/1sWFj-zqr8wGRHExviHd2x6bNJXIBJ2_9oCucBc8K4XY/edit

Snapshot exported October 12, 2026. The second linked workbook, `RFIs_changeOrder_coOutcomes`, was not needed because the first contains all required tables. No live refresh is implied.

The original workbook is preserved at `data/source/ST_EastLink_DRLE_RFI_synthetic_dataset.xlsx`. Its README is copied verbatim to `data/source/README-from-workbook.txt`. This describes seed 20261012, category-conditioned distributions, the modeled cost calibration and the original generation assumptions. No original generator code was supplied. Our import script does not reconstruct it.

The team's generation request asked for realistic synthetic RFIs, metadata, change orders and outcomes based around the light rail expansion into Bellevue and Redmond. The prompt inputted is as follows.
```
I need synthetic data to run a realistic test to see whether categorizing RFI documents by certain content will help give them a clear priority/ranking in terms of importance. Because of this, data generated must be realistic. I am planning to do this based on data and documents about Sound Transit's (Seattle) expansion of the Light Rail into Bellevue and Redmond. Give me RFIs, RFI metadata, on-change orders, on change order outcomes, RFI response times, RFI schedule impacts, and any RFI linked cost-impact information. Base data on the real project using your own calculations and official internet data.
```
Justification: the prompt above specifies to base data on obtainable published information about the project due to access constraints at the time, resulting in the drawing of the following real data: 
```
Downtown Redmond Link (DRLE): the $1.53B baseline budget, single design-build contract, May 10, 2025 opening and Stacy Witbeck/Kuney JV are from official Sound Transit records and press coverage. The February 2025 motion to add up to $25M of contract contingency, with the project 97% complete, is also in the data.
E330 (Bellevue tunnel): Atkinson’s bid and authorized amounts are from the Nov 2015 bid result.
E360 (Overlake): Kiewit-Hoffman’s base and authorized amounts and the June 2016 notice to proceed are from Sound Transit Board Motion M2016-48.
E340 (Bel-Red): the Max J. Kuney authorized cap is from Board Motion M2021-06.
E335 (Downtown Bellevue to Spring District): the GC/CM award and the $10M contingency increase (Board Motion M2021-05), which cited design-related issues, are in the data.
E750 (Systems): the LTK Engineering role is from Board Motion M2020-19.
East Link schedule: the baseline budget and float history are reflected, so E335 and E750 get higher delay rates and slower responses, and the Redmond extension gets lighter ones.
```
and the following synthesized data: 
```
Contract values: E320, E335, E750 and DRLE base values were not in the sources I reviewed, so I estimated them. The E320 and E750 contractors are left as placeholders. The Contracts sheet marks which values are verified.
Cost calibration: I calibrated RFI-linked approved cost to a percentage of each contract’s base value (3% for DRLE up to 9% for E335, about $115M in total). Those percentages are my assumptions, not published figures.
RFI details: the RFI counts and text, dates, response times, and cost and delay distributions are all generated.
```
Workbook methodology is supplied-source content, not independently verified history. All RFI-level facts, costs and outcomes are generated. Public contract facts and placeholders have distinct `source_status` notes.

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

## Reconciliation findings — October 13, 2026

The review compared every exported cell in all six CSVs with the retained workbook: all matched. Source data was not edited.

- 401 recorded initial durations and 390 recorded final durations differ from calendar-date subtraction. The source recorded final-duration average is 11.3 days; date subtraction averages about 11.7 days. The cause is not established by the supplied files. The dashboard explicitly labels the source average and shows both duration definitions in details.
- Approved allocations total $406,590 versus $406,600 for E330-CO-006, and $605,610 versus $605,600 for E330-CO-039. These opposite $10 discrepancies cancel at global level, so global reconciliation alone is insufficient.
- Requested allocations total $356,710 versus $356,700 for E330-CO-018, and $3,463,090 versus $3,463,100 for E335-CO-023. The UI retains and labels these differences instead of silently adjusting values.
- There are 767 missing estimate ranges and 971 RFIs without linked CO IDs. Core IDs, categories, disciplines, assigned reviewers, statuses and dates are populated.

Malformed numeric grouping (such as `1,2`), hexadecimal numbers and invalid dates are unavailable, with visible data warnings. CSV requests revalidate the HTTP cache. Partial link sets retain every listed CO ID and make aggregate costs unavailable; entirely absent links may use the original RFI-level allocated totals with an explicit warning. Missing package values receive their own chart group.

Cost filters distinguish **No positive cost evidence** (718 source records: no positive claim, estimate or linked CO) from **Cost information not recorded** (0 source records: the claim flag itself must also be absent). Neither means the project incurred zero cost.
