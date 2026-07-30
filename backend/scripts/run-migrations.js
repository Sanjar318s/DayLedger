const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const { rows: done } = await pool.query('SELECT name FROM _migrations');
  const doneSet = new Set(done.map(r => r.name));

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (doneSet.has(file)) {
      console.log(`  SKIP ${file} (already run)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`  RUN ${file}...`);
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    console.log(`  DONE ${file}`);
  }

  await pool.end();
  console.log('Migrations complete.');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
