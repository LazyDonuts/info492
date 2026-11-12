// One-time, idempotent patch: lets makeAgent() take pre-bundled source text for
// implementation_hash instead of reading files (Workers have no filesystem).
// Node behavior is unchanged when sourceTexts is not supplied.
import { readFile, writeFile } from "node:fs/promises";
const path = "server/agent.js";
let code = await readFile(path, "utf8");
if (code.includes("sourceTexts")) {
  console.log("server/agent.js already patched.");
  process.exit(0);
}
const sig = `  providerFetch = fetch,
  executionMode = "provider",
}) {`;
const hash = `    implementation_hash: hash(
      ["./agent.js", "./extraction.js", "../js/demo2-core.js"]
        .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
        .join("\\n"),
    ),`;
if (!code.includes(sig) || !code.includes(hash))
  throw new Error("server/agent.js differs from the expected version; apply the two edits manually (see docs/CLOUDFLARE-DEPLOYMENT.md).");
code = code
  .replace(sig, `  providerFetch = fetch,
  executionMode = "provider",
  sourceTexts,
}) {`)
  .replace(hash, `    implementation_hash: hash(
      (
        sourceTexts ??
        ["./agent.js", "./extraction.js", "../js/demo2-core.js"].map((path) =>
          readFileSync(new URL(path, import.meta.url), "utf8"),
        )
      ).join("\\n"),
    ),`);
await writeFile(path, code);
console.log("Patched server/agent.js.");
