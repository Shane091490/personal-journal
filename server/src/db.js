import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || "db",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "journal",
  password: process.env.PGPASSWORD || "journal",
  database: process.env.PGDATABASE || "journal",
});

export async function waitForDb(retries = 30, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
