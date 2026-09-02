/**
 * Apply supabase/migrations to the linked project.
 *
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
 *   $env:PROJECT_REF = "fioiyojnhiivbegkqjiq"
 *   node scripts/setup-new-supabase.mjs
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const migrationsDir = resolve(root, "supabase/migrations");
const API = "https://api.supabase.com/v1";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.PROJECT_REF;

if (!token || !projectRef) {
  console.error("Set SUPABASE_ACCESS_TOKEN and PROJECT_REF, then retry.");
  process.exit(1);
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(data?.message ?? text ?? res.statusText);
  }
  return data;
}

async function runSql(query) {
  return api(`/projects/${projectRef}/database/query`, {
    method: "POST",
    body: { query },
  });
}

function migrationFiles() {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

const startFrom = process.env.START_FROM ?? "";

async function main() {
  const project = await api(`/projects/${projectRef}`);
  console.log(`Linked project: ${project.name} (${projectRef})`);

  let files = migrationFiles();
  if (startFrom) {
    files = files.filter((f) => f >= startFrom);
  }
  const doneFile = resolve(root, ".supabase-setup.json");
  const done = existsSync(doneFile) ? JSON.parse(readFileSync(doneFile, "utf8")).done ?? [] : [];

  console.log(`Applying ${files.length} migrations...\n`);

  for (const file of files) {
    if (done.includes(file)) {
      console.log(`  ${file} ... skip`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    process.stdout.write(`  ${file} ... `);
    try {
      await runSql(sql);
      console.log("ok");
      done.push(file);
      writeFileSync(doneFile, JSON.stringify({ projectRef, done }, null, 2));
    } catch (err) {
      console.log("FAILED");
      console.error(`\nMigration failed: ${file}\n${err.message}`);
      process.exit(1);
    }
  }

  console.log("\nMigrations complete.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
