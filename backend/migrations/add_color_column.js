const pool = require('../src/config/database');

async function addColorColumn() {
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#534AB7'
    `);
    console.log('Successfully added color column to users table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding color column:', error);
    process.exit(1);
  }
}

addColorColumn();
