# Coordination Demo 1 — Demo Note draft

**Status: implementation complete; participant evaluation pending.** Replace the evaluation paragraph with actual observations before submission. This note is under 500 words.

## What we tested

Demo 1 tests whether organizing RFI information can help General Contractors locate and understand cost-related records more efficiently than a plain list. The structured view provides search, combined filters, sorting, summary counts and detailed record inspection. A plain-list condition presents the same records without dashboard filtering or summaries. Both conditions use the same detail information.

We use the team's 1,370 synthetic RFIs modeled around Sound Transit's East Link and Downtown Redmond Link. Related tables contain contracts, change orders, outcomes and RFI-level cost allocations. The application labels this dataset as synthetic and separates information available at submission from later estimates and modeled outcomes.

## What happened

The expanded 24-test suite and browser checks verified data parsing, source-count reconciliation, combined queries, sorting, missing-value behavior and allocation handling. Approved amounts are allocated by RFI/CO links rather than repeating the entire CO cost for every associated RFI. Review also found source duration/date differences and four small CO allocation discrepancies; these remain explicitly labeled without changing source values. The dataset is historical: it contains closed and void/withdrawn records, with no unresolved RFIs.

**Participant findings: not yet measured.** The paired study will ask participants to find RFIs by category/discipline and reviewer, locate recorded cost estimates, and distinguish allocated RFI amounts from shared CO totals. The application includes a local timer, observer-entered accuracy and downloadable trial records. Actual participant counts, elapsed times, accuracy and observations must be added after testing.

## Relation to the thesis

Our thesis hypothesizes that AI-assisted impact assessment could help GCs identify high-cost-risk RFIs earlier and reduce RFI-related costs by 10% or more. This first stage evaluates information organization and retrieval as a prerequisite. It runs no LLM, predicts no risk and does not establish cost reduction. Source contractor priority is a pre-existing indicator; outcome-derived ground-truth labels are excluded from dashboard ranking. Because the dataset is synthetic and its category effects were built in, findings must be interpreted within that constraint and later validated with real project data.
