# Demo 3 — Daily RFI To-Do and Jev intake

Demo 3 can classify user-supplied RFIs directly with Jev, then turn those results into a GC review plan. Visitors do not enter credentials or configure a connection. The shared backend holds the Jev API key; the board and plan remain in the current browser.

## Walkthrough

1. On Demo 3, choose a UTF-8 CSV or JSON file up to 256 KB with 1–50 RFIs. Include `rfi_id`, `title`, and a `description` of at least 20 characters. `submitted_date` and `due_date` are optional.
2. Select **Evaluate with Jev**. Only the ID and Jev input fields (dates and description) are sent to the configured Jev service. Provider credentials never enter the browser. Results are mapped to the board as High, Mid, Low, or Lacking info.
3. Add eligible suggestions to My To-Do, reorder by drag or arrow buttons, set a planning date/owner in Review, snooze with a reason, or record a review outcome. Lacking-info results stay out of priority recommendations until a human resolves the missing context.
4. Optionally sync a Demo 2 development run or select tasks for the existing Demo 2 workflow. Existing task order, owner, planning dates, and review status survive updated assessments.
5. Export the board and activity as JSON. The export is for review/analysis; automatic board-backup import is not implemented.

## Decisions

- P0/High, P1/Medium and P2/Low reflect Demo 2 working triage; provisional and missing-information flags remain visible.
- Failed AI checks/input-rule fallbacks, unattempted records, and exclusions are shown under items needing attention; they are not recommended as valid AI assessments.
- Priority comes first (High → Medium → Low), with known needed-by dates and RFI ID breaking ties within each priority. Overdue and follow-up dates remain visible for human judgment. Missing dates are not invented from historical submissions. AI decision dates need human verification. A GC may enter a separate planning override.
- Imported historical synthetic RFIs are exercises, not a claimed live open-project feed. Source outcomes/closed status remain excluded from the Demo 2 submission contract. An actual open-RFI feed is future work.
- Task identity includes backend, package and RFI ID. Older/equal analysis timestamps do not overwrite newer results. Refreshed results do not silently reset the human plan.
- Capacity is a soft preference, not a hard limit. Additions are unique. Search and package filters do not delete or reorder hidden tasks.
- Reviewed means a review action was recorded, not that the RFI was answered or closed. Follow-ups re-enter suggestions when the planning date reaches their date; earlier review outcomes remain in task history.
- A planning-date control supports classroom replay. It advances follow-up states; it is not an immutable historical view.
- No automatic emails or external project writes. Recorded actions describe user activity; they do not execute it.

## Storage and limitations

Shared results and plans use localStorage on the same browser origin; the return selection uses sessionStorage in the same tab, expiring after 24 hours. No credentials are transferred. Localhost and GitHub Pages cannot share browser storage. Storage errors display an export warning.

There is **no authenticated role system, multiuser collaboration, cross-device persistence, scheduled background processing, or production construction-platform integration** in this first framework. The GC label is a workspace description, not an authenticated identity. Those features require a backend persistence/auth design in a subsequent stage.

The public Jev route is limited to 50 classifications per source address per hour and 250 per UTC day; limits reset on backend restart. The hosted service requires the operator to add `JEV_API_KEY` as a server secret once and deploy. Without that one-time backend setup, the page reports that Jev is unavailable; visitors still need no key or setup. Intake currently supports CSV and JSON, not PDF or Word extraction.

The explicit illustrative-task button loads five labeled UI examples with no AI call. These examples cannot be sent to the model and are not evidence of accuracy.

## Evaluation

The activity export captures additions, manual moves, snoozes, review outcomes and timestamps. It is not yet a controlled experiment timer or an accuracy score. Formal task timing, reference labels and comparisons remain separate evaluation work.

## Validation (October 30, 2026)

- 83 Node tests passed, including seven new tests for merging/preservation, project isolation, failure exclusion, ranking, snooze, review and invalid imports.
- Static page/link/data validation passed for 1,370 dataset records.
- Isolated Chrome browser test: sample loading, persistence after reload, manual reorder, snooze, review, Demo 2 → Demo 3 → Demo 2 analysis → Demo 3, and retained personal order. API responses were mocked for browser integration; this does not measure live AI quality.
- Desktop and 390px mobile layout inspected; no horizontal overflow in the tested mobile view.

- Follow-up browser QA replaced inconsistent native HTML dragging with pointer-based handles; actual Chrome dragging and Undo were verified. Arrow controls remain available.

## Priority-first plan generation

Generate Today’s Plan selects up to the chosen capacity from eligible suggested and planned records in the selected project scope. Search does not limit generation. Existing plans require an explicit replacement confirmation; Undo restores the previous board. Snoozed, reviewed, excluded and failed assessments are not selected. Cards compare current user order with the current eligible-pool suggested rank, which may change as assessments arrive or tasks are reviewed. AI updates never automatically regenerate the plan.

Validation: 85 unit tests passed; browser integration verified priority-first generation, canceling replacement, and existing bidirectional Demo 2 workflow.
