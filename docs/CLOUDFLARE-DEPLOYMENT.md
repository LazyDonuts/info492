# Cloudflare Workers deployment (replaces Render)

The Node server (`server/index.js`) is unchanged and still used for `npm start` and the existing tests.
`worker/index.js` is a second entry point with identical routes, status codes, messages and headers.

- `worker/budgets.js` / `worker/limits.js`: the former in-memory limits (15 attempts/hour/IP, 20 batches/hour,
  one active batch, public demo allowance, Jev per-IP limits), now persisted in one Durable Object so every
  Worker isolate shares them. A batch slot self-releases after 12 minutes if an invocation is killed.
- `scripts/build-worker.js`: copies the public files to `dist/` and embeds the rubric and implementation
  sources in `worker/sources.js` so `implementation_hash` is computed from the same bytes as under Node.
- `scripts/apply-agent-patch.js`: one-time edit to `server/agent.js` so it accepts `sourceTexts`.
  Changing `agent.js` changes `implementation_hash` (and `config_hash`) once, for both Node and Worker.
  Start a new study after deploying if one was frozen.

Free-plan limits: 100,000 requests/day, 10 ms CPU per request (network waits do not count),
50 outbound subrequests per request. If the dashboard shows "Exceeded CPU Time Limits" (Error 1102),
the options are the paid plan or reducing per-request work.

Known deliberate differences: `signin.html` is now served (Render's allowlist omitted it), the public-allowance
`counter_scope` label reads `single_durable_object_persisted`, and a client disconnect may cancel batch items
not yet started (Workers allow ~30 s of background work after a client leaves).

Smoke test: `node scripts/smoke-test.mjs https://<worker-url> [--batch]`
