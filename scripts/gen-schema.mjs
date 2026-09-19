import { spots } from "../src/data/spots.ts";
import { readFileSync, writeFileSync } from "node:fs";

function sqlStr(v) {
  if (v === null || v === undefined) return "null";
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlBool(v) {
  return v ? "true" : "false";
}
function sqlNum(v) {
  return v === null || v === undefined ? "null" : String(v);
}
function sqlJsonb(v) {
  return v === null ? "null::jsonb" : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}

const rows = spots.map(
  (s) =>
    `  (${sqlStr(s.name)}, ${s.lat}, ${s.lng}, ${sqlStr(s.ownership)}, ${sqlStr(s.type)}, ${s.pricePerHour}, ${sqlStr(s.priceNote)}, ${sqlBool(s.charging)}, ${sqlStr(s.connectorType)}, ${sqlNum(s.chargingSpeedKw)}, ${sqlJsonb(s.availability)}, ${sqlBool(s.verified)}, ${sqlStr(s.status)})`,
);
const valuesBlock = rows.join(",\n");

const path = "supabase/schema.sql";
const original = readFileSync(path, "utf8");

const startMarker = "select * from (values\n";
const endMarker = "\n) as seed(";

const startIdx = original.indexOf(startMarker);
const endIdx = original.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) {
  throw new Error("Could not find seed VALUES block markers in schema.sql");
}

const before = original.slice(0, startIdx + startMarker.length);
const after = original.slice(endIdx);
const updated = before + valuesBlock + after;

writeFileSync(path, updated, "utf8");
console.log(`Wrote ${rows.length} seed rows into ${path}`);
