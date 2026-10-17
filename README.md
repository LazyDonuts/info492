# INFO 492 · Team 1

**Prioritizing High-Risk RFIs with AI** — Sandra Zhu, Micah Santos and Iker Zhang.
The team takes the General Contractor perspective. The research website and working Demo 1 use the existing blue/white design, DM Sans and Manrope.

## Run locally

No application dependencies, backend, API keys or compilation are needed. Serve the repository over HTTP (opening the HTML as `file://` will not load CSVs):

```sh
python3 -m http.server 4920 --bind 127.0.0.1
```

- Team site: http://127.0.0.1:4920/
- Dashboard: http://127.0.0.1:4920/dashboard.html
- Published dashboard: https://lazydonuts.github.io/info492/dashboard.html

The homepage navigation and Demo 1 card link to the dashboard. The original six-request prioritization concept remains on the research homepage; it is separate from Demo 1.

## Demo 1 — Structured RFI Dashboard

The dashboard loads **all 1,370 supplied synthetic RFIs** and related CSV tables. It provides:

- Summary cards computed from loaded records; final-response average with its denominator
- Combined case-insensitive ID/text search, status, category, discipline, reviewer, package and cost-evidence filters
- Active filter chips, clear-all action, clickable contract-package distribution
- Numeric/chronological sorting, sortable column headers and 25/50/100-row pagination
- Responsive, horizontally scrollable register; keyboard-accessible record buttons
- Detail drawer with descriptions, routing, dates, estimates, schedule effects, linked CO allocations and source fields
- Plain-list comparison using the same data and detail view, without dashboard filtering or visual summaries
- Local task timer, observer-entered accuracy, retained trials and CSV export
- Loading/retry, no-match, empty-source, missing-field and optional-file warning states

**Demo 1 runs no LLM and generates no AI risk scores or priority predictions.** Contractor priority is the original source flag. Outcome-derived ground truth is labeled and excluded from search/ranking. The thesis's 10% cost reduction is a hypothesis, not a measured result.

## Data

The workbook was found through the team's Google Doc, in its **Data** subtab:
[ST_EastLink_DRLE_RFI_synthetic_dataset](https://docs.google.com/spreadsheets/d/1sWFj-zqr8wGRHExviHd2x6bNJXIBJ2_9oCucBc8K4XY/edit).
A source snapshot is retained in `data/source/`. CSV files contain original source fields and values (dates serialized to ISO); no status, trade or reviewer enrichment was generated.

The RFIs, COs, amounts, dates and outcomes are **synthetic**, modeled around Sound Transit's East Link and Downtown Redmond Link projects. They are not official Sound Transit RFI records. Contract anchors are as described by the workbook, not independently reverified by this application.

- 1,370 RFIs, 328 COs, 328 outcomes, 399 RFI/CO links, seven packages
- 1,327 closed RFIs, 43 void/withdrawn, no unresolved RFIs in this historical snapshot
- The dictionary marks estimates as unavailable at submission despite calling them “early”; Demo 1 follows its N flag
- Responsible party maps to `assigned_reviewer`, never to `contractor` or `submitted_by`
- Cost allocations use `RFI_CO_Link`, not repeated whole-CO totals

See [data mapping, timing and caveats](docs/DATA.md). The team's original generation prompt and workbook methodology are referenced there. **The original random-data generation program was not provided**; `scripts/import-workbook.py` is only an export/conversion script, not a generator.

### Refresh the supplied data

Export the Google Sheets workbook as `.xlsx` and put it at:
`data/source/ST_EastLink_DRLE_RFI_synthetic_dataset.xlsx`.
Then, using Python with `openpyxl` installed, run:

```sh
python3 -m pip install -r scripts/requirements-data.txt
python3 scripts/import-workbook.py
```

Alternatively, replace `data/rfis.csv`, `data/contracts.csv`, `data/change_orders.csv`, `data/change_order_outcomes.csv`, `data/rfi_change_order_link.csv` and `data/data_dictionary.csv` with CSVs using the documented columns. RFIs are required; failed optional tables produce explicit data warnings. Changed schemas require an explicit mapping update. Other file formats or arbitrary live Sheets URLs are not parsed in the browser.

## Checks and static production deployment

Node.js 18+ is required only for developer checks. No `npm install` is needed:

```sh
npm test
npm run build
```

`build` validates CSVs and all local HTML references. This is a static site, so it does not emit a bundle: the repository files are the production artifacts. Keep HTML, CSS, JS and `data/` together. GitHub Pages uses **`gh-page` / root**; pushing only `main` does not publish changes. Update the publication branch too and verify its Pages deployment succeeds. Increment asset version query strings after CSS/JS changes to avoid stale caches.

## Assignment materials

- [Walkthrough, paired retrieval-test plan and actual-results template](docs/TESTING.md)
- [Demo Note draft, under 500 words](docs/DEMO-NOTE.md)
- [Individual contribution statement templates](docs/CONTRIBUTIONS.md)
- [Implementation request](docs/IMPLEMENTATION-PROMPT.md)
- [Comprehensive review and remaining submission work](docs/QA-REPORT.md)

Browser trial results remain on the current device's localStorage. Nothing is sent to a server. Use participant codes rather than names, and download results after testing. Export before removing a trial; removal has no built-in undo; the UI does not fabricate outcomes or auto-score answers.

## Code organization

- `index.html`, `css/style.css`, `js/main.js`: original research site and illustrative concept
- `dashboard.html`, `css/dashboard.css`: dedicated Demo 1 application and styles
- `js/rfi-data.js`: CSV parsing, normalized read-only model, joins, summaries, search/filter/sort
- `js/dashboard.js`: presentation, accessible controls, detail view and local testing mode
- `data/`: original-column CSVs and workbook source snapshot
- `scripts/import-workbook.py`: repeatable workbook-to-CSV conversion
- `tests/rfi-data.test.js`: parsing, actual-data reconciliation, missing fields and allocation tests

A future AI module can consume an explicit submission-only field whitelist from the data model; it must not use the retrospective fields or ground-truth labels as predictions.

## Demo 2 AI RFI Prioritization Agent

The header now uses **Demo Menu** on the homepage and both demos. Demo 1 remains at `dashboard.html`; Demo 2 is `demo2.html`. Future demos are disabled Coming soon entries. Demo 1's source data, dashboard logic, task study and styles are unchanged.

```sh
npm test
npm run build
npm start
```

Open http://127.0.0.1:4922/demo2.html. Select ten synthetic development RFIs using search/checkboxes or a reproducible seed, or import ten UTF-8 CSV/JSON records (file upload or pasted text). Review the exact submission-only payload. A server-side OpenAI provider connection must be configured before analysis; without it the UI explicitly reports unavailable and does not fake results.

See [secure local/hosted setup and retention](docs/DEMO2-SETUP.md), [original v0.3 rubric](docs/RFI-PRIORITY-CRITERIA-v0.3.md), [methodology page](methodology.html), [prompt configuration](docs/DEMO2-PROMPT.md), and [implementation/QA status](docs/DEMO2-IMPLEMENTATION.md). The static Pages deployment is preserved; a separate HTTPS Node service and secrets are needed for online model calls. No hosted API or provider key was available for live verification.

Evidence extraction uses structured JSON with exact source-quote checks; a deterministic rule engine maps the team rubric to P0/P1/P2, Needs Information and exclusion states. Errors never count as valid abstentions. Ranked results use P0/P1/P2 then supported decision date, submission date and ID; the optional within-tier ID inspection view is explicitly labeled and does not change assessments. Detail views preserve the search/filter state.

Evaluation mode freezes the set, model/prompt/rubric/implementation hashes and prospective threshold. Run twice with the same stateless agent, then the fixed keyword baseline. Import the prepared human answer key only afterward, locally. Inspect each run's cases to record observer failure groups and role-boundary violations separately; incomplete reviews are labeled incomplete. Export privately before leaving (tab-memory only). `/eval` contains honest NOT RUN templates; no real human reference, scores or savings have been fabricated.


### Gemini free-tier development deployment

The live Demo 2 selects Google Gemini (`AI_PROVIDER=gemini`, model `gemini-3.1-flash-lite`) with a server-only `GEMINI_API_KEY`. The team v0.3 rubric and original Demo 1 are unchanged. The adapter uses stateless structured output, exact-source validation, one item at a time and conservative spacing. Free quota and data-use terms apply; use a free API project and synthetic cases for this pilot. No automatic provider fallback, billing upgrade or fake output. See the active-provider section of [setup](docs/DEMO2-SETUP.md). Tests include Gemini payload, keys, completion/safety handling, quota stopping and frozen model configuration.


Development mode now displays provisional working P0/P1/P2 for incomplete cases, with independent missing-information/AI-failure flags. Confirmed v0.3 assessments are retained. Input-rule suggestions for failed AI responses are explicitly labeled; no invalid model output becomes evidence. Frozen evaluation/scoring stays on v0.3. See [working priority v0.4](docs/DEMO2-WORKING-PRIORITY.md).
