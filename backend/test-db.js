const pool = require('./src/config/database');
const getItems = async () => {
  try {
    const result = await pool.query(
      `SELECT id, item_type, item_id, saved_at 
       FROM saved_items 
       ORDER BY saved_at DESC`
    );
    console.log(result.rows);
  } catch(e) {
    console.error("DB error:", e);
  }
};
getItems().then(() => process.exit(0));
