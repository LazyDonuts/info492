# Demo 2 setup and data handling

## Active Gemini configuration (October 17)

The live deployment now explicitly selects `AI_PROVIDER=gemini`, `GEMINI_MODEL=gemini-3.1-flash-lite`, private `GEMINI_API_KEY`, and `GEMINI_MIN_INTERVAL_MS=13000`. Existing OpenAI support is optional and never a fallback: it runs only if the operator explicitly selects `AI_PROVIDER=openai`. A provider/model/config change invalidates the frozen evaluation configuration. Configure only the chosen provider's key/model plus the team token. Missing settings are reported individually.

Gemini uses the server-side REST generateContent endpoint with `x-goog-api-key` in a header, one fresh submission-only content message, a system instruction, JSON Schema, max 7000 output tokens and provider-default thinking for 3.1 Flash-Lite. No chat history, tools, caching or stateful Interactions API is used. Local exact-evidence and rubric validation still applies. Gemini STOP is required; safety blocks, truncation, invalid JSON/citations and provider errors remain processing errors. Response IDs, actual model version and usage metadata are retained in private exports. Gemini starts at most one request at a time, spaced at least 13 seconds apart. This is conservative pacing, not a guarantee of sufficient account quota. The browser allows ten minutes for the batch; each provider item retains a 45-second timeout. Any 429 stops unstarted requests with an explicit error, with no automatic retry or paid fallback.

**Free-tier account and data handling:** Google documents free input/output for selected models including 3.1 Flash-Lite, but actual eligibility and limits belong to the API project. Keep the project on the Free tier; do not enable Cloud Billing for a free-only pilot. Code cannot guarantee that an operator-supplied key belongs to a free project. Free-tier prompts/outputs may be used to improve Google products. Use synthetic development data; obtain appropriate permission and review terms before sending real correspondence. Stateless requests do not promise zero provider retention. See [pricing](https://ai.google.dev/gemini-api/docs/pricing), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [REST reference](https://ai.google.dev/api/generate-content), and [data terms](https://ai.google.dev/gemini-api/terms).

Create a private key at https://aistudio.google.com/api-keys and enter `GEMINI_API_KEY` in the existing Render service Environment page. Never paste it in the site's team-token field or commit it. The instructions below retain optional OpenAI details for that explicit provider path.

The existing static site stays on GitHub Pages. `demo2.html` calls a separate small Node.js service; no framework migration or public provider secret is needed. The same service can serve the site for local development. Node 20+ is recommended (18+ supports the core code; `--env-file` needs a newer Node). No npm packages are required.

## Local startup

```sh
cp .env.example .env
# Edit .env privately: AI_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL, DEMO2_ACCESS_TOKEN
# Generate a random token, for example: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run start:env
```

Open http://127.0.0.1:4922/demo2.html. Without `.env`, `npm start` still serves the site and reports AI unconfigured. Never paste a provider key into the browser. Enter only the privately distributed team access token. The token gates a team pilot, not anonymous public AI access. By default, it is remembered in browser localStorage for this backend and filled automatically on later visits. Uncheck “Remember token on this browser” to keep it tab-only, or use “Clear saved token” to remove it. It is never included in URLs or exports. Provider API keys remain server-only.

Choose a model available to your OpenAI project that supports the Responses API and strict JSON schema; set OPENAI_MODEL explicitly. No assumed model availability, free credits or provider-account entitlement. The app records the model and prompt/schema/rubric/engine hashes. No live call was verified during initial implementation because credentials were not supplied. Unit/integration mocks are tests only, not measured AI results.

## Hosted service for GitHub Pages

Use a single Node service on your chosen host (e.g. a private team-operated Node deployment). Start command: `node server/index.js`. Set HOST=0.0.0.0 and the host-supplied PORT. Terminate TLS at the host. Store OPENAI_API_KEY, OPENAI_MODEL and a random DEMO2_ACCESS_TOKEN in its secret manager. ALLOWED_ORIGINS is a comma-separated exact origin list; include `https://lazydonuts.github.io` (origin has no /info492 path). Serve the backend over HTTPS. In Demo 2 connection settings, enter only that backend origin and the team access token, then Check connection. This URL is not stored across page reloads.

No infrastructure was deployed by this implementation. Do not upload `.env` to GitHub Pages, add it to a commit, expose it in logs, or put it in public configuration. `.gitignore` protects common local env paths but is not a substitute for checking commits. Frontend static deployment continues to use the current `gh-page` branch/root; merge/publish separately when ready.

## Cost and access controls

The endpoint requires a bearer team token of at least 32 characters, exact CORS allowlist, 256 KB request cap, exactly 10 records, strict submission-only fields, two concurrent item calls and one active batch. Each item has a 45-second timeout; no automatic provider retry. Global budget is 20 submitted batches/hour/process (up to 200 item requests), plus 15 attempts/hour per network peer. Even invalid/failed batches can consume budget. Team members sharing a NAT may share the per-peer limit.

Counters are in memory and reset on process restart. Deploy one replica for this pilot; do not claim a distributed or durable billing limit. Behind a reverse proxy, socket addresses may be shared, intentionally conservative; untrusted X-Forwarded-For is not trusted. Before broader/public use, add host-level authentication, durable global quotas and provider-side project spend limits. A leaked team token must be rotated. CORS alone is not authentication.

## Data contract and privacy

Accepted formats: UTF-8 CSV/JSON, exactly ten records, max 256 KB. JSON is an array or `{ "records": [...] }`. Required `rfi_id`, `title` (alias `subject`), `description` (alias `question`, minimum 20 characters); optional fields are enumerated in `js/demo2-core.js`. `id` maps to `rfi_id`; `evidence_text` maps to `supporting_text`. Alias collisions and unknown columns are rejected. Nested attachment objects are unsupported: provide actual excerpts in supporting_text and source labels within the text. PDF, Word, XLSX and arbitrary remote-document URLs are not parsed. Narrative length does not prove adequacy; the agent may still abstain.

Dataset selection explicitly projects only dictionary-approved submission-time fields. It excludes actual status, outcomes, estimates marked N, CO data and ground-truth tiers. These historical synthetic records are assessed as submission-time questions, not as a live open-status feed. Uploaded date/work context must belong to the declared snapshot. The server also rejects unknown input keys; a reference answer cannot be included as a separate field. Human review is still needed to prevent future/outcome text being pasted into an allowed narrative field.

Consent beside the exact payload is required before sending. Text is sent to the configured team backend, then its explicitly selected provider (Google Gemini on the live deployment). The backend logs no packet bodies or tokens and writes no uploaded files. It holds requests/results in memory; OpenAI responses use `store:false`; both adapters use no tools, retrieval or conversation state. Google data terms apply to Gemini. This does not promise zero retention by the provider or hosting platform: verify account policies, host access logs, provider terms and permissions before using real correspondence. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). Browser results and human keys are transient tab memory; leaving loses them. Exported JSON includes full packets, prompt, raw responses and keys and should be stored privately. Do not commit confidential evaluation exports.

## Evidence and rule limitations

The model extracts one to six mechanisms with U/A/M/X/D/B, a bounded-clarification field, scope, contradiction excerpts and safety/expedited/date evidence. Strict schema validation plus exact-substring citation checks run server-side. A malformed, refused, unsupported or incomplete result is a processing error, never Needs Information. There is no generic model-output repair or keyword fallback.

Exact substring validation checks provenance, not semantic correctness. A model can quote real text but misinterpret negation, causal links or whether a hold is effective. Those errors require human evaluation. Generated mechanism descriptions/follow-up questions are attributed model reasoning; they are not independently verified costs. GC actions use a fixed non-authoritative coordination message, not an LLM-generated design response. Prompt injection is treated as untrusted text; this is mitigation, not a guarantee. See [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

`docs/RFI-PRIORITY-CRITERIA-v0.3.md` preserves the Google Doc text/version with citations; methodology.html renders it. Label mapping: High=P0, Medium=P1, Low=P2. No normative rule was replaced with weighted scores or keyword triage. The latter exists only as an explicitly weak evaluation comparator.

## Diagnostics and troubleshooting

- `/api/config` is public metadata only. It reports ready/unconfigured and frozen hashes without secrets.
- 401: wrong team token; operator checks private distribution.
- 403: origin not allowed; operator updates ALLOWED_ORIGINS.
- 409: frozen config differs; export the previous study and start a new one.
- 413/415/400: check encoding, size, schema and exact count; inputs stay selected.
- 429: local quota/concurrency or provider quota. Export failed outputs; follow the precommitted retry policy.
- No completed output, refusal, timeout, invalid evidence: explicit per-item processing errors. Good items are retained and counts reconcile. A disconnected client does not necessarily cancel requests already running; backend concurrency/budgets still apply. Avoid duplicate submission.
- On Pages without a backend URL, AI remains unavailable. It never quietly simulates results.

## Observer diagnostics

After evaluation runs, use Inspect this run → View details to record a human observer's failure group, notes and role-boundary flag. Mark each case reviewed. Until all ten are checked, boundary review is labeled incomplete; an unreviewed record is not a clean safety result. Notes/reference data are never part of the API request. Full study JSON retains observer reviews; scores CSV separately reports observed boundary counts and review completeness.

Both file upload and pasted CSV/JSON use the same strict parser. A prepared human key can also be pasted as JSON, but only after all three runs. Normal result exports include execution mode, run ID and configuration hash, so development fixture outputs cannot be mistaken for a live-model evaluation.

## Render deployment prepared October 17

`render.yaml` defines a free Oregon Node web service with manual deploys, the existing test/build checks, and `/api/config` as the process health check (not proof of valid provider credentials). Supply OPENAI_API_KEY and OPENAI_MODEL privately; the Blueprint generates the team token. For initial development, `gpt-4.1-mini-2025-04-14` is a candidate Responses/structured-output model if available in the operator's API account. Actual availability, quota and output quality require a live call; this is not the formal evaluation freeze. See [official model capabilities](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

Free services sleep after 15 minutes idle and may take about a minute to wake. The connection check allows 75 seconds and reports its waiting state; click Check connection again after a host wake-up timeout. See [Render free service limits](https://render.com/docs/free) and [Blueprint reference](https://render.com/docs/blueprint-spec).

Once Render has assigned the actual HTTPS service URL, set `backend_origin` in `data/demo2-config.json` to that origin and republish Pages. This file is public: it contains the service URL only, never a key/token. Blank keeps same-origin local development working; users can manually enter an endpoint in Connection settings. The backend permits its own Render-provided RENDER_EXTERNAL_URL in addition to the explicit Pages origin. The team token remains private. Each browser needs it once; remembering is scoped to the backend origin, and can be disabled or cleared in Connection settings.

Publish the reviewed source to main and the static site to the existing gh-page branch, preserving both histories. Verify public demo2.html, assets, /api/config CORS and one authorized development batch of ten synthetic inputs. Never report that batch as the formal real-RFI evaluation. The Render service can also serve the complete site at its own origin.

Model discovery is available to the authenticated team operator at GET /api/models. It returns only supported model IDs; no credentials or raw provider body. An absent/inaccessible model and authentication errors stop unstarted items. Listing is metadata availability; a real generation call is still required to establish usability. ThinkingBudget=0 is sent only for Gemini 2.5 model IDs; later models use provider defaults, recorded in metadata.
