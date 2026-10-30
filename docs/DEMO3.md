# Demo 3 — Daily RFI To-Do (initial framework)

This local-browser prototype turns Demo 2 development results into a GC review plan. It reuses the current Gemini backend through Demo 2; there is no new API, secret, or automatic inference call in Demo 3.

## Walkthrough

1. Open `demo2.html`, select 2–10 records, review the outbound payload, consent and analyze.
2. On a completed development run, choose **Send to Daily To-Do**. Demo 3 receives the original submission packets, results, provenance, model metadata and run timestamp.
3. Add suggestions to My To-Do, reorder by drag or arrow buttons, set a planning date/owner in Review, snooze with a reason, or record a review outcome.
4. Select 2–10 tasks for AI and choose **Open selected in Demo 2**. The selection replaces the development selection and resets consent. Analyze using the existing connection, then send results back. Existing task order, owner, planning dates, and review status survive updates.
5. Export the board and activity as JSON. The export is for review/analysis; automatic board-backup import is not implemented. A completed Demo 2 run JSON can be imported from the empty-board screen.

## Decisions

- P0/High, P1/Medium and P2/Low reflect Demo 2 working triage; provisional and missing-information flags remain visible.
- Failed AI checks/input-rule fallbacks, unattempted records, and exclusions are shown under items needing attention; they are not recommended as valid AI assessments.
- Due/overdue decision dates and due follow-ups come first, followed by priority, known date and RFI ID. Missing dates are not invented from historical submissions. AI decision dates need human verification. A GC may enter a separate planning override.
- Imported historical synthetic RFIs are exercises, not a claimed live open-project feed. Source outcomes/closed status remain excluded from the Demo 2 submission contract. An actual open-RFI feed is future work.
- Task identity includes backend, package and RFI ID. Older/equal analysis timestamps do not overwrite newer results. Refreshed results do not silently reset the human plan.
- Capacity is a soft preference, not a hard limit. Additions are unique. Search and package filters do not delete or reorder hidden tasks.
- Reviewed means a review action was recorded, not that the RFI was answered or closed. Follow-ups re-enter suggestions when the planning date reaches their date; earlier review outcomes remain in task history.
- A planning-date control supports classroom replay. It advances follow-up states; it is not an immutable historical view.
- No automatic emails or external project writes. Recorded actions describe user activity; they do not execute it.

## Storage and limitations

Shared results and plans use localStorage on the same browser origin; the return selection uses sessionStorage in the same tab, expiring after 24 hours. No credentials are transferred. Localhost and GitHub Pages cannot share browser storage. Storage errors display an export warning.

There is **no authenticated role system, multiuser collaboration, cross-device persistence, scheduled background processing, or production construction-platform integration** in this first framework. The GC label is a workspace description, not an authenticated identity. Those features require a backend persistence/auth design in a subsequent stage.

The explicit illustrative-task button loads five labeled UI examples with no AI call. These examples cannot be sent to the model and are not evidence of accuracy.

## Evaluation

The activity export captures additions, manual moves, snoozes, review outcomes and timestamps. It is not yet a controlled experiment timer or an accuracy score. Formal task timing, reference labels and comparisons remain separate evaluation work.

## Validation (October 30, 2026)

- 83 Node tests passed, including seven new tests for merging/preservation, project isolation, failure exclusion, ranking, snooze, review and invalid imports.
- Static page/link/data validation passed for 1,370 dataset records.
- Isolated Chrome browser test: sample loading, persistence after reload, manual reorder, snooze, review, Demo 2 → Demo 3 → Demo 2 analysis → Demo 3, and retained personal order. API responses were mocked for browser integration; this does not measure live AI quality.
- Desktop and 390px mobile layout inspected; no horizontal overflow in the tested mobile view.

- Follow-up browser QA replaced inconsistent native HTML dragging with pointer-based handles; actual Chrome dragging and Undo were verified. Arrow controls remain available.
