// Static-host production check: no compilation or bundler is required.
import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DATA_FILES, parseCSV, buildModel } from "../js/rfi-data.js";
const root = process.cwd();
for (const page of ["index.html", "dashboard.html"]) {
  const html = await readFile(page, "utf8");
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|#|mailto:)/.test(url)) continue;
    const path = url.split(/[?#]/)[0];
    if (path) await access(resolve(root, dirname(page), path));
  }
}
const tables = Object.fromEntries(
  await Promise.all(
    DATA_FILES.map(async (k) => [
      k,
      parseCSV(await readFile(`data/${k}.csv`, "utf8")),
    ]),
  ),
);
const model = buildModel(tables);
if (model.warnings.length) throw new Error(model.warnings.join("\n"));
console.log(
  `Static production validation passed: ${model.records.length} RFIs; all page assets and local links exist. Deploy the repository as-is.`,
);
