# Demo 2 evaluation protocol template

Status: NOT RUN. Rubric v0.3 is a proposed team pilot, not practitioner validated.

1. Source ten fixed real, de-identified submission packets (or document instructor permission for a synthetic alternative). Existing synthetic dataset IDs do not establish real provenance.
2. Pilot other cases; independently label with reviewers A/B before discussion. Preserve each label, cited U/A/M/X/D/B, disagreements and adjudication. Do not have AI author the key.
3. Freeze inputs, dates, original rubric, model/prompt/settings/hashes, baseline and success number before seeing output. App mode distinguishes development, user-declared real and instructor-permitted synthetic. The declaration is not evidence of authenticity.
4. Proposed one primary metric: exact disposition matches/10. Target: TODO, team approval before first run (8/10 is only a proposal). Labels P0/P1/P2/Needs Information/Excluded; exact High mitigation-unverified subtype is a separate diagnostic. Exclude ineligible cases before freeze. If an exclusion is discovered later, retain it and disclose selection error; never replace secretly. Whether Excluded is in the scored key must be agreed before freeze.
5. AI run1 and AI run2 use the same locked packets, endpoint, config and prompts in stateless independent requests. No feedback or reference key. Preserve raw outputs even on failure. No automatic repair/retry; a formal retrial requires a new study/protocol deviation, not overwriting the recorded run.
6. Run3 uses the fixed keyword baseline. Do not compare FIFO to classification scores. The human key imports locally only after all runs, matches all ten IDs and includes both independent labels and adjudication. It is never sent to AI. Scores are separate, not averaged; technical failures are wrong, valid Needs Information can match. Outputs/keys exist only in tab memory until exported.
7. Diagnostics: P0 precision/recall and coverage/abstention, citation/semantic validity, run-to-run consistency, initial human agreement, false escalation load. Zero denominators N/A. Two runs are ten cases, not twenty independent samples. UI reports selected diagnostics; full outputs support additional manual diagnostics.
8. Group failures: evidence/hallucination; wrong rule/tier or missingness; routing/authority; parser/transport. Count role violations separately even for a correct tier: architect impersonation, fabricated drawing/spec, bypassing contractual channels, unauthorized work/cost/time action. These require human review; the interface does not automatically certify absence of violations.
9. Save private exports, then place a sanitized one-page evaluation report and nonconfidential answer key in /eval only if permitted. Never commit sensitive packets/credentials. Deadline from supplied spec: Wednesday October 21, 2026 11:59 PM; confirm against Canvas.

## Freeze record

Study title: TODO
Real provenance / synthetic permission: TODO
Cases and input hash: TODO
Reviewers and adjudication: TODO
Model/config hash and prompt/rubric hashes: TODO
Success threshold approved at: TODO
Excluded-case scoring policy: TODO
Failures/retries: no implicit repairs; preserve failures and start a new recorded study for changes.

No real-case scoring, interviews or monetary savings have occurred as part of implementation.
