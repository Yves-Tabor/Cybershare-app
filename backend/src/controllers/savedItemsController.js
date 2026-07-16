const pool = require('../config/database');

const getSavedItems = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, item_type, item_id, created_at 
       FROM saved_items 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    const items = [];
    for (const row of result.rows) {
      const typeLower = row.item_type.toLowerCase();
      if (typeLower === 'resource') {
        const resData = await pool.query(
          `SELECT r.id, r.title, r.description, r.url,
                  (SELECT id FROM resource_files WHERE resource_id = r.id LIMIT 1) as file_id,
                  (SELECT originalname FROM resource_files WHERE resource_id = r.id LIMIT 1) as file_name
           FROM resources r 
           WHERE r.id = $1`,
          [row.item_id]
        );
        if (resData.rows.length > 0) {
          const r = resData.rows[0];
          let domain = r.url;
          try {
             const u = new URL(/^https?:\/\//i.test(r.url) ? r.url : `https://${r.url}`);
             domain = u.hostname.replace(/^www\./, "");
          } catch (e) {}

          items.push({
            id: row.id, // the saved item's DB id
            real_id: r.id, // ID in the original table
            type: typeLower,
            title: r.title,
            snippet: r.description,
            url: r.url,
            domain: domain,
            fileId: r.file_id,
            fileName: r.file_name,
            savedAt: new Date(row.created_at).getTime()
          });
        }
      }
      // Can add support for 'post' and 'event' here in the future
    }

    res.status(200).json({ items });
  } catch (error) {
    console.error('Get saved items error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message, stack: error.stack });
  }
};

const saveItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { item_type, item_id } = req.body;

    if (!item_type || !item_id) {
      return res.status(400).json({ error: 'item_type and item_id are required' });
    }

    const dbItemType = item_type.toUpperCase();

    const result = await pool.query(
      `INSERT INTO saved_items (user_id, item_type, item_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_type, item_id) DO NOTHING
       RETURNING id, item_type, item_id, created_at`,
      [userId, dbItemType, item_id]
    );

    res.status(201).json({ message: 'Item saved', item: result.rows[0] });
  } catch (error) {
    console.error('Save item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const unsaveItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { item_type, item_id } = req.query; // Accept from query params

    if (!item_type || !item_id) {
      return res.status(400).json({ error: 'item_type and item_id are required' });
    }

    const dbItemType = item_type.toUpperCase();

    await pool.query(
      `DELETE FROM saved_items 
       WHERE user_id = $1 AND item_type = $2 AND item_id = $3`,
      [userId, dbItemType, item_id]
    );

    res.status(200).json({ message: 'Item unsaved successfully' });
  } catch (error) {
    console.error('Unsave item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getSavedItems,
  saveItem,
  unsaveItem
};
