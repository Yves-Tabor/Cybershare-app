const db = require("../config/database");

/**
 * Checks the database size and prunes the oldest attachments if it exceeds the limit.
 * Neon free tier provides 500MB. We start pruning at 400MB.
 */
async function checkAndPruneStorage() {
  const MAX_DB_SIZE_BYTES = 400 * 1024 * 1024; // 400 MB

  try {
    let sizeResult = await db.query("SELECT pg_database_size(current_database()) as size");
    let currentSize = parseInt(sizeResult.rows[0].size, 10);

    while (currentSize > MAX_DB_SIZE_BYTES) {
      console.log(`[StorageManager] Database size (${(currentSize / 1024 / 1024).toFixed(2)} MB) exceeds 400 MB threshold. Pruning oldest attachment...`);
      
      // Find the oldest group post with an attachment
      const oldestAttachmentQuery = `
        SELECT id FROM group_posts 
        WHERE attachment_data IS NOT NULL 
        ORDER BY created_at ASC 
        LIMIT 1
      `;
      
      const oldestAttachmentResult = await db.query(oldestAttachmentQuery);
      
      if (oldestAttachmentResult.rows.length === 0) {
        console.log("[StorageManager] No more group post attachments to prune.");
        break; // Nothing left to prune in group_posts
      }
      
      const postId = oldestAttachmentResult.rows[0].id;
      
      // Nullify the attachment data to free space
      await db.query(`
        UPDATE group_posts 
        SET attachment_data = NULL, 
            attachment_type = 'pruned', 
            attachment_name = 'Attachment removed (storage limit reached)'
        WHERE id = $1
      `, [postId]);
      
      console.log(`[StorageManager] Pruned attachment from post ${postId}.`);
      
      // Re-check size
      sizeResult = await db.query("SELECT pg_database_size(current_database()) as size");
      currentSize = parseInt(sizeResult.rows[0].size, 10);
    }
  } catch (error) {
    console.error("[StorageManager] Error during storage pruning:", error);
  }
}

module.exports = {
  checkAndPruneStorage
};
