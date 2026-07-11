const db = require("./src/config/database");

async function migrate() {
  try {
    console.log("Adding attachment columns to group_posts...");
    await db.query(`
      ALTER TABLE group_posts 
      ADD COLUMN IF NOT EXISTS attachment_data BYTEA,
      ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(100);
    `);
    console.log("Migration successful.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
