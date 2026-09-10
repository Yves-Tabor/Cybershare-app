const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
});

async function runMigration(filePath) {
  console.log(`Running migration: ${filePath}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`✓ Migration completed successfully: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`✗ Migration failed: ${path.basename(filePath)}`);
    console.error(error.message);
    return false;
  }
}

async function main() {
  console.log('Starting Cascade migrations...\n');

  const migrations = [
    path.join(__dirname, '../sql/cascade_migration.sql'),
    path.join(__dirname, '../sql/backfill_group_tags.sql'),
    path.join(__dirname, '../sql/cascade_vulnerability_types_seed.sql'),
  ];

  let allSuccess = true;
  for (const migration of migrations) {
    if (!fs.existsSync(migration)) {
      console.warn(`⚠ Migration file not found: ${migration}`);
      continue;
    }
    const success = await runMigration(migration);
    if (!success) allSuccess = false;
  }

  await pool.end();

  if (allSuccess) {
    console.log('\n✓ All migrations completed successfully!');
    process.exit(0);
  } else {
    console.log('\n✗ Some migrations failed. Please check the errors above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
