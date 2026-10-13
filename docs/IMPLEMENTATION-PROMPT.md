# Build Demo 1 — Structured RFI Dashboard

You are working on our University of Washington INFO 492 Construction Informatics team project, **“Prioritizing High-Risk RFIs with AI.”**

Our team represents the **General Contractor (GC)** perspective. Our overall thesis is:

> We hypothesize that AI-assisted impact assessment can help GCs identify high-cost-risk RFIs earlier and reduce RFI-related costs by 10% or more.

We are currently working on **Coordination Demo #1**, and I want you to implement a complete, functional, professional-looking **Structured RFI Dashboard**.

This is the FIRST stage of our larger project. For this assignment, focus strictly on organizing, visualizing, searching, filtering, and inspecting RFI data. We will implement AI risk assessment and AI-based prioritization in later demos.

The dashboard should feel like a realistic construction project management application, not just a class assignment or a static HTML prototype.

## 1. First, inspect our existing project

Before making changes:

1. Inspect the existing repository and understand the current structure, technology stack, routing, components, styling, and dependencies.
2. Review our existing team website to understand its visual identity, typography, color palette, spacing, and overall design language.
3. Our current project website is: https://lazydonuts.github.io/info492/
4. Our GitHub repository is: https://github.com/LazyDonuts/info492
5. Reuse the existing framework and conventions wherever practical.
6. Do not unnecessarily replace, break, or redesign the existing team website.
7. Integrate the dashboard naturally into the project, preferably as a dedicated page or clearly accessible Demo 1 section.
8. Make sure the navigation provides an obvious way to access the dashboard.

**Visual consistency is very important.** The dashboard should look like an extension of our existing website, while having the usability and sophistication of a modern enterprise SaaS dashboard.

If you cannot access the live website, inspect the local source files and existing CSS instead. Do not invent an unrelated design system.

## 2. Data source and integration

We have a synthetic RFI dataset modeled around Sound Transit's East Link and Downtown Redmond Link light rail projects.

The dataset description indicates approximately:

- 1,370 synthetic RFIs
- 328 synthetic change orders
- Seven contract packages
- RFI metadata and content categories
- Contractor priority indicators
- RFI response and schedule information
- Cost-related information
- Linked change-order outcomes
- Ground-truth priority labels for future evaluation

Potential source files include:

- ST_EastLink_DRLE_RFI_synthetic_dataset.xlsx
- rfis.csv
- change_orders.csv
- change_order_outcomes.csv
- rfi_change_order_link.csv
- contracts.csv

**Inspect the actual data files before implementing the data model. Do not assume these files or specific columns exist without checking.**

If the data files are not yet available locally, build a clean, reusable data-loading layer with clearly labeled development fixtures. Do not present invented sample data as the real dataset or as verified Sound Transit records. Tell me exactly where to place the real dataset files.

Requirements:

- Prefer loading the actual provided CSV or other structured files.
- Handle missing values, inconsistent names, and different data types gracefully.
- Preserve original RFI IDs and relevant metadata.
- Support the full dataset efficiently, rather than hardcoding a handful of rows.
- Inspect the Data Dictionary, if available.
- Clearly distinguish information available when an RFI was submitted from information known only after resolution.
- Label retrospective cost and change-order outcomes clearly.
- Do not use outcome-derived ground-truth labels as if they were predictions available at submission.
- Avoid implying that synthetic project-level RFI outcomes are official Sound Transit records.

If fields such as status, trade, or responsible party do not exist, implement transparent fallback behavior and document the gap. If reasonable synthetic enrichment is needed, use a reproducible transformation script and clearly mark those fields as generated.

## 3. Main dashboard layout

Create a professional dashboard with a clear information hierarchy.

### Header and navigation

Include:

- Project name: **RFI Management Dashboard**
- Subtitle: **Demo 1 — Structured RFI Dashboard**
- A clear connection back to the main team website
- A brief indication that this is a synthetic construction dataset
- A polished, consistent navigation experience

Use a clean dashboard layout with generous spacing, subtle borders, consistent icons, readable typography, and a restrained color palette.

### Dashboard summary cards

At the top, display summary metrics derived from the loaded data, such as:

- Total RFIs
- Open / unresolved RFIs, if available
- Closed / resolved RFIs, if available
- RFIs with cost-related information
- Average response time, if available

Only show accurate metrics computed from available data. If a metric cannot be calculated, display an informative unavailable state instead of inventing numbers.

Use attractive but understated summary cards with strong visual hierarchy.

## 4. Required Feature A — RFI List

Implement a comprehensive and easy-to-use RFI data table.

Each row should display the most useful available information, ideally including:

- RFI ID
- RFI title or short description
- Content category
- Trade / discipline
- Status
- Responsible party
- Submission date
- Contractor priority, if available
- Available cost-related indicator or amount

Adapt the exact columns to the actual dataset.

Requirements:

- Clear table headers
- Consistent spacing and alignment
- Readable descriptions with appropriate truncation
- Visual badges for status and existing contractor priority
- Sorting by relevant columns
- Pagination or efficient rendering for 1,370+ records
- A clear indication of how many results are currently displayed
- Appropriate formatting for dates, currency, and missing values
- Sticky table header if useful
- Responsive handling of wide tables

The table must use real application state. It should not be a static mockup.

## 5. Required Feature B — Category and Trade

Allow users to organize and filter RFIs by category and construction trade.

Examples might include electrical, mechanical, structural, civil, utilities, design clarification, or ground conditions, depending on what the actual dataset contains.

Requirements:

- Category filter
- Trade filter, if the dataset supports it
- Automatically populate filter options from available records
- Allow users to combine these filters with other criteria
- Show the number of matching RFIs
- Make active filters clearly visible
- Do not fabricate unsupported categories or trade assignments

If trade data is missing, retain the filter architecture but provide an honest unavailable state or documented enrichment option.

## 6. Required Feature C — Responsible Party

Allow GCs to determine who is responsible for each RFI and filter accordingly.

Include:

- Responsible party column in the table
- Responsible party filter
- Responsible party information in the RFI detail view

If the source has a meaningful responsible organization, assignee, or required responder field, map that carefully.

Do not confuse the submitting contractor with the party responsible for responding.

If responsible-party information is absent, document it explicitly. You may support reproducible synthetic enrichment, but do not silently assign responsibility.

## 7. Required Feature D — Cost Information

Cost visibility is especially important because our team thesis focuses on identifying RFIs with potentially significant financial consequences.

Display available cost-related information in a clear, interpretable way.

Depending on the real columns, this may include:

- Contractor estimated cost impact
- Contractor cost-impact flag
- Linked change-order count
- Approved change-order cost
- Allocated RFI-linked change-order cost
- Other available cost indicators

Requirements:

- Clearly distinguish **estimated/potential cost impact** from **approved/actual modeled outcomes**.
- Do not imply that all RFIs with a linked change order caused the entire change-order amount.
- Do not double-count costs in many-to-many RFI/change-order relationships.
- Format currency consistently.
- Provide informative tooltips or labels where metrics may be misunderstood.
- Make cost information easy to discover from both the table and the RFI detail view.
- Handle RFIs without cost information appropriately; missing data does not necessarily mean zero cost.

This is a structured-data visibility feature, NOT AI cost-risk prediction.

## 8. Required Feature E — Search and Filter

Build a useful search and filtering experience.

Include:

- Search by RFI ID
- Search by RFI description or text
- Filter by status
- Filter by category
- Filter by trade, if available
- Filter by responsible party, if available
- Filter by contract package, if useful
- Sort by submission date and available cost-related information
- A Reset / Clear All Filters action
- Visible active-filter chips or indicators
- Clear empty states when no records match

Requirements:

- Filters should work together, not independently.
- Results should update immediately.
- The result count should update correctly.
- Clearing filters should restore the complete dataset.
- Search should be case-insensitive.
- Make filtering intuitive for first-time users.

If practical, include a compact filter sidebar or a polished filter toolbar.

## 9. Required Feature F — RFI Detail View

Each RFI row must be clickable and open a detailed view.

A right-side drawer, modal, or dedicated details page is acceptable, whichever fits the current website architecture best.

The detail view should contain:

**Overview**
- RFI ID
- Description / question text
- Status
- Content category
- Trade
- Contract package
- Location, if available

**Responsibility**
- Submitting party
- Responsible party / responder, if available
- Submission date
- Relevant response dates, if available

**Cost and schedule**
- Estimated cost impact, if available
- Linked change orders, if available
- Approved cost outcomes, clearly identified as retrospective data
- Schedule impact information, if available
- Response duration, if available

**Additional information**
- Any other relevant metadata from the source
- Clear labels for missing information

Make the detail view visually polished, organized into logical sections, and easy to close or navigate.

Users should be able to return to the table without losing their previous search and filter selections.

## 10. Additional usability and visual design requirements

Treat this as a high-quality student portfolio project.

Design principles:

- Professional enterprise dashboard aesthetic
- Consistent with our existing team website
- Minimal but thoughtfully designed
- Strong alignment and spacing
- Clear content hierarchy
- Accessible color contrast
- Subtle hover effects and transitions
- Well-designed status and metadata badges
- Clean cards and tables
- Responsive layouts
- No unnecessary visual clutter

Consider adding one or two useful data visualizations, such as:

- RFI count by category
- RFI status distribution
- RFI count by contract package

These should use real loaded data and support the dashboard's purpose rather than serve as decoration.

Prefer reliable, usable functionality over excessive visual effects.

Make sure the application works on desktop and remains usable on smaller screens.

## 11. Make Demo 1 genuinely testable

Our professor requires a working demo that connects to our thesis.

The research question for this first stage is:

**Can a structured RFI dashboard help General Contractors locate and understand cost-related RFI information more efficiently than an unorganized RFI list?**

To support a meaningful test:

1. Provide a basic unstructured or minimally formatted RFI list view as a comparison baseline, if practical.
2. Allow users to use the Structured Dashboard to perform equivalent information-finding tasks.
3. Design the interface so we can test tasks such as:
   - Find RFIs in a particular category or trade.
   - Find RFIs associated with a particular responsible party.
   - Find RFIs with available cost-impact estimates.
   - Inspect an RFI and locate its linked change-order information.
4. Provide a clear way for us to record search time and accuracy during user testing, or include a lightweight local test mode if it is straightforward to implement.

Do not fabricate experiment results.

This first demo tests information organization and retrieval, which is a prerequisite for our later AI-assisted risk assessment.

It does not yet demonstrate AI prediction or establish the thesis's 10% cost-reduction target.

## 12. Explicitly out of scope

Do NOT implement the following for Demo 1:

- LLM-powered risk prediction
- AI-generated High / Medium / Low risk scores
- AI-based RFI priority ranking
- AI-generated cost savings estimates
- Autonomous RFI responses
- Full change-order approval workflows
- Claims of demonstrated cost reduction

These belong to future demos.

However, organize the code cleanly so an AI analysis module can be added later without major restructuring.

## 13. Engineering and implementation quality

Please implement this as a real, runnable application.

Requirements:

- Follow the repository's existing architecture where practical.
- Use reusable components.
- Keep data parsing and transformation separate from presentation components.
- Use clean, readable, maintainable code.
- Avoid unnecessary dependencies.
- Handle loading, errors, empty datasets, and missing values.
- Ensure table sorting, search, filtering, and detail navigation actually work.
- Do not hardcode summary statistics.
- Avoid runtime errors and broken navigation.
- Keep the app compatible with our existing hosting approach, including GitHub Pages if that is how the site is deployed.
- Do not expose private keys or secrets.
- Keep the project easy for our teammates to run locally.

If the original website is static, choose a lightweight solution appropriate for that environment rather than introducing an unnecessary backend.

## 14. Documentation and assignment deliverables

Our Coordination Demo #1 requires:

1. A live working demo or recorded walkthrough.
2. An updated GitHub repository containing code, data, prompts used (if any), and dependencies.
3. A Demo Note of no more than 500 words describing what we tested, what happened, and how it relates to the thesis.
4. Individual contribution statements.

Please prepare the repository to support these deliverables.

Specifically:

- Update the README with project setup instructions.
- Explain the dashboard's features and data source.
- Document the fields used and any transformations.
- State clearly that the RFI dataset is synthetic and modeled on Sound Transit projects.
- Include or reference the synthetic data generation script and justification note, where available.
- Do not invent a generation script that falsely claims to reproduce data it did not generate.
- State that Demo 1 does not use an LLM, if that is the case.
- Include a basic walkthrough plan or instructions for demonstrating the features.
- Provide a short testing plan and a place to record actual results.
- Do not fabricate test results, teammate contributions, or a completed deployment.

## 15. Execution instructions

I want you to implement the project, not merely propose an architecture or write pseudocode.

Proceed in this order:

1. Inspect the existing codebase and available dataset files.
2. Identify the actual technologies and data columns.
3. Briefly explain the implementation approach.
4. Build the dashboard and integrate it with the existing website.
5. Implement every required core feature.
6. Run available checks, tests, and the production build.
7. Fix any errors introduced by the changes.
8. Update the documentation.
9. Summarize what you implemented and how to run it.
10. Explicitly identify any missing dataset files, unsupported fields, or unfinished requirements.

Do not stop after creating the visual layout. All search, filtering, sorting, data loading, and detail-view interactions must function.

If a technical decision is not specified, use your best judgment based on the existing repository and prioritize working functionality, visual consistency, and clarity.

## 16. Acceptance criteria

Consider Demo 1 complete only when:

- [ ] The dashboard is accessible from the existing website.
- [ ] The design is visually consistent with our website.
- [ ] The RFI table loads the supplied dataset correctly.
- [ ] Search works for RFI IDs and descriptions.
- [ ] Category and trade filtering work where supported by data.
- [ ] Responsible-party information is displayed honestly and filtered where available.
- [ ] Cost-related information is clearly labeled and accessible.
- [ ] Sorting and combined filters work.
- [ ] Clicking an RFI opens a useful detail view.
- [ ] Summary numbers are computed from the actual loaded data.
- [ ] The interface handles missing values gracefully.
- [ ] The application is responsive and polished.
- [ ] Demo 1 can support a basic comparison against an unstructured RFI list.
- [ ] The project builds and runs successfully.
- [ ] The README explains how to run and demonstrate the system.

The final result should feel like a credible early-stage construction project management platform that demonstrates how structured RFI information can support better GC decision-making.

**Please begin by inspecting the current repository and dataset, then implement Demo 1 end to end.**
