# Demo 1 review and refinement

Review completed October 13, 2026. Scope: refine the existing static HTML/CSS/ES-module application and its supplied data; preserve the team homepage and original workbook.

## A. Initial audit findings

No critical failure prevented the full dataset from loading. All six required functions existed, and the initial 12 tests passed. Those tests did not cover several important failure modes.

| Severity | Finding and root cause | Resolution |
| --- | --- | --- |
| High | Partial CO links replaced the RFI's full list of IDs and a partial sum appeared complete. | Preserve ID union; flag missing edges; incomplete aggregates unavailable. |
| High | Numeric parsing stripped arbitrary commas/spaces and accepted hexadecimal, turning invalid input into plausible money. | Strict decimal/currency grammar; invalid fields remain unavailable and are reported. |
| High | Source durations disagree with dates; individual CO discrepancies canceled globally. Existing validation checked global totals only. | Per-record/per-CO reconciliation, source notices and both duration definitions in details. |
| High | Trial starts inherited previous pagination size and sort; task placeholder invited visible expected answers. | Fixed initial state, locked condition/page size, exported settings, separate answer-key guidance. |
| Medium | CSV fetches could reuse a fresh cached prior dataset after an update. | Explicit HTTP cache revalidation. |
| Medium | Cost absence wording mixed a negative flag with an absent flag. | Separate no-positive-evidence and entirely-unrecorded filters. |
| Medium | Small 10–12px labels, unclear sortable headers, mobile filters dominated the page. | Larger typography, sorting arrows, mobile filter disclosure, readable drawer. |
| Medium | Package/chart re-render discarded keyboard focus; missing packages disappeared from totals. | Restore focus and include an unavailable-package group. |
| Medium | Optional data failures were visible only inside methodology. | Visible warning banner with direct methodology access. |
| Low | Header statistics' fixed scope and cost sorting result were not obvious. | Scope caption and allocated approved amounts in table rows. |

## B. Improvements implemented

- `js/rfi-data.js`: strict parsing, field/relationship checks, partial-link safety, cache revalidation, package aggregation and source reconciliation.
- `js/dashboard.js`: truthful cost/date presentation, warning surfaces, focus restoration, consistent trial starts and exported settings.
- `dashboard.html`: accessible table scope/caption, mobile filter toggle, source notices, active-task controls and versioned assets.
- `css/dashboard.css`: readable type, input targets, focus states, sorting indicators and responsive layout refinements.
- `tests/rfi-data.test.js`: expanded from 12 to 24 meaningful tests.
- Data guide, test plan, Demo Note and README updated; original CSVs/workbook unchanged.

Architecture remains dependency-free static hosting. No AI models, predictions, savings or autonomous response features were added.

## C. Testing results

24 automated tests passed; static production validation and JavaScript syntax checks passed. Full CSV-to-workbook cell comparison passed for all six tables. Counts: 1,370 RFIs, 7 contracts, 328 change orders, 328 outcomes, 399 links, 25 dictionary entries.

Chrome workflows and viewport checks are recorded in TESTING.md, including actual fault injection against a temporary copy, export inspection and keyboard focus. Actual-data local page had no captured console errors. No lint/type checker is configured.

Local Node performance sample: model construction about 31ms; 50 combined query/chart runs had approximately 0.35ms median and 0.62ms 95th percentile. This is an engineering microbenchmark, not browser load time or user-study evidence. Rendering remains paginated; no dependencies were added.

## D. Remaining issues

Source discrepancies remain intact and disclosed: 401 initial/390 final duration differences; four CO amount differences of $10 (two approved, two requested). Their generation cause is unverified. Core organizational fields are present; 767 estimates are absent. Dataset is synthetic and has no open RFIs. Original data-generator code was not supplied; only methodology and import conversion are available. Safari/Firefox, screen-reader testing and participant outcomes remain unverified.

## E. Assignment readiness

| Requirement | Status / action before submission |
| --- | --- |
| Live demo or recorded walkthrough | Working dashboard; use the supplied walkthrough for a live presentation or record it. |
| Repository with code/data/prompts/dependencies | Included; static runtime has no dependencies. Workbook importer declares openpyxl. Generation program remains unavailable and disclosed. |
| Demo Note ≤500 words | Updated draft under limit; add actual participant observations before submitting claims about retrieval efficiency. |
| Individual contribution statements | Templates exist; each member must verify and complete their own work statement. |
| Fair baseline comparison | Same records/details, fixed pagination and initial state; observer must prepare matched tasks and counterbalance order. |

Demo 1 is the information-organization stage. Engineering correctness does not validate AI-assisted risk prediction or the 10% cost-reduction hypothesis.
