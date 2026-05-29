#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const Importer = require("mysql-import");
const mysql = require("mysql2/promise");

require("../server/config/loadEnv");

const nowStamp = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
};

const dbConfig = {
  host: process.env.PRODUCTION_DB_HOST || process.env.DB_HOST || "localhost",
  port: Number(process.env.PRODUCTION_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.PRODUCTION_DB_USERNAME || process.env.DB_USERNAME,
  password: process.env.PRODUCTION_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.PRODUCTION_DB_NAME || process.env.DB_NAME,
};

const dumpPathArg = process.argv[2];
if (!dumpPathArg) {
  console.error("Usage: node scripts/import-db-dump.js <absolute-path-to-sql-dump>");
  process.exit(1);
}

const dumpPath = path.resolve(dumpPathArg);
if (!fs.existsSync(dumpPath)) {
  console.error(`Dump file not found: ${dumpPath}`);
  process.exit(1);
}

if (!dbConfig.user || !dbConfig.database) {
  console.error("Missing DB env config. Required: DB_USERNAME and DB_NAME (or PRODUCTION_DB_* variants).");
  process.exit(1);
}

const quoteId = (value) => `\`${String(value).replace(/`/g, "``")}\``;

const createBackup = async () => {
  const admin = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
  });

  try {
    const backupDbName = `${dbConfig.database}_backup_${nowStamp()}`;
    await admin.query(`CREATE DATABASE ${quoteId(backupDbName)}`);

    const [tables] = await admin.query(
      `
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE table_schema = ? AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
      `,
      [dbConfig.database],
    );

    await admin.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const row of tables) {
      const table = row.TABLE_NAME;
      await admin.query(
        `CREATE TABLE ${quoteId(backupDbName)}.${quoteId(table)} LIKE ${quoteId(dbConfig.database)}.${quoteId(table)}`,
      );
      await admin.query(
        `INSERT INTO ${quoteId(backupDbName)}.${quoteId(table)} SELECT * FROM ${quoteId(dbConfig.database)}.${quoteId(table)}`,
      );
    }
    await admin.query("SET FOREIGN_KEY_CHECKS = 1");

    return { backupDbName, tableCount: tables.length };
  } finally {
    await admin.end();
  }
};

const importDump = async () => {
  const importer = new Importer({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
  });

  await importer.import(dumpPath);
  return importer.getImported();
};

const verify = async () => {
  const conn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
  });

  try {
    const summaryTables = ["users", "raffles", "raffle_tickets", "raffle_rewards", "airdrop_details"];
    for (const table of summaryTables) {
      const [rows] = await conn.query(`SELECT COUNT(*) AS count FROM ${quoteId(table)}`);
      const count = rows[0]?.count ?? 0;
      console.log(`Row count ${table}: ${count}`);
    }
  } finally {
    await conn.end();
  }
};

const main = async () => {
  console.log(`Preparing import for DB: ${dbConfig.database} (${dbConfig.host}:${dbConfig.port})`);
  console.log(`Using dump file: ${dumpPath}`);

  const backup = await createBackup();
  console.log(`Backup created: ${backup.backupDbName} (${backup.tableCount} tables)`);

  const importedFiles = await importDump();
  console.log(`Imported files: ${importedFiles.join(", ")}`);

  await verify();
  console.log("Dump import completed successfully.");
};

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
});
