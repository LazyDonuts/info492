# Demo 2 implementation and acceptance status

Implementation October 16–17, 2026; final regression checks October 17 (local project date). The repository was clean at start. The branch was fast-forwarded from `3c45fa9` to `origin/main` `ed27413` to preserve new team DATA.md and cost-ranking specification documentation. No new ranking feature was added to Demo 1. No push/deployment was performed.

## Completed code

- Accessible disclosure navigation on homepage, Demo 1 and Demo 2: mouse hover, click/tap, native Enter/Space, ArrowUp/Down/Home/End, Escape, outside click, focus-out, active links; disabled future entries. Direct dashboard URL preserved.
- Dedicated light-theme agent with dataset search/selection, reproducible random seed, exact-ten UTF-8 CSV/JSON import, visible aliases, strict unknown/outcome-field rejection, pasted text alternative, original-source preview and explicit transmission confirmation.
- Server-only OpenAI Responses adapter, constrained JSON schema, one stateless request/item, two concurrent items and streamed item events. Model must be configured explicitly. No provider key in client code and no fallback pseudo-AI output.
- Frozen original rubric plus testable per-mechanism engine; structured evidence, exact excerpts and locations, contradiction checks, separate safety/expedited flags, deterministic rank, clearly unranked abstentions/exclusions/errors and full detail drawer.
- Counts reconcile to all ten records, including failed items. Search, queue filters, default rubric ordering, optional within-tier ID inspection sorting, CSV exports. Normal and evaluation exports identify execution mode and run metadata. A model quote can still be semantically wrong; exact-text checking does not constitute professional verification.
- Evaluation snapshot lock, model/prompt/schema/rubric/implementation hashes, AI run1/run2 kept separately, fixed keyword baseline, late local-only human key import, exact scores plus P0 diagnostics, memory-only observer reviews, separate boundary-violation counts with review-completeness disclosure, full JSON/raw output and CSV export. No key or observer data enters model requests.
- Candidate reference/report/protocol/baseline templates under `/eval`, with pending fields. Documentation explicitly distinguishes synthetic development, user-declared real provenance and instructor-permitted synthetic alternatives.

## External blockers

**Live provider validation is NOT complete.** OPENAI_API_KEY, OPENAI_MODEL and a team token are not configured in the environment. Set them privately as documented. The backend returns explicit configuration/503 errors; the Analyze button remains disabled when unconfigured. Unit and browser transport fixtures never establish a real model call.

**Public AI endpoint is NOT deployed.** GitHub Pages cannot run the Node service. Deploy one HTTPS Node instance with secret environment configuration and CORS allowlist, then enter its origin in Demo 2. No new infrastructure account, paid plan, provider entitlement or secret was assumed. Memory-based limits are pilot controls, not durable/distributed billing caps.

**Formal course evaluation is NOT run.** Ten real submission packets (or explicit synthetic permission), two independent humans and adjudication, threshold approval and team freeze remain outstanding. Existing synthetic source labels are not used as an answer key. GC validation and actual savings remain unmeasured. The spec's deadline should be confirmed in Canvas.

## Automated checks

Commands actually executed: `npm test`, `npm run build`, `node --check` for the new browser/server entrypoints, `git diff --check`. The static validator checks all four HTML pages and their local assets/links and still reconciles 1,370 source RFIs.

Final automated result: **50 tests passed, 0 failed** (including the original 24 Demo 1 tests and menu component tests). Coverage includes prior Demo 1 dataset/filter/join tests; all 729 U/A/M/X/D/B combinations; normative critical/protection/unknown/Low/contradiction/multiple-mechanism/scope/safety branches; CSV/JSON parsing and schema/ID/size validation; submission-only projection; exact citation/schema validation; legitimate short contradiction excerpts versus invalid flag-only cost evidence; prevention of fabricated deadline dates; deterministic sorting; scoring and formula-safe exports; mocked real-adapter request shape; partial provider failure, quota, missing config, config changes, key leakage protection; HTTP auth/CORS/static allowlist; rate limits; request-size limits and simultaneous-batch race prevention.

The provider transport in integration tests is mocked and explicitly named. There is no configured lint/type-check tool in the original plain-JavaScript repository; no unsupported claim of lint or TypeScript passes.

## Browser checks performed

Chrome: navigation trigger/ArrowDown and Demo 1 link; original dashboard loaded 1,370 rows; dataset random selection and exact payload; unavailable state; duplicate pasted JSON rejected; explicit transport-fixture result queues and counts; B-Unknown drawer, Escape/focus restoration; input/config freeze; two same-set runs, fixed baseline and local reference scoring. A real file chooser attempt hit the extension file-URL permission requirement. Chrome subsequently became unavailable during export checking; final checks continued in the in-app Chromium browser.

In-app Chromium: actual JSON file import; same fixture input through request/stream/rules/results; CSV result download; both AI transport runs and baseline; local human-key JSON file import after runs; full study JSON and score CSV downloaded; reference inputs locked afterward. Fixture outputs are prominently labeled NO AI MODEL CALL in connection/results/evaluation and exports; fixture grades are software QA only, not reported research results.

Final regression also verified Demo 1 search for E320-RFI-0001 (one match), its full detail drawer, reset, and package E320 (150 matches). Observer failure-group/notes/review status persisted in the downloaded study JSON; an incomplete one-of-ten review remained explicitly incomplete.

Responsive results view at widths **320, 390, 768, 1024, 1440** had document width equal to viewport width. Result tables scroll inside their own panel. A mobile overflow from an absolute screen-reader label was found and fixed by anchoring it to the table button. At 390px the dropdown stayed inside the viewport. Actual phone hardware, Safari, Firefox and screen-reader speech were not tested. Physical hover/touch interaction should still be reviewed on real devices; the app implements mouse pointer handling and ordinary tap/click buttons.

## File inventory

Existing files modified: `.gitignore`, `index.html`, `dashboard.html`, `package.json`, `scripts/validate-site.js`, `README.md`.

New UI: `demo2.html`, `methodology.html`, `css/demo-menu.css`, `css/demo2.css`, `js/demo-menu.js`, `js/demo2-core.js`, `js/demo2.js`.

New backend: `server/index.js`, `server/agent.js`, `server/extraction.js`, `.env.example`, `render.yaml`. Public endpoint-only configuration: `data/demo2-config.json`.

New research/setup: `docs/RFI-PRIORITY-CRITERIA-v0.3.md`, `docs/DEMO2-DEVELOPMENT-SPEC.md`, `docs/DEMO2-SETUP.md`, `docs/DEMO2-PROMPT.md`, this report.

New evaluation: `eval/answer_key.csv`, `eval/rubric_frozen.md`, `eval/baseline_rule.md`, `eval/evaluation_protocol.md`, `eval/evaluation_report.md`. No run-results files are fabricated.

New input sample: `data/demo2-upload-template.json` (ten explicitly invented placeholders, not measured outcomes).

New tests: `tests/demo-menu.test.js`, `tests/demo2-core.test.js`, `tests/demo2-server.test.js`, `tests/demo2-fixtures.js`, `tests/fixture-server.js`. The latter is a local test-only server; it is never loaded by production. Run `node tests/fixture-server.js` for explicit transport QA at port 4923; it writes only invented /tmp fixture packets/key and displays no-real-AI labels. The ordinary `npm start` path never injects it.

## October 17 deployment preparation

User authorized live integration and publication separately from formal evaluation. Added a Render free-service Blueprint, public origin-only frontend configuration, 75-second cold-start connection check and tested Render same-origin CORS handling. Real provider credentials and a connected Render workspace are still required. Publication state is tracked in docs/DEMO2-DEPLOYMENT.md.
