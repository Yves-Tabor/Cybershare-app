-- ============================================
-- Cascade Feature Migration
-- ============================================

-- 1. Add tags column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 2. Create vulnerability_types table
CREATE TABLE IF NOT EXISTS vulnerability_types (
  type_slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  explanation_template TEXT NOT NULL,
  remediation_steps JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add type_slug FK to scan_findings
ALTER TABLE scan_findings ADD COLUMN IF NOT EXISTS type_slug TEXT REFERENCES vulnerability_types(type_slug) ON DELETE SET NULL;

-- 4. Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_scan_id ON feedback(scan_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_tags ON groups USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_vulnerability_types_tags ON vulnerability_types USING GIN(tags);

-- 5. Seed vulnerability_types with placeholder content
-- NOTE: These are placeholder templates. The user will supply the actual security content.

INSERT INTO vulnerability_types (type_slug, title, explanation_template, remediation_steps, tags) VALUES
(
  'missing-csp',
  'Missing Content-Security-Policy Header',
  'The website {domain} is missing a Content-Security-Policy (CSP) header. Without CSP, the browser cannot control which resources can be loaded, making it vulnerable to cross-site scripting (XSS) attacks. An attacker could inject malicious scripts that execute in the context of your site.',
  '["Identify which resources your site needs to load (scripts, styles, images, fonts, etc.)", "Create a CSP policy that only allows resources from trusted domains", "Start with a report-only policy to test without blocking resources", "Implement the CSP header with the Content-Security-Policy HTTP header", "Monitor CSP violation reports to refine your policy"]',
  ARRAY['http-headers', 'xss', 'security-headers', 'frontend']
),
(
  'weak-tls',
  'Weak TLS/SSL Configuration',
  'The website {domain} is using weak TLS/SSL protocols or ciphers. This allows attackers to downgrade the connection to insecure protocols, potentially intercepting or modifying traffic between users and your server.',
  '["Disable SSLv2 and SSLv3 protocols entirely", "Disable TLS 1.0 and TLS 1.1 if possible", "Configure strong cipher suites only", "Enable HSTS (HTTP Strict Transport Security) header", "Regularly test your TLS configuration using tools like SSL Labs"]',
  ARRAY['ssl', 'tls', 'encryption', 'network-security']
),
(
  'insecure-cookies',
  'Insecure Cookie Flags',
  'The website {domain} is setting cookies without proper security flags. Cookies without the Secure flag can be transmitted over unencrypted HTTP connections. Without HttpOnly, cookies are accessible to JavaScript, increasing XSS attack risk. Without SameSite, cookies may be sent in cross-site requests.',
  '["Add the Secure flag to all cookies (transmit only over HTTPS)", "Add the HttpOnly flag to prevent JavaScript access", "Set SameSite to Strict or Lax to control cross-site requests", "Review all cookie-setting code in your application", "Test cookie behavior in different browsers"]',
  ARRAY['cookies', 'session-security', 'xss', 'http-headers']
),
(
  'server-version-disclosure',
  'Server Version Information Disclosure',
  'The website {domain} is disclosing server version information in HTTP headers. This information helps attackers identify specific software versions and known vulnerabilities, making targeted attacks easier.',
  '["Configure your web server to hide version information", "Use generic server tokens instead of full version strings", "Remove or customize the Server header", "Remove X-Powered-By and similar framework headers", "Regularly update server software regardless of disclosure"]',
  ARRAY['information-disclosure', 'http-headers', 'reconnaissance']
),
(
  'missing-hsts',
  'Missing Strict-Transport-Security Header',
  'The website {domain} is missing the Strict-Transport-Security (HSTS) header. Without HSTS, browsers may attempt to connect over HTTP first, allowing protocol downgrade attacks where attackers can intercept or modify the initial connection.',
  '["Add the Strict-Transport-Security header to responses", "Set a reasonable max-age (e.g., 31536000 for one year)", "Include the includeSubDomains directive if applicable", "Consider preload submission after testing", "Ensure your site works entirely over HTTPS first"]',
  ARRAY['http-headers', 'hsts', 'https', 'security-headers']
)
ON CONFLICT (type_slug) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE vulnerability_types IS 'Vulnerability type definitions with explanation templates and remediation steps for the Cascade feature';
COMMENT ON COLUMN scan_findings.type_slug IS 'Foreign key to vulnerability_types for Cascade feature explanations';
COMMENT ON COLUMN groups.tags IS 'Tags for group categorization and matching with vulnerability types';
COMMENT ON TABLE feedback IS 'User feedback collected after reviewing scan reports';
