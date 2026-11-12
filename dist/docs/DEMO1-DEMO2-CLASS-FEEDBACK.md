## Summary: RFI Prioritization Agent — Peer Review Feedback

### Project Evolution
The project moved from a dashboard that categorized 1,370 synthetic RFIs, 328 change orders, and 7 contract packages by category, trade, and responsible party — into a prioritization tool that evaluates RFIs as P0/P1/P2 against a stated goal of at least 70% categorization accuracy.

### Demo #1 (Dashboard) — Strengths
- Scale and data volume (1,370 RFIs) impressed reviewers
- Outputs cite back to source documents, making figures traceable
- Interface made the RFI list legible by category, trade, and responsible party
- Tooling split (design in one tool, build in another) was clear

### Demo #1 — Weakness
The core problem: **no one could tell what was being measured.** Four of 14 reviewers said a threshold was never stated or was set after seeing results (the weakest in the class on that question), and seven more found the accuracy claim only "sort of" falsifiable. One reviewer had to invent a metric ("if the cost estimate makes relative sense") because none was supplied.

### Demo #2 (Prioritization Tool) — What Improved
- The exact Demo #1 gap was fixed: a stated, measurable 70% accuracy target replaced the absent metric ("It is really good that your thesis changed to be measurable and precise")
- The pipeline (Perplexity → Codex and Gemini → human review) was praised for making each step's role visible instead of a black box
- The unplanned highlight: the live demo broke and the team debugged it publicly. Three reviewers independently called this "honest" and "reflective" — a room watching a system fail and get diagnosed in public trusts its numbers more, not less.

### Demo #2 — Remaining Gaps
- **Evidence is still thin.** Reviewers wanted actual test results behind the 70% figure, a clearer explanation of testing criteria, and refinement of classification rules.
- The demo itself was slow and text-heavy.

### Priorities for Demo #3
1. Bring the promised comparison: agent rankings vs. human rankings on a fixed RFI set, reporting how many were correct rather than the target
2. Use the 1,370-RFI dataset for a held-out set with an answer key — the data exists; it needs to be pointed at the claim
3. Tighten the demo runtime so results get the minutes

The through-line: the project went from "no metric" to "stated metric" — the final step is "delivered result."
