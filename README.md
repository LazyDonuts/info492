# INFO 492 · Team 1

**Prioritizing High-Risk RFIs with AI** — Sandra Zhu, Micah Santos and Iker Zhang.
The team takes the General Contractor perspective. The research website and working Demo 1 use the existing blue/white design, DM Sans and Manrope.

## Mid-quarter submission: repository table of contents

This index covers **code, data, LLM prompts used, and dependencies for Demo 1 and Demo 2**. The current Demo 2 target is at least **70% agreement with a team-developed ten-case answer key**. The earlier 10% cost-reduction target remains historical motivation, not a measured outcome. Historical specifications and homepage copy may retain that earlier wording.

| Area | Demo 1 — Structured RFI Dashboard | Demo 2 — AI RFI Prioritization Agent |
| --- | --- | --- |
| Live application | [Dashboard](https://lazydonuts.github.io/info492/dashboard.html) | [AI agent](https://lazydonuts.github.io/info492/demo2.html) |
| Interface code | [dashboard.html](dashboard.html), [dashboard.js](js/dashboard.js), [dashboard.css](css/dashboard.css) | [demo2.html](demo2.html), [demo2.js](js/demo2.js), [demo2.css](css/demo2.css) |
| Data and decision logic | [rfi-data.js](js/rfi-data.js): CSV parsing, joins, filters, sorting and summaries | [demo2-core.js](js/demo2-core.js): input whitelist, evidence rules, working priorities and scoring; [demo2-recovery.js](js/demo2-recovery.js): recovery and retry merging |
| Backend | None; static browser application | [index.js](server/index.js): HTTP API and access controls; [agent.js](server/agent.js): provider calls; [extraction.js](server/extraction.js): prompt, schema and evidence validation; [public-demo.js](server/public-demo.js): shared limits |
| Data | [RFIs](data/rfis.csv), [contracts](data/contracts.csv), [change orders](data/change_orders.csv), [outcomes](data/change_order_outcomes.csv), [RFI/CO links](data/rfi_change_order_link.csv), [dictionary](data/data_dictionary.csv) | Submission-only projection of the synthetic dataset or user-supplied CSV/JSON; [synthetic upload template](data/demo2-upload-template.json). Retrospective outcomes and reference labels are excluded from model input. |
| Provenance and conversion | [Data guide and generation prompt](docs/DATA.md), [source workbook](data/source/ST_EastLink_DRLE_RFI_synthetic_dataset.xlsx), [source README](data/source/README-from-workbook.txt), [import script](scripts/import-workbook.py) | [Input and evaluation requirements](docs/DEMO2-DEVELOPMENT-SPEC.md), [priority rubric](docs/RFI-PRIORITY-CRITERIA-v0.3.md), [working-triage policy](docs/DEMO2-WORKING-PRIORITY.md) |
| AI development instructions | [Original Demo 1 implementation request](docs/IMPLEMENTATION-PROMPT.md) | [Demo 2 development specification](docs/DEMO2-DEVELOPMENT-SPEC.md) |
| Runtime LLM prompt | None: Demo 1 does not call an LLM | [extractionPrompt and EXTRACTION_SCHEMA](server/extraction.js), with the full [v0.3 rubric](docs/RFI-PRIORITY-CRITERIA-v0.3.md) appended; [prompt configuration notes](docs/DEMO2-PROMPT.md) |
| Tests and evaluation | [Data/dashboard tests](tests/rfi-data.test.js), [retrieval-test protocol](docs/TESTING.md), [QA report](docs/QA-REPORT.md), [Demo Note](docs/DEMO-NOTE.md) | [Automated tests](tests/), [evaluation protocol](eval/evaluation_protocol.md), [implemented keyword baseline](eval/baseline_rule.md), [team test write-up](eval/writeup.md), [implementation history](docs/DEMO2-IMPLEMENTATION.md) |
| Dependencies and setup | Browser; Python 3 for the optional local static server; [openpyxl requirement](scripts/requirements-data.txt) only for workbook conversion | Node.js 18+ as declared in [package.json](package.json), provider API access, server-side credentials; [.env.example](.env.example), [setup guide](docs/DEMO2-SETUP.md), [Render template](render.yaml) |

### LLM use and prompt provenance

- **Data synthesis:** the team reports using Claude to synthesize the dataset. The supplied generation prompt is reproduced in [DATA.md](docs/DATA.md). The original generator program and complete generation conversation are not included.
- **Research:** Perplexity supported research into priority criteria. The resulting team rubric is committed; a complete verbatim Perplexity prompt/conversation archive is not included.
- **Development:** Codex assisted implementation and testing. The preserved Demo 1 implementation request and Demo 2 specification are linked above; they are not a complete archive of every development conversation.
- **Runtime assessment:** Gemini extracts evidence; application code assigns priorities. The committed extraction prompt version is **extract-1.2**. Each user message contains the JSON representation of one whitelisted submission record. The schema, full appended rubric, provider adapter and configuration hashes make the runtime inputs inspectable. Do not infer the configuration used for an older evaluation from today's source alone; use that run's exported metadata.

### Dependencies and external services

The JavaScript application uses native browser APIs and Node built-ins; `package.json` declares no third-party npm dependencies. Node is required for Demo 2 and automated checks, but not for viewing Demo 1 on a static host. Python plus `openpyxl>=3.1,<4` is needed only to reconvert the workbook. `npm run start:env` additionally requires a Node release supporting `--env-file` (the deployment used Node 24); on other supported Node versions, set environment variables before `npm start`.

The published prototype uses GitHub Pages for the frontend and Render for its backend. Its configured provider during the documented Demo 2 development was Google Gemini, model `gemini-3.1-flash-lite`. The code retains an explicitly selected OpenAI adapter; it is not an automatic fallback. Provider keys and team tokens must stay outside Git and frontend assets. Fonts are loaded through Google Fonts; see the page stylesheets for the presentation-only external font dependency.

### Results and submission boundaries

The [team evaluation write-up](eval/writeup.md) reports **3/10 for each AI run and 7/10 for a simple cost-based comparison**, below the AI target of 7/10. The cost-based classroom comparison is distinct from the application's documented keyword baseline. The [answer-key CSV](eval/answer_key.csv) is a header-only template and the [evaluation report](eval/evaluation_report.md) is an unfilled template; neither is a completed evidence file. The committed write-up does not contain the full case-level run exports needed to independently reconstruct the scores. Software regression passes are not classification-accuracy measurements.

This index completes the code/data/prompts/dependencies portion of the mid-quarter repository requirement. Practitioner interview transcripts and the LLM summary of class feedback are separate team deliverables and are not represented here as completed submissions.

## Run locally

For the research homepage and Demo 1, no backend, API keys or compilation are needed. Serve the repository over HTTP (opening the HTML as `file://` will not load CSVs):

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

Node.js 18+ is required for developer checks and the Demo 2 backend. No `npm install` is needed:

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

Demo 1 browser trial results remain on the current device's localStorage. Demo 1 sends no trial results to a server; Demo 2 sends explicitly approved RFI inputs to its backend and configured model provider. Use participant codes rather than names, and download results after testing. Export before removing a trial; removal has no built-in undo; the UI does not fabricate outcomes or auto-score answers.

## Code organization

- `index.html`, `css/style.css`, `js/main.js`: original research site and illustrative concept
- `dashboard.html`, `css/dashboard.css`: dedicated Demo 1 application and styles
- `js/rfi-data.js`: CSV parsing, normalized read-only model, joins, summaries, search/filter/sort
- `js/dashboard.js`: presentation, accessible controls, detail view and local testing mode
- `data/`: original-column CSVs and workbook source snapshot
- `scripts/import-workbook.py`: repeatable workbook-to-CSV conversion
- `tests/rfi-data.test.js`: parsing, actual-data reconciliation, missing fields and allocation tests

Demo 2 consumes an explicit submission-only field whitelist; retrospective fields and ground-truth labels are excluded from its model input.

## Demo 2 AI RFI Prioritization Agent

The header now uses **Demo Menu** on the homepage and both demos. Demo 1 remains at `dashboard.html`; Demo 2 is `demo2.html`. Future demos are disabled Coming soon entries. Demo 1's source data, dashboard logic, task study and styles are unchanged.

```sh
npm test
npm run build
npm start
```

Open http://127.0.0.1:4922/demo2.html. Select 2–10 synthetic development RFIs using search/checkboxes (the random selector selects ten), or import 2–10 UTF-8 CSV/JSON records (file upload or pasted text). Formal evaluation uses exactly ten cases. Review the exact submission-only payload. A server-side Gemini or explicitly selected OpenAI provider connection must be configured before analysis; without it the UI explicitly reports unavailable and does not fake results.

See [secure local/hosted setup and retention](docs/DEMO2-SETUP.md), [original v0.3 rubric](docs/RFI-PRIORITY-CRITERIA-v0.3.md), [methodology page](methodology.html), [prompt configuration](docs/DEMO2-PROMPT.md), and [implementation/QA status](docs/DEMO2-IMPLEMENTATION.md). The static Pages deployment is preserved; a separate HTTPS Node service and secrets are needed for online model calls. The documented hosted integration uses Render and Gemini; historical setup notes record the earlier credential and provider-selection stages.

Evidence extraction uses structured JSON with exact source-quote checks; a deterministic rule engine maps the team rubric to P0/P1/P2, Needs Information and exclusion states. Errors never count as valid abstentions. Ranked results use P0/P1/P2 then supported decision date, submission date and ID; the optional within-tier ID inspection view is explicitly labeled and does not change assessments. Detail views preserve the search/filter state.

Evaluation mode freezes the set, model/prompt/rubric/implementation hashes and prospective threshold. Run twice with the same stateless agent, then the fixed keyword baseline. Import the prepared human answer key only afterward, locally. Inspect each run's cases to record observer failure groups and role-boundary violations separately; incomplete reviews are labeled incomplete. Export privately before leaving (tab-memory only). `/eval` retains NOT RUN templates alongside the later team-reported results in `eval/writeup.md`; distinguish the templates from that report. Development recovery retains completed work in the same tab for up to 24 hours; export before closing. Evaluation studies still require explicit export.


### Gemini free-tier development deployment

The live Demo 2 selects Google Gemini (`AI_PROVIDER=gemini`, model `gemini-3.1-flash-lite`) with a server-only `GEMINI_API_KEY`. The team v0.3 rubric and original Demo 1 are unchanged. The adapter uses stateless structured output, exact-source validation, one item at a time and conservative spacing. Free quota and data-use terms apply; use a free API project and synthetic cases for this pilot. No automatic provider fallback, billing upgrade or fake output. See the active-provider section of [setup](docs/DEMO2-SETUP.md). Tests include Gemini payload, keys, completion/safety handling, quota stopping and frozen model configuration.


Development mode now displays provisional working P0/P1/P2 for incomplete cases, with independent missing-information/AI-failure flags. Confirmed v0.3 assessments are retained. Input-rule suggestions for failed AI responses are explicitly labeled; no invalid model output becomes evidence. Evaluation can freeze v0.3 or working-triage-0.4 before running; human reference labels must match the chosen policy, and processing errors remain failures. See [working priority v0.4](docs/DEMO2-WORKING-PRIORITY.md).

## Demo 3 — Daily RFI To-Do framework

Open [Daily To-Do](demo3.html) after a Demo 2 development run and choose **Send to Daily To-Do**. Add, reorder, snooze and review tasks; select 2–10 tasks to bring their packets back into the existing Demo 2 API workflow. Updated assessments preserve personal planning decisions.

- [Workflow, limitations and validation](docs/DEMO3.md)
- [Page](demo3.html) · [Styles](css/demo3.css) · [UI](js/demo3.js) · [Shared handoff / board logic](js/demo3-core.js) · [Tests](tests/demo3-core.test.js)
- Uses the current Demo 2 backend and data contract, with no new runtime package dependencies.
- Initial local-browser prototype only: no authenticated roles, team sync or automatic source-RFI updates. Illustrative examples are labeled and do not call the model.
