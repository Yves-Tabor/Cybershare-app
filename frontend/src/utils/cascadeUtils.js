/**
 * Template interpolation utility for Cascade feature
 * Replaces placeholders in explanation templates with actual finding data
 * SECURITY: All interpolated values are HTML-escaped to prevent XSS attacks
 */

/**
 * HTML-escape a string to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} The HTML-escaped string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Interpolates template placeholders with finding data
 * SECURITY: All values are HTML-escaped before interpolation to prevent XSS
 * React's JSX escaping provides additional defense-in-depth
 * @param {string} template - The template string with placeholders like {domain}, {header_name}, {severity}
 * @param {object} findingData - The finding data object containing values for placeholders
 * @returns {string} The interpolated string (HTML-escaped)
 */
export function interpolateTemplate(template, findingData = {}) {
  if (!template || typeof template !== 'string') {
    return '';
  }

  let result = template;

  // Common placeholders to replace - all values are HTML-escaped
  const placeholders = {
    domain: escapeHtml(findingData.target_url || findingData.domain || 'the target'),
    header_name: escapeHtml(findingData.metadata?.headerName || findingData.header_name || 'the header'),
    severity: escapeHtml(findingData.severity || 'unknown'),
    title: escapeHtml(findingData.title || 'this finding'),
    category: escapeHtml(findingData.category || 'security'),
    port: escapeHtml(String(findingData.port || 'unknown')),
    path: escapeHtml(findingData.path || 'unknown'),
  };

  // Replace each placeholder in the template
  Object.entries(placeholders).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

/**
 * Extracts domain from a URL
 * @param {string} url - The URL string
 * @returns {string} The domain
 */
export function extractDomain(url) {
  if (!url) return 'the target';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Feature flag for Cascade feature
 * Can be toggled off quickly if needed
 */
export const CASCADE_ENABLED = true;
