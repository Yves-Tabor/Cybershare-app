-- ============================================
-- Backfill tags for existing community groups
-- This script adds relevant security tags to existing groups
-- so the related-groups panel returns meaningful results
-- ============================================

-- Update groups with security-related tags based on their category/name
-- These tags match the tags in vulnerability_types for proper matching

UPDATE groups
SET tags = ARRAY['http-headers', 'security-headers', 'csp', 'hsts']
WHERE LOWER(name) LIKE '%header%' OR LOWER(name) LIKE '%http%' OR LOWER(name) LIKE '%csp%';

UPDATE groups
SET tags = ARRAY['ssl', 'tls', 'encryption', 'network-security']
WHERE LOWER(name) LIKE '%ssl%' OR LOWER(name) LIKE '%tls%' OR LOWER(name) LIKE '%https%' OR LOWER(name) LIKE '%certificate%';

UPDATE groups
SET tags = ARRAY['cookies', 'session-security', 'xss', 'http-headers']
WHERE LOWER(name) LIKE '%cookie%' OR LOWER(name) LIKE '%session%';

UPDATE groups
SET tags = ARRAY['information-disclosure', 'http-headers', 'reconnaissance']
WHERE LOWER(name) LIKE '%disclosure%' OR LOWER(name) LIKE '%information%' OR LOWER(name) LIKE '%fingerprint%';

UPDATE groups
SET tags = ARRAY['xss', 'frontend', 'security-headers', 'csp']
WHERE LOWER(name) LIKE '%xss%' OR LOWER(name) LIKE '%cross-site%';

UPDATE groups
SET tags = ARRAY['csrf', 'session-security', 'cookies']
WHERE LOWER(name) LIKE '%csrf%' OR LOWER(name) LIKE '%cross-site request%';

UPDATE groups
SET tags = ARRAY['dns', 'network-security', 'reconnaissance']
WHERE LOWER(name) LIKE '%dns%' OR LOWER(name) LIKE '%domain%';

-- For groups that don't match specific patterns, add general security tags
UPDATE groups
SET tags = ARRAY['general', 'web-security']
WHERE tags IS NULL OR array_length(tags, 1) IS NULL;

-- Verify the updates
SELECT id, name, category, tags
FROM groups
ORDER BY id;
