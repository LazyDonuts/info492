// Static-host production check: no compilation or bundler is required.
import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DATA_FILES, parseCSV, buildModel } from "../js/rfi-data.js";
const root = process.cwd();
const connection = JSON.parse(await readFile("data/demo2-config.json", "utf8"));
if (Object.keys(connection).some((key) => key !== "backend_origin"))
  throw new Error("Public connection config may contain only backend_origin.");
if (typeof connection.backend_origin !== "string")
  throw new Error("backend_origin must be a string.");
if (connection.backend_origin) {
  const url = new URL(connection.backend_origin);
  if (url.protocol !== "https:" || connection.backend_origin !== url.origin)
    throw new Error(
      "Published backend must be an HTTPS origin without credentials, path or query.",
    );
}
for (const page of [
  "index.html",
  "dashboard.html",
  "demo2.html",
  "methodology.html",
]) {
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
