# Demo 3 — RFI Review

Demo 3 is independent of Demo 2. It presents a SharePoint-style project list containing the 10 RFIs prepared for this demo. It does not connect to a live SharePoint site.

## Use the demo list

1. Open `demo3.html` from the running site.
2. Search for an RFI ID or select one or more rows in **Light Rail East Expansion**.
3. Choose **Add selected to review**, allow Jev to review the selected dates and descriptions, then choose **Classify RFIs**.
4. Choose **Generate plan** to create today’s list. The daily limit can be set from 3 to 50.

The list data is bundled at `data/light-rail-rfi-demo-sample.json` from the ten sample rows previously prepared from the user-provided workbook. Its dates are historical examples, not current deadlines.

## Jev and data

- The Jev API key belongs in the backend environment, never in the page. The browser uses the team token under **Settings** to access the backend.
- Jev receives the selected RFI’s submitted date, due date and description after the user authorizes sharing. The backend receives the RFI ID to associate the response.
- Classifications and review notes are stored in this browser. Demo 3 does not modify a source RFI or connect to SharePoint.
- High, Mid and Low classifications can be planned. RFIs needing more information remain available for human review.
