# Role workspaces — local implementation

Open `signin.html`, select a persona, then continue. Public project and demo pages remain accessible without signing in.

| Role | Scope | Primary actions |
|---|---|---|
| RFI submitter | Own RFIs | Create a draft, attach supporting files, submit, correct returned questions, provide clarification, read issued answers |
| Checker | Submitted project RFIs | Check completeness, return with a reason, route to the technical responder, manage a daily review plan |
| Responder | Assigned RFIs | Request clarification, save technical drafts, prepare for sign-off, record external reviewer/reference and issue an answer |
| Schedule manager | Company-created or company-responsible RFIs | Revise company-created questions; set dates only for company-responsible open records |
| Reader | Submitted project RFIs | Search, filter, inspect official responses and history; no mutation actions |

## Workflow

Draft → submitted → checker approval/routing → assigned responder → sign-off pending → issued answer.
Return and clarification paths send work back to the originator. Manager revisions preserve the previous version and response, invalidate the old recommendation, and return the RFI to the checker. Technical sign-off is recorded as an external attestation; there is no independent approval service.

PDF/PNG/JPEG files are stored locally (maximum three files per RFI, 1 MB per file), with downloadable originals. Dates require change reasons. Edits include activity history and stale-record checks. Daily plans retain manual ordering for the current day.

## Current boundary

This is an interactive local framework using fictional fixtures, not production identity/access control. Session role selection and browser localStorage are used; another browser/device does not share data. Sample recommendations are not new live agent results. The existing public Demo 2 and Demo 3 are unchanged.

Before production use, connect a shared backend, server-enforced company/record permissions, authenticated identities, durable file storage, an approved technical-signoff workflow, and the teammate-owned dataset/agent. Preserve the same scoped actions and revision invalidation when doing so.

## Validation

99 automated tests pass, including role visibility/action boundaries, revision invalidation and attachment limits. Static asset/link validation passes. Browser walkthrough verified response preparation, sign-off, publication and manager revision returning to the checker queue.
