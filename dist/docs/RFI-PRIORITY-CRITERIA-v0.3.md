# **RFI Priority Criteria**

**INFO 492 Team 1 · Proposed rubric v0.3 · October 16, 2026**

We prioritize RFIs for earlier GC review when submission-time evidence identifies an additional-cost mechanism and a remaining opportunity to limit that exposure. The criteria below are research-informed team proposals for pilot annotation. They have not yet been validated by a GC or tested for accuracy. Review priority is distinct from eventual financial loss.

## **Research basis**

Construction guidance supports recording the affected work, potential cost consequences, schedule dependencies, and response needs. Navigant distinguishes RFI handling costs from downstream construction impacts \[1\]. FDOT uses schedule impact and resolution complexity to set response priorities; its matrix is not a financial-risk classification \[2\]. FTA recommends documenting risk impacts, proximity, treatment and ownership \[3\]. These sources inform our evidence fields, but do not establish universal High, Medium or Low cost thresholds. Our decision rules are operational choices requiring team calibration.

## **Evidence to record**

Code each field as **Yes, No or Unknown**, with a quotation and source location. A submitter’s assertion should be identified as an assertion. Absence of information means Unknown, not No.

* **U — Unresolved issue:** a specific question or discrepancy remains unanswered at the decision time.  
* **A — Affected work:** a named component, location, activity, procurement commitment or paid resource is affected.  
* **M — Monetary mechanism:** the issue is connected to additional work, rework, replacement, committed-material loss or paid disruption. A category or a bare cost-impact flag is insufficient.  
* **X — Time-sensitive exposure:** waiting creates ongoing charges or locks in exposure before the documented normal review window ends. Assess the exposure pathway before considering protection. “ASAP” alone is insufficient.  
* **D — Remaining decision opportunity:** earlier review could inform a still-available action that changes the remaining exposure. This does not guarantee that the action will succeed. Past expenditure alone does not establish D.  
* **B — Effective protection:** an implemented hold, resequencing or other measure covers the relevant exposure through the review window, without an unaddressed substitute cost. A suggested hold is not an implemented hold.

Record consequence extent, supported quantities and timestamped estimates separately. Do not invent probabilities, dollar thresholds or weighted scores. If no review horizon is documented and timing comparison is necessary, X remains Unknown.

## **Priority decision rules**

Screen out resolved or out-of-scope items first. Apply the following rules to each distinct cost mechanism. A material contradiction or missing fact that prevents the relevant decision must be resolved or recorded as Needs information.

**High — Earlier review needed.** U, A, M, X and D are Yes, and B is No. The packet identifies a concrete cost mechanism, time-sensitive exposure and a remaining action opportunity without effective protection.

**High — Mitigation unverified.** U, A, M, X and D are Yes, but B is Unknown. Prioritize human verification and retain the uncertainty flag. This is a precautionary review recommendation, not proof that mitigation fails or that the eventual loss is large.

**Medium — Cost issue requiring planned review.** U, A and M are Yes, with affirmative evidence that X is No or B is Yes. D need not be known in this branch. If X is known and D is affirmatively No, an in-scope unresolved cost issue is also Medium, with the reason that no remaining exposure-changing opportunity has been identified. This last branch is a proposed team choice to test during calibration.

**Low — Routine clarification.** The packet adequately supports a bounded clarification with no identified additional-cost mechanism and no contradictory cost assertion. Low means no mechanism was identified in the supplied evidence; it does not guarantee zero risk.

**Needs information — No priority assigned.** Essential U/A/M facts are undecidable; a material contradiction remains; or X/D are unknown where required to distinguish the applicable levels. Do not force an incomplete case into Medium or Low. This is an evidence status, not a fourth risk severity.

**Multiple mechanisms:** any independently supported High mechanism establishes overall High while preserving other missing questions. Otherwise, an unresolved mechanism that could change the level produces Needs information. If all relevant mechanisms are assessable, any Medium produces Medium; Low requires adequate evidence across the whole issue. Protection against one loss does not automatically protect another.

**Within-tier order:** use supported decision dates, then submission time, then stable ID. Keep expedited-verification items visible. Safety escalation is separate from cost priority. The agent does not authorize work, payments, design decisions or contractual entitlement; AIA G716 also distinguishes an RFI response from authorization for cost/time-increasing work \[4\].

## **Boundary examples**

The following are invented calibration examples, not real evaluation cases.

1. **Fabrication continuing:** conflicting dimensions affect panels being fabricated; timely clarification can change production, and no hold is available → High. If an effective, no-charge hold covers the response window → Medium.  
2. **Protection not documented:** the same fabrication exposure and decision opportunity are supported, but the hold status is missing → High with mitigation-unverified flag. Ask whether a hold is implemented, until when, and at what cost.  
3. **“Urgent utility conflict” only:** no affected item or financial consequence is explained → Needs information. The utility category and urgent label do not establish High.  
4. **Work paused:** a named rental resource continues accruing charges and an answer could release it → High if no effective protection. If the resource is off hire and other work continues without added expense → Medium when the underlying added-cost issue remains.  
5. **Negation matters:** “No demolition is required; only the drawing reference needs correction,” with adequate context → Low. “Installed supports must be replaced, but the work is effectively protected until review” → Medium.  
6. **Past versus remaining loss:** already scrapped material does not alone justify High. Additional identical parts still being produced, with a remaining opportunity to correct production and no protection, can justify High. A purely historical settled loss is outside the active-review scope.  
7. **Conflicting evidence:** a form says no cost impact while the narrative describes required extra materials → Needs information until the discrepancy is clarified. “No schedule impact” and “additional material cost” are different dimensions and need not conflict.  
8. **Safety:** a reported immediate hazard triggers separate human escalation even if the cost priority cannot be determined. Do not wait for a cost estimate to flag the hazard.

## **Handling missing information**

1. Identify exactly which missing fact affects the decision. Missing an irrelevant attachment does not automatically prevent classification.  
2. Return the supported evidence, Unknown fields and specific questions: What work is affected? What extra work or expense would occur? What happens if the answer waits? Which action remains possible? Is protection actually in place, and does it generate standby costs?  
3. If the packet describes ongoing charges, active affected fabrication or a specific impending irreversible commitment, send it for expedited human verification even when priority remains unassigned. An unexplained “urgent” label is insufficient.  
4. Keep the original submission assessment unchanged. Record later information as a new timestamped assessment, rather than silently adding hindsight.  
5. Distinguish an evidence gap from a technical failure. A timeout, malformed output or system-truncated packet is a processing failure, not a correct Needs-information judgment. Record failures separately and retain them in the test denominator.

Allowing abstention requires reporting how often the system actually assigns a level, alongside correctness; otherwise apparent accuracy can hide excessive refusal \[5\].

## **Case selection and annotation**

* **Follow the worksheet:** use 10 real items unless an alternative is explicitly permitted. Confirm original provenance. IDs matching our synthetic dataset do not establish that cases are real.  
* **Use submission-time packets:** retain original question text and actual available attachments, work status, supported dates and protection evidence. Attachment counts do not supply attachment contents. A contractual response allowance is not an activity deadline.  
* **Prevent hindsight:** exclude later responses, closure dates, realized delays, change-order outcomes and outcome-derived priority labels. In our workbook, contractor estimate fields marked unavailable at submission remain excluded until their provenance is clarified.  
* **Separate practice from testing:** calibrate on other cases. Keep duplicates, revisions and closely related issues together. Freeze selection before viewing AI results; describe whether the sample is consecutive, random or a deliberately selected challenge set.  
* **Create the reference independently:** two people label the same packets separately using evidence, then compare and adjudicate. Preserve the initial disagreements and reasons. Do not use AI labels or synthetic outcome tiers as the answer key.  
* **Freeze and evaluate:** record the rubric, inputs, prompt, model settings, baseline and success target before testing. Use exact disposition matches out of 10 as the proposed single primary metric; report both AI runs and the simple-method score separately. High recall, coverage and boundary violations are additional diagnostics. Eight out of ten is a proposed team target, not a validated industry threshold.

Document source provenance and verify evidence citations. A narrow pilot does not establish deployment reliability or a 10% reduction in project costs \[6\]. Expert review and actual test results remain outstanding.

## **References**

**\[1\]** Hughes, N., Wells, M., Nutter, C. L., & Zack, J. G., Jr. (2013). *Impact & Control of RFIs on Construction Projects.* Navigant Construction Forum. See printed pp. 13–14 for handling-cost estimates and p. 32 for schedule/cost links. [Original report](https://www.cmaanet.org/sites/default/files/2018-04/NCF%20IMPACT%20%26%20CONTROL%20OF%20RFIs%20ON%20CONSTRUCTION%20PROJECTS.pdf).

**\[2\]** Florida Department of Transportation. (2021, September 27 revision). *Construction Project Administration Manual, Section 8.11, Contractor Initiated Submittals.* See pp. 8-11-6–7 for the priority and escalation matrices. [Original procedure](https://fdotwww.blob.core.windows.net/sitefinity/docs/default-source/construction/manuals/cpam/newcleanchapters/chapter8s11.pdf?sfvrsn=3422a13e_2).

**\[3\]** Federal Transit Administration. (2025). *Project and Construction Management Guidelines.* See printed p. 77 for RFIs and p. 143 for risk characteristics and schedule risk. [Original guidelines](https://www.transit.dot.gov/sites/fta.dot.gov/files/2025-02/Project-and-Construction-Management-Guidelines-January-2025.pdf).

**\[4\]** AIA Contract Documents. (n.d.). *Summary G716–2004 Request for Information.* Synopsis and purpose. [Official summary](https://help.aiacontracts.com/hc/en-us/articles/1500009444782-Summary-G716-2004-Request-for-Information-RFI).

**\[5\]** Geifman, Y., & El-Yaniv, R. (2017). *Selective Classification for Deep Neural Networks.* Section 2, p. 3, defines coverage and selective risk. Its algorithm-specific guarantees do not transfer to our rubric. [Original paper](https://arxiv.org/pdf/1705.08500).

**\[6\]** National Institute of Standards and Technology. (2024). *Artificial Intelligence Risk Management Framework Generative Artificial Intelligence Profile.* NIST AI 600-1. See MS-2.5-001, MS-2.5-003 and MS-2.5-005 for limits on extrapolation, citation verification and provenance. [Original profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf).