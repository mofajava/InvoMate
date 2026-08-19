import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLedgerFromHandNotes } from "../lib/hand-ledger";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = `${JSON.stringify(buildLedgerFromHandNotes(), null, 2)}\n`;
const targets = [
  join(root, "resource/ledger-from-data.json"),
  join(root, "public/imports/ledger-from-data.json"),
];
for (const file of targets) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, json);
  console.log("wrote", file);
}
