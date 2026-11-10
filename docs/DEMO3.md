# Demo 3 — Daily RFI To-Do

Demo 3 is independent of Demo 2. It imports RFI records, classifies their priority with Jev, and lets the user prepare a daily review plan.

## Use the 10-RFI sample

1. Open `demo3.html` from the running site.
2. Choose **Import RFIs (CSV / JSON)** and select `outputs/light-rail-rfi-demo-sample/Light Rail East Expansion - 10 Random RFIs.json`. The Excel workbook itself is not parsed in the browser.
3. Search by an RFI ID in **Find an RFI**. For example, `R200-CRE-06251`.
4. Confirm the data-sharing notice, check the authorization box, and choose **Classify unclassified RFIs** or classify one RFI from its card.
5. After classification, generate today’s plan, adjust its order if needed, and record review actions.

The file contains the ten sample rows previously prepared from the user-provided workbook. It includes each RFI ID, description, submitted date and required return date, plus a title and project label. Its data remains local to the workspace unless the user imports it in the browser. Do not commit the companion JSON or workbook to a public deployment without confirming the data-sharing decision.

## Input and Jev handling

- Import accepts UTF-8 CSV and JSON with 1–10 unique RFI IDs. JSON may be an array or an object with a `records` array. Excel files must first be exported as CSV or JSON.
- The RFI search filters records already imported into the board; it does not fetch arbitrary IDs from an external system.
- Before a Jev call, the user must authorize sharing. The backend receives the RFI ID to associate the response. Jev receives only submitted date, due date and description.
- The backend needs `JEV_API_KEY`, an optional `JEV_MODEL`, and a team access token. Demo 3 stores its backend URL and token settings separately in the browser. It makes no model call on import or page load.
- Classifications persist with the board in this browser. Reimporting a matching record replaces its source fields and clears the prior classification for that item.
- `high`, `mid` and `low` map to High, Mid and Low plan tiers. `lacking_info` remains visible for human review and is excluded from automatic plan ranking.
- Recommendations are advisory. The source workbook and its records are never modified by classification or review actions.

## Local scope

The board, notes and classifications are stored in browser local storage. There is no account authentication, cross-device sync, background classification, automatic messaging or external project-system update. Export the board before switching devices or clearing browser storage.
