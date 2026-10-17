# Development working priority v0.4

Team-requested change October 17: missing information must not remove an RFI from the working review queue. Development results therefore show a working P0/P1/P2 plus independent missing-information and AI-check flags. This is a provisional routing policy, not a new claim of validated financial risk. Evaluation mode and the frozen v0.3 reference labels/scoring remain unchanged.

Rules, applied without mutating original evidence results:

1. A v0.3 assigned P0/P1/P2 is retained. Resolved/out-of-scope exclusions remain excluded.
2. Validated partial U/A/M/X Yes with no known effective protection gives provisional P0 for urgent human verification of the remaining opportunity/protection.
3. If the submission reports all three of cost impact, schedule impact and critical-path involvement, give provisional P0. These are reported indicators, not proof of additional cost. Contractor urgency alone is insufficient.
4. A described clarification with explicit negative cost, schedule and critical-path flags gets provisional P2, with a missing-information flag and instructions to verify the submitter's claims.
5. Other incomplete cases default to provisional P1. Missing information alone does not justify low priority.

An invalid AI response, network failure, quota error or bad citation is still an AI processing failure. Its raw output is never reused as evidence. Any working grade for it comes only from the original submission rules above, is labeled input-rule / not a valid AI assessment, and retains the error in details and export. This does not make the model's pass rate or accuracy higher.

The raw result's assessment_state and priority are retained in application state and CSV. CSV adds working_priority, provisional, working_policy, working_basis, working_reason, working_missing_information, needs_information_flag and ai_review_failed. Development display uses the working grade for sorting; the two flag counts overlap the P0/P1/P2 counts. Information/error filters retain grades on the same rows. Evaluation display, key matching, baseline, run records and score denominators continue to use the original v0.3 dispositions.

All provisional suggestions require GC review through the existing contractual process. No design, work, cost or time authorization is created. This policy does not amend the Google Doc rubric automatically; any formal evaluation change must be frozen prospectively with a matching human answer key.

Validation: six new unit scenarios cover missing-data defaults, compound reported exposure, explicit-negative clarification routing, retained errors/no invalid-output reuse, confirmed/excluded preservation and validated partial exposure. Total 62 tests passed; build passed. Browser transport fixtures verified combined working grades/flags, error detail preservation and filtering. These fixture checks are not live AI evaluation scores. Homepage navigation items measured equal 44px height and an identical center line in the browser.
