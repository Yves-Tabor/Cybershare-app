const pool = require('../config/database');

// Ensure saved_items schema supports custom link columns and migrate legacy link resources
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL,
        item_id INTEGER,
        url TEXT,
        title TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE saved_items ADD COLUMN IF NOT EXISTS url TEXT;
      ALTER TABLE saved_items ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE saved_items ADD COLUMN IF NOT EXISTS note TEXT;
      ALTER TABLE saved_items ALTER COLUMN item_id DROP NOT NULL;
    `);

    // Copy legacy 'Link' resources data into saved_items
    await pool.query(`
      UPDATE saved_items s
      SET item_type = 'LINK',
          url = r.url,
          title = r.title,
          note = r.description,
          item_id = NULL
      FROM resources r
      WHERE UPPER(s.item_type) = 'RESOURCE'
        AND s.item_id = r.id
        AND r.category = 'Link';
    `);

    // Remove legacy 'Link' rows from resources table
    await pool.query(`
      DELETE FROM resources WHERE category = 'Link';
    `);
  } catch (err) {
    console.error("Error setting up saved_items table / migrating legacy links:", err);
  }
})();

const getSavedItems = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, item_type, item_id, url, title, note, created_at 
       FROM saved_items 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    const items = [];
    for (const row of result.rows) {
      const typeLower = (row.item_type || '').toLowerCase();

      if (typeLower === 'link') {
        let domain = row.url || '';
        try {
          const u = new URL(/^https?:\/\//i.test(row.url) ? row.url : `https://${row.url}`);
          domain = u.hostname.replace(/^www\./, "");
        } catch (e) {}

        items.push({
          id: row.id,
          real_id: row.id,
          type: 'link',
          category: 'Link',
          title: row.title || domain,
          snippet: row.note || `Saved link from ${domain}`,
          url: row.url,
          domain: domain,
          savedAt: new Date(row.created_at).getTime(),
        });
      } else if (typeLower === 'resource') {
        const resData = await pool.query(
          `SELECT r.id, r.title, r.description, r.url, r.category,
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
            type: 'resource',
            category: r.category,
            title: r.title,
            snippet: r.description,
            url: r.url,
            domain: domain,
            fileId: r.file_id,
            fileName: r.file_name,
            savedAt: new Date(row.created_at).getTime(),
          });
        }
      } else if (typeLower === 'post') {
        const postData = await pool.query(
          `SELECT p.id, p.content, p.created_at,
                  u.id as author_id, u.username as author_username, u.avatar as author_avatar, u.color as author_color,
                  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes,
                  (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments
           FROM posts p
           JOIN users u ON p.user_id = u.id
           WHERE p.id = $1`,
          [row.item_id]
        );
        if (postData.rows.length > 0) {
          const p = postData.rows[0];
          items.push({
            id: row.id,
            real_id: p.id,
            type: 'post',
            title: p.content.length > 70 ? p.content.slice(0, 70) + '…' : p.content,
            snippet: p.content,
            author: p.author_username,
            authorAvatar: p.author_avatar,
            authorColor: p.author_color,
            context: 'Global feed',
            meta: {
              likes: parseInt(p.likes || 0),
              comments: parseInt(p.comments || 0),
            },
            post: {
              id: p.id,
              content: p.content,
              createdAt: p.created_at,
              user: {
                id: p.author_id,
                username: p.author_username,
                avatar: p.author_avatar,
                color: p.author_color,
              },
            },
            savedAt: new Date(row.created_at).getTime(),
          });
        }
      } else if (typeLower === 'event') {
        const eventData = await pool.query(
          `SELECT id, title, description, location, start_date, end_date, category
           FROM events
           WHERE id = $1`,
          [row.item_id]
        );
        if (eventData.rows.length > 0) {
          const e = eventData.rows[0];
          const startDate = new Date(e.start_date);
          items.push({
            id: row.id,
            real_id: e.id,
            type: 'event',
            title: e.title,
            snippet: e.description,
            context: e.location || 'Online',
            date: startDate.toISOString().split('T')[0],
            time: startDate.toTimeString().slice(0, 5),
            category: e.category,
            savedAt: new Date(row.created_at).getTime(),
          });
        }
      }
    }

    res.status(200).json({ items });
  } catch (error) {
    console.error('Get saved items error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const saveItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { item_type, item_id, url, title, note } = req.body;

    // Handle custom link saving (saves directly to saved_items table, NOT resources!)
    if (item_type?.toLowerCase() === 'link' || (url && !item_id)) {
      if (!url) {
        return res.status(400).json({ error: 'URL is required to save a link' });
      }

      let domain = url;
      try {
        const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
        domain = u.hostname.replace(/^www\./, "");
      } catch (e) {}

      const savedResult = await pool.query(
        `INSERT INTO saved_items (user_id, item_type, url, title, note)
         VALUES ($1, 'LINK', $2, $3, $4)
         RETURNING id, item_type, url, title, note, created_at`,
        [userId, url.trim(), title?.trim() || domain, note?.trim() || `Saved from ${domain}`]
      );
      const savedRow = savedResult.rows[0];

      return res.status(201).json({
        message: 'Link saved',
        item: {
          id: savedRow.id,
          real_id: savedRow.id,
          type: 'link',
          category: 'Link',
          title: savedRow.title,
          snippet: savedRow.note,
          url: savedRow.url,
          domain: domain,
          savedAt: new Date(savedRow.created_at).getTime(),
        }
      });
    }

    if (!item_type || !item_id) {
      return res.status(400).json({ error: 'item_type and item_id are required' });
    }

    const dbItemType = item_type.toUpperCase();
    if (!['POST', 'RESOURCE', 'EVENT'].includes(dbItemType)) {
      return res.status(400).json({ error: 'Invalid item_type. Must be POST, RESOURCE, or EVENT' });
    }

    const result = await pool.query(
      `INSERT INTO saved_items (user_id, item_type, item_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET created_at = CURRENT_TIMESTAMP
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
    const id = req.params.id || req.query.id || req.body?.id;
    const item_type = req.query.item_type || req.body?.item_type;
    const item_id = req.query.item_id || req.body?.item_id;

    // 1. If primary key ID of saved_items is provided:
    if (id) {
      const result = await pool.query(
        `DELETE FROM saved_items 
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [id, userId]
      );

      if (result.rowCount === 0) {
        // Try fallback if id might have been item_id
        await pool.query(
          `DELETE FROM saved_items 
           WHERE item_id = $1 AND user_id = $2`,
          [id, userId]
        );
      }

      return res.status(200).json({ message: 'Item unsaved successfully' });
    }

    // 2. If item_type and item_id are provided:
    if (item_type && item_id) {
      await pool.query(
        `DELETE FROM saved_items 
         WHERE user_id = $1 AND UPPER(item_type) = UPPER($2) AND item_id = $3`,
        [userId, item_type, item_id]
      );

      return res.status(200).json({ message: 'Item unsaved successfully' });
    }

    return res.status(400).json({ error: 'id or (item_type and item_id) are required' });
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
