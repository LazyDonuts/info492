# Feature Specification: Cost Ranking Evaluation vs. Multi-Facet Filtering

## 1. Overview and Intent

One of the goals for the RFI Management Dashboard is to determine whether standard multi-facet filtering (by **Status**, **Content category**, **Trade / discipline**, **Responsible party / reviewer**, and **Contract package**) combined with estimate-based sorting can approximate or reproduce true project cost rankings.

Specifically, this feature evaluates whether filtering and sorting RFIs by conventional administrative criteria ("Estimate · highest first") produces an RFI sequence equivalent to filtering directly by verified, retrospective final cost values ("Cost evidence" $\rightarrow$ "Recorded estimate (later)" sorted "Estimate · highest first"). This capability tests whether surrogate organizational criteria are sufficient indicators of real financial consequences without requiring premature reliance on retrospective cost outcomes or predictive models.

---

## 2. UI and Layout Placement

The evaluation module is rendered as a compact, self-contained summary block directly within the main dashboard workspace:

* **Vertical position:** Underneath the "Contract packages" distribution chart section and directly above the RFI table's search and sort toolbar.
* **Footprint and styling:** Matches the visual treatment and footprint of the Contract packages section, using an understated container card, compact metric badges, descriptive captions, and a collapsable `<details>` disclosure panel.
* **Interactive disclosure:** Contains an inline summary row accompanied by a dropdown/accordion (`<details id="ranking-details">`) revealing granular, record-by-record comparison entries with direct links to RFI detail modals.

---

## 3. Functional Requirements

### Benchmark ("Gold Standard") Definition
* **Target population:** All records where retrospective recorded cost evidence exists (`cost === 'estimate'` or `hasEstimate === true`).
* **Benchmark ranking:** The gold-standard sequence ranks these recorded-estimate records in descending order by estimate value (`contractor_est_cost_high_usd` / `contractor_est_cost_low_usd`).
* **Cost timing boundary:** Recorded estimates and change-order allocations remain labeled as retrospective data and are not treated as submittal-time contractor flags.

### Evaluated View Definition
* **Active view population:** The filtered RFI collection resulting from user-selected values in Status, Content category, Trade / discipline, Responsible party / reviewer, and Contract package, sorted by "Estimate · highest first".
* **Alignment comparison:** For each position in the ranked benchmark list, the module verifies whether the corresponding RFI matches the RFI at that position in the filtered active view.

### Summary Metrics Display
The block surfaces four core alignment indicators:
1. **Ranking verdict:** Displays **"Same"** if the active view exactly matches the benchmark ordering across all available recorded estimates; displays **"Different"** otherwise.
2. **Same rank count:** Ratio of records sharing the exact same position index in both ranked sequences ($N_{\text{matching}} / N_{\text{gold}}$).
3. **In current filters (Coverage):** Ratio of benchmark recorded-estimate RFIs that remain visible under current filter selections ($N_{\text{covered}} / N_{\text{gold}}$).
4. **Top 25 highest:** Coverage of the top 25 highest-cost RFIs retained in the current filtered view ($N_{\text{top covered}} / 25$).

### Interactive RFI Breakdown
Expanding `<details id="ranking-details">` lists individual RFIs sorted by discrepancy status:
* **Same rank:** Active view rank matches benchmark rank.
* **Rank differs:** Present in the active view, but at a different relative index.
* **Missing from current filters:** Excluded by active administrative filters.

Clicking any individual RFI in the ranking list opens the standard RFI detail drawer (`showDetail(id)`), retaining existing filter, pagination, and focus state.

---

## 4. Code Dependencies and Data Flow

```
┌─────────────────────────────────┐
│     data/rfis.csv (+ JSON)      │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│        js/rfi-data.js           │
│  - compareCostRanking(records,  │
│                       filters)  │
│  - queryRecords()               │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       js/dashboard.js           │
│  - renderRanking(filters)       │
│  - Event: #ranking-details      │
│  - Event: .ranking-rfi click    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│        dashboard.html           │
│  - #ranking-compare block       │
│  - #ranking-summary             │
│  - #ranking-details             │
└─────────────────────────────────┘
```

### Data Processing Layer (`js/rfi-data.js`)
* **`compareCostRanking(records, filters)`:** Computes the gold-standard cost list, evaluates the active filtered list sorted by estimate descending, calculates rank intersections, and returns:
  * `identical`: Boolean indicating complete ranking alignment.
  * `goldCount`: Total records possessing cost estimates.
  * `sameRankCount`: Number of records at identical indices in both sets.
  * `covered`: Number of benchmark RFIs surviving current filters.
  * `topCovered` / `topK`: Top-slice benchmark retention.
  * `rows`: Ranked item objects containing `record`, `costRank`, `viewRank`, and status (`same`, `shifted`, or `missing`).
  * `extraWithoutEstimate`: Count of records present in the filtered view that lack cost estimates.

### UI Rendering and State Layer (`js/dashboard.js`)
* **Imports:** Utilizes `compareCostRanking`, `MISSING`, `escape`, and helper formatting routines (`integer`, `money`, `estimate`) from `rfi-data.js`.
* **`renderRanking(filters)`:** Called within the primary `render()` lifecycle. Updates text captions (`#ranking-caption`), dynamically builds summary cards (`#ranking-summary`), and populates the disclosure list (`#ranking-list`).
* **Event listeners:**
  * `#ranking-details` toggle: Lazy-renders or refreshes the detailed RFI button list.
  * `#ranking-list` click: Delegates click events on `[data-rfi]` buttons to invoke `showDetail()`.

### Markup and Styling Dependencies
* **`dashboard.html`:** Declares `<section id="ranking-compare" class="ranking-panel">` inserted immediately following the `<section class="distribution">` container (Contract packages) and preceding `<div class="table-toolbar" id="search-sort">`.
* **`css/dashboard.css`:** Styles `.ranking-panel`, `.ranking-summary`, `.ranking-rfi`, and `.cell-sub` elements to maintain typography, border-radius, and focus states consistent with the rest of the application.
* **External libraries:** None; implemented purely in vanilla JavaScript (ES modules) and native Web APIs (`<dialog>`, `<details>`, `Intl.NumberFormat`) without external front-end framework dependencies.