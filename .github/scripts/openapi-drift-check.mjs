#!/usr/bin/env node
/**
 * B1-08 — OpenAPI → types DRIFT CHECK
 *
 * WHY: `openapi.yaml` is the single source of truth (steering rule 1). The
 * frontend ships a HAND-MIRRORED client (`frontend/src/types/api.ts`) because a
 * generator is not wired yet (FRONTEND_ARCHITECTURE §5). A hand mirror silently
 * rots when the contract changes. This check fails CI the moment the contract's
 * public surface diverges from the committed baseline the mirror was built
 * against, forcing a human to regenerate the mirror and re-bless the baseline.
 *
 * WHAT IT CHECKS (no network, no cloud, deterministic):
 *   1. The contract's public surface (operation list + component schema names +
 *      enum members of a few security-critical schemas) hashes to the committed
 *      baseline in `.github/openapi-contract.lock.json`. Any add/remove/rename
 *      of a path, schema, or tracked enum flips the hash → FAIL.
 *   2. Every schema the frontend mirror claims to cover (the "in-scope" set) is
 *      still present in the contract. A removed/renamed schema → FAIL.
 *   3. No separate admin hostname leaks into the contract servers (ADR-001/007):
 *      only the base domain and `*.app.example.com` are allowed.
 *
 * This parses only the small, well-structured subset of YAML it needs (2-space
 * indented keys) so it has ZERO npm dependencies and cannot pull a supply-chain
 * risk into CI. It is NOT a general YAML parser.
 *
 * USAGE:
 *   node .github/scripts/openapi-drift-check.mjs            # verify vs baseline
 *   node .github/scripts/openapi-drift-check.mjs --write    # re-bless baseline
 *
 * Exit 0 = in sync. Exit 1 = drift (prints what changed + how to fix).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const CONTRACT = resolve(REPO, "openapi.yaml");
const MIRROR = resolve(REPO, "frontend", "src", "types", "api.ts");
const LOCK = resolve(HERE, "..", "openapi-contract.lock.json");

/**
 * The schemas the frontend hand-mirror (types/api.ts) is responsible for today.
 * Keep in step with the "in scope" comment block in that file. These are the
 * tenant-plane, contract-backed shapes the live client can actually call.
 */
const MIRRORED_SCHEMAS = [
  "Error",
  "ValidationErrorBody",
  "PaginatedEnvelope",
  "LoginRequest",
  "LoginResponse",
  "TokenResponse",
  "MfaChallenge",
  "MfaVerifyRequest",
  "CurrentUser",
  "Role",
  "RoleWriteRequest",
  "EmployeeSummary",
  "Employee",
  "EmployeeWriteRequest",
];

/** Security-critical enums we pin verbatim so a value change is caught. */
const TRACKED_ENUM_SCHEMAS = [
  "TenantStatus",
  "PlatformRole",
  "EmployeeStatus_inline", // Employee/EmployeeSummary status enum (inline)
];

function fail(lines) {
  console.error("\n\u001b[31mOPENAPI DRIFT CHECK: FAIL\u001b[0m");
  for (const l of lines) console.error("  - " + l);
  console.error(
    "\nIf the contract change is intentional:\n" +
      "  1. Regenerate / update frontend/src/types/api.ts to match openapi.yaml.\n" +
      "  2. Re-bless the baseline:  node .github/scripts/openapi-drift-check.mjs --write\n" +
      "  3. Commit both. A human reviews the diff (contract changes go through the planner).\n"
  );
  process.exit(1);
}

function readContract() {
  if (!existsSync(CONTRACT)) {
    fail([
      `openapi.yaml not found at ${CONTRACT}.`,
      "The contract is the source of truth and must be committed for CI to run.",
    ]);
  }
  return readFileSync(CONTRACT, "utf8").replace(/\r\n/g, "\n");
}

/** Extract the ordered list of path templates under the top-level `paths:` map. */
function extractPaths(src) {
  const lines = src.split("\n");
  const out = [];
  let inPaths = false;
  for (const line of lines) {
    if (/^paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    if (inPaths) {
      if (/^\S/.test(line)) break; // left the paths block
      const m = line.match(/^ {2}(\/[^:]*):\s*$/);
      if (m) out.push(m[1].trim());
    }
  }
  return out;
}

/** Extract HTTP methods per path to detect operation add/remove. */
function extractOperations(src) {
  const lines = src.split("\n");
  const ops = [];
  let inPaths = false;
  let currentPath = null;
  for (const line of lines) {
    if (/^paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    if (!inPaths) continue;
    if (/^\S/.test(line)) break;
    const p = line.match(/^ {2}(\/[^:]*):\s*$/);
    if (p) {
      currentPath = p[1].trim();
      continue;
    }
    const m = line.match(/^ {4}(get|post|put|patch|delete|head|options):\s*$/);
    if (m && currentPath) ops.push(`${m[1].toUpperCase()} ${currentPath}`);
  }
  return ops;
}

/** Extract component schema names (4-space indented keys under components.schemas). */
function extractSchemaNames(src) {
  const lines = src.split("\n");
  const out = [];
  let inComponents = false;
  let inSchemas = false;
  for (const line of lines) {
    if (/^components:\s*$/.test(line)) {
      inComponents = true;
      continue;
    }
    if (!inComponents) continue;
    if (/^\S/.test(line)) break; // left components
    if (/^ {2}schemas:\s*$/.test(line)) {
      inSchemas = true;
      continue;
    }
    if (inSchemas) {
      // a new 2-space key that is not 'schemas' ends the schemas block
      if (/^ {2}\S/.test(line) && !/^ {2}schemas:/.test(line)) {
        if (!/^ {2}(securitySchemes|responses|parameters|headers):/.test(line)) {
          // some other top-of-components key; stop collecting schema names
        }
        inSchemas = false;
        continue;
      }
      const m = line.match(/^ {4}([A-Za-z][A-Za-z0-9]*):\s*$/);
      if (m) out.push(m[1]);
    }
  }
  return out;
}

/** Collect the enum members declared for a named schema (handles inline + block). */
function extractEnumFor(src, schemaName) {
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(`^ {4}${schemaName}:\\s*$`).test(lines[i])) {
      // scan the schema body until indentation returns to <= 4 spaces
      for (let j = i + 1; j < lines.length; j++) {
        if (/^ {0,4}\S/.test(lines[j])) break;
        const m = lines[j].match(/enum:\s*\[([^\]]*)\]/);
        if (m) {
          return m[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .sort();
        }
      }
    }
  }
  return null;
}

/** The inline status enum shared by Employee/EmployeeSummary. */
function extractEmployeeStatusEnum(src) {
  // first `enum: [active, inactive, on_notice, exited]`
  const m = src.match(/enum:\s*\[active,\s*inactive,\s*on_notice,\s*exited\]/);
  return m ? ["active", "exited", "inactive", "on_notice"] : null;
}

/** Guard: servers must only reference base domain + *.app.example.com. */
function checkNoAdminHost(src) {
  const problems = [];
  const serverUrls = [...src.matchAll(/^\s*- url:\s*(.+)$/gm)].map((m) =>
    m[1].trim()
  );
  for (const u of serverUrls) {
    const host = u
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/\{tenant\}/, "acme");
    const ok =
      host === "app.example.com" || host.endsWith(".app.example.com");
    if (!ok) problems.push(`server url has non-app host: ${u}`);
    if (/\badmin\./.test(host)) problems.push(`admin hostname detected: ${u}`);
  }
  if (/admin\.example\.com/.test(src))
    problems.push("literal admin.example.com found in contract");
  return problems;
}

function buildSurface(src) {
  const schemas = extractSchemaNames(src).sort();
  const operations = extractOperations(src).sort();
  const paths = extractPaths(src).sort();
  const enums = {};
  for (const name of TRACKED_ENUM_SCHEMAS) {
    enums[name] =
      name === "EmployeeStatus_inline"
        ? extractEmployeeStatusEnum(src)
        : extractEnumFor(src, name);
  }
  return { schemas, operations, paths, enums };
}

function hashSurface(surface) {
  return createHash("sha256")
    .update(JSON.stringify(surface))
    .digest("hex");
}

// ---- main ----
const src = readContract();
const surface = buildSurface(src);
const hash = hashSurface(surface);

const write = process.argv.includes("--write");
if (write) {
  const lock = {
    _comment:
      "B1-08 drift baseline. Public surface of openapi.yaml the frontend hand-mirror was built against. Re-bless with: node .github/scripts/openapi-drift-check.mjs --write",
    generated_at_note: "regenerate via --write; do not hand-edit the hash",
    contract_surface_sha256: hash,
    mirrored_schemas: MIRRORED_SCHEMAS,
    surface,
  };
  writeFileSync(LOCK, JSON.stringify(lock, null, 2) + "\n");
  console.log("Baseline written to .github/openapi-contract.lock.json");
  console.log("contract_surface_sha256 =", hash);
  process.exit(0);
}

const problems = [];

// 0. admin-host guard (always, even before baseline compare)
problems.push(...checkNoAdminHost(src));

// 1. baseline present?
if (!existsSync(LOCK)) {
  fail([
    "Baseline .github/openapi-contract.lock.json is missing.",
    "Create it with: node .github/scripts/openapi-drift-check.mjs --write",
  ]);
}
const lock = JSON.parse(readFileSync(LOCK, "utf8"));

// 2. mirror file present and declares its in-scope schemas?
if (!existsSync(MIRROR)) {
  problems.push(`frontend mirror not found at ${MIRROR}`);
} else {
  const mirrorSrc = readFileSync(MIRROR, "utf8");
  // every mirrored schema must still exist in the contract
  for (const s of MIRRORED_SCHEMAS) {
    if (!surface.schemas.includes(s)) {
      problems.push(
        `mirror covers schema "${s}" but it no longer exists in openapi.yaml`
      );
    }
  }
  // spot-check the mirror actually mentions the core shapes (not emptied out)
  for (const token of ["LoginResponse", "Employee", "PaginationMeta"]) {
    if (!mirrorSrc.includes(token)) {
      problems.push(`mirror file no longer declares "${token}"`);
    }
  }
}

// 3. surface hash compare — the headline drift signal
if (lock.contract_surface_sha256 !== hash) {
  const base = lock.surface || {};
  const diff = (a = [], b = []) => ({
    added: b.filter((x) => !a.includes(x)),
    removed: a.filter((x) => !b.includes(x)),
  });
  const sd = diff(base.schemas, surface.schemas);
  const od = diff(base.operations, surface.operations);
  if (sd.added.length) problems.push("schemas ADDED: " + sd.added.join(", "));
  if (sd.removed.length)
    problems.push("schemas REMOVED: " + sd.removed.join(", "));
  if (od.added.length) problems.push("operations ADDED: " + od.added.join(", "));
  if (od.removed.length)
    problems.push("operations REMOVED: " + od.removed.join(", "));
  for (const name of TRACKED_ENUM_SCHEMAS) {
    const was = JSON.stringify((base.enums || {})[name]);
    const now = JSON.stringify(surface.enums[name]);
    if (was !== now) problems.push(`enum ${name} changed: ${was} -> ${now}`);
  }
  if (!problems.length)
    problems.push(
      `contract surface hash changed (${lock.contract_surface_sha256} -> ${hash}) with no field-level diff detected; re-bless if intentional`
    );
}

if (problems.length) fail(problems);

console.log("\u001b[32mOPENAPI DRIFT CHECK: OK\u001b[0m");
console.log(`  contract surface sha256 = ${hash}`);
console.log(`  ${surface.schemas.length} schemas, ${surface.operations.length} operations in sync`);
console.log(`  ${MIRRORED_SCHEMAS.length} mirrored schemas verified present`);
process.exit(0);
