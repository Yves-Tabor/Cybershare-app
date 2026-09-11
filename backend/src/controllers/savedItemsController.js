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
      const typeLower = (row.item_type || '').toLowerCase();

      if (typeLower === 'resource') {
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

    // Handle custom link saving (creates a resource with category 'Link' and saves it)
    if (item_type?.toLowerCase() === 'link' || (url && !item_id)) {
      if (!url) {
        return res.status(400).json({ error: 'URL is required to save a link' });
      }

      let domain = url;
      try {
        const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
        domain = u.hostname.replace(/^www\./, "");
      } catch (e) {}

      const resourceResult = await pool.query(
        `INSERT INTO resources (title, description, url, category, user_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, description, url, category, created_at`,
        [title?.trim() || domain, note?.trim() || `Saved from ${domain}`, url.trim(), 'Link', userId]
      );
      const newResource = resourceResult.rows[0];

      const savedResult = await pool.query(
        `INSERT INTO saved_items (user_id, item_type, item_id)
         VALUES ($1, 'RESOURCE', $2)
         ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET created_at = CURRENT_TIMESTAMP
         RETURNING id, item_type, item_id, created_at`,
        [userId, newResource.id]
      );

      return res.status(201).json({
        message: 'Link saved',
        item: {
          id: savedResult.rows[0].id,
          real_id: newResource.id,
          type: 'resource',
          category: 'Link',
          title: newResource.title,
          snippet: newResource.description,
          url: newResource.url,
          domain: domain,
          savedAt: new Date(savedResult.rows[0].created_at).getTime(),
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
