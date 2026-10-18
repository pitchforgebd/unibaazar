import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const envFile = readFileSync(join(root, ".env"), "utf8");
const match = envFile.match(/^DATABASE_URL=(.*)$/m);
const raw = match?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!raw) {
  console.error("DATABASE_URL is missing from .env");
  process.exit(1);
}

const db = new URL(raw);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
// On the server this is set to the shared backups dir (survives every
// release): BACKUP_DIR=/home/USER/unibaazar/shared/backups. Defaults to a
// repo-root folder for local use.
const folder = process.env.BACKUP_DIR ?? join(root, "backups");
const keep = Number(process.env.BACKUP_KEEP ?? 14);
mkdirSync(folder, { recursive: true });
const file = join(folder, `unibaazar-${stamp}.sql`);
const result = spawnSync(
  "mysqldump",
  [
    "-h",
    db.hostname,
    "-P",
    db.port || "3306",
    "-u",
    decodeURIComponent(db.username),
    "--single-transaction",
    decodeURIComponent(db.pathname.replace(/^\//, "")),
  ],
  {
    env: { ...process.env, MYSQL_PWD: decodeURIComponent(db.password) },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  },
);

if (result.error || result.status !== 0) {
  console.error(result.error?.message ?? result.stderr ?? "mysqldump failed");
  process.exit(result.status ?? 1);
}

writeFileSync(file, result.stdout);
console.log(file);

const backups = readdirSync(folder)
  .filter((name) => name.startsWith("unibaazar-") && name.endsWith(".sql"))
  .map((name) => ({
    name,
    path: join(folder, name),
    mtime: statSync(join(folder, name)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

for (const old of backups.slice(keep)) {
  unlinkSync(old.path);
  console.log(`removed old backup: ${old.name}`);
}
