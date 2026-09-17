require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function migrate() {
  const client = await pool.connect();

  try {
    // Ensure the tracking table exists before anything else.
    // This is the only SQL executed outside a transaction in this runner.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows: applied } = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(applied.map(r => r.filename));

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let ranCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[MIGRATE] ⏭  Skipping ${file} (already applied)`);
        skippedCount++;
        continue;
      }

      console.log(`[MIGRATE] ▶  Running ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      // Run each migration in its own transaction so a failure in one file
      // doesn't corrupt a partial state.
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[MIGRATE] ✓  ${file} applied.`);
        ranCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[MIGRATE] ✗  ${file} FAILED: ${err.message}`);
        throw err;
      }
    }

    console.log(
      `[MIGRATE] Done. Applied: ${ranCount}, Skipped: ${skippedCount}, Total: ${files.length}`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('[MIGRATE] Fatal error:', err.message);
  process.exit(1);
});
