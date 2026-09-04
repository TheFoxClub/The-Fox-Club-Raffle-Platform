#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

require("../server/config/loadEnv");

const backupDirectory = path.resolve(
  process.env.DB_BACKUP_DIRECTORY || path.join(__dirname, "..", "backups", "database"),
);
const retentionDays = Number(process.env.DB_BACKUP_RETENTION_DAYS || 30);
const windowsDumpBinary = "C:\\Program Files\\MariaDB 12.2\\bin\\mariadb-dump.exe";
const dumpBinary = process.env.MARIADB_DUMP_BIN || (
  process.platform === "win32" && fs.existsSync(windowsDumpBinary)
    ? windowsDumpBinary
    : "mariadb-dump"
);
const database = process.env.PRODUCTION_DB_NAME || process.env.DB_NAME;
const host = process.env.PRODUCTION_DB_HOST || process.env.DB_HOST || "localhost";
const port = Number(process.env.PRODUCTION_DB_PORT || process.env.DB_PORT || 3306);
const user = process.env.PRODUCTION_DB_USERNAME || process.env.DB_USERNAME;
const password = process.env.PRODUCTION_DB_PASSWORD || process.env.DB_PASSWORD;

const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const removeExpiredBackups = () => {
  if (!Number.isFinite(retentionDays) || retentionDays < 1) {
    return;
  }

  const expiry = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(backupDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".sql")) {
      continue;
    }

    const filePath = path.join(backupDirectory, entry.name);
    if (fs.statSync(filePath).mtimeMs < expiry) {
      fs.unlinkSync(filePath);
      console.log(`Removed expired backup: ${entry.name}`);
    }
  }
};

const main = async () => {
  if (!database || !user) {
    throw new Error("Missing DB credentials. Configure DB_USERNAME and DB_NAME (or PRODUCTION_DB_* variants).");
  }

  fs.mkdirSync(backupDirectory, { recursive: true });
  removeExpiredBackups();

  const outputPath = path.join(backupDirectory, `${database}_${timestamp()}.sql`);
  const output = fs.openSync(outputPath, "w");
  const child = spawn(
    dumpBinary,
    ["--host", host, "--port", String(port), "--user", user, "--single-transaction", "--routines", "--events", "--databases", database],
    {
      env: { ...process.env, MYSQL_PWD: password || "" },
      stdio: ["ignore", output, "pipe"],
      windowsHide: true,
    },
  );

  let errorOutput = "";
  child.stderr.on("data", (chunk) => {
    errorOutput += chunk;
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  fs.closeSync(output);

  if (exitCode !== 0) {
    fs.rmSync(outputPath, { force: true });
    throw new Error(errorOutput.trim() || `${dumpBinary} exited with code ${exitCode}`);
  }

  console.log(`Database backup completed: ${outputPath}`);
};

main().catch((error) => {
  console.error(`Database backup failed: ${error.message}`);
  process.exit(1);
});