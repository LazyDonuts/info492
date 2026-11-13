import test from "node:test";
import assert from "node:assert/strict";
import { validateFiles, fileUrl } from "../js/workspace-files.js";

test("local attachment limits reject unsafe types and oversized files", () => {
  assert.doesNotThrow(() => validateFiles([{ type: "application/pdf", size: 1024 }]));
  assert.throws(() => validateFiles([{ type: "text/html", size: 20 }]));
  assert.throws(() => validateFiles([{ type: "image/png", size: 1048577 }]));
  assert.throws(() => validateFiles(Array(4).fill({ type: "image/png", size: 20 })));
  assert.equal(fileUrl({ type: "text/html", data: "data:text/html;base64,SGk=" }), "");
  assert.equal(fileUrl({ type: "image/png", data: "https://example.com" }), "");
});
