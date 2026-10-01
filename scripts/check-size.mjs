// Fails the build when the JavaScript loaded on start is over budget.
// The budget comes from the slowest device we support (an old Fire HD tablet): every KB is parse time.
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 100;
const dir = new URL("../dist/assets/", import.meta.url);

// Fixtures and the debug overlay are separate chunks that only load with ?fixture=… or ?debug.
const isOptional = (name) => /^(demo|local|overlay)[-.]/.test(name);

let total = 0;
for (const name of readdirSync(dir).filter((n) => n.endsWith(".js")).sort()) {
  const kb = gzipSync(readFileSync(new URL(name, dir))).length / 1024;
  if (!isOptional(name)) total += kb;
  console.log(`  ${name.padEnd(32)} ${kb.toFixed(1).padStart(6)} KB gzip${isOptional(name) ? "  (optional, not counted)" : ""}`);
}
console.log(`JS on start: ${total.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) {
  console.error(`Over budget by ${(total - BUDGET_KB).toFixed(1)} KB.`);
  process.exit(1);
}
