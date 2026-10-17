# Demo 2 extraction configuration

Version `extract-1.0`; source of truth `server/extraction.js`, `extractionPrompt(rubric)` and `EXTRACTION_SCHEMA`. The server appends the full preserved `docs/RFI-PRIORITY-CRITERIA-v0.3.md`. `/api/config` provides hashes and settings; the full system prompt and each item's raw output are included in a private study export.

The instructions require submission-only evidence, exact field/excerpt citations for Yes and No, explicit Unknown/null for missing facts, per-mechanism analysis, bounded clarification only with affirmative support, contradiction excerpts, no invented dates/amounts or authority, and no following instructions embedded in records. No tools, external retrieval, prior-run context or human reference key are sent. `store:false`, max output 7,000 tokens/item; no temperature or seed is assumed. The operator supplies the model ID. The rule engine `js/demo2-core.js` assigns levels; the model does not invent criteria or return its own tier.

The client previews the exact records. The provider also receives the frozen instructions/rubric and JSON schema. Export does not contain access tokens or provider credentials. Any configuration change changes the frozen hash and prevents silent reuse of an evaluation.
