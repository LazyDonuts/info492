# Demo 2 publication and live-call checklist

Prepared October 17, 2026. Formal real-RFI evaluation is deferred by the team.

- Source target: LazyDonuts/info492 main.
- Website target: existing gh-page branch, repository root.
- Public route: https://lazydonuts.github.io/info492/demo2.html
- Render preparation: render.yaml, Node 24.14.1, free Oregon service, manual deploys, test/build gate.
- Backend service: pending account connection and creation; do not invent an assigned hostname.
- Live provider call: not yet verified; requires private OPENAI_API_KEY and an account-available OPENAI_MODEL.
- Public backend_origin: blank until actual URL is verified. The website can be published before the model service is configured and will explicitly report AI unavailable.
- Team access token: generated privately by Render Blueprint or securely by the deploy operator; never committed or exported.

After connecting Render, select the intended workspace, create the service from main, set secrets privately, verify /api/config and CORS, then set data/demo2-config.json backend_origin and republish. Run one ten-item synthetic development batch and retain real response IDs and errors privately. This is a live integration smoke test, not a formal evaluation score.

No real-RFI answer key or formal scores have been created. Deployment does not make the current synthetic cases real or independently labeled.
