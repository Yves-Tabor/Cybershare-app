/**
 * Template interpolation utility for Cascade feature
 * Replaces placeholders in explanation templates with actual finding data
 */

/**
 * Interpolates template placeholders with finding data
 * @param {string} template - The template string with placeholders like {domain}, {header_name}, {severity}
 * @param {object} findingData - The finding data object containing values for placeholders
 * @returns {string} The interpolated string
 */
export function interpolateTemplate(template, findingData = {}) {
  if (!template || typeof template !== 'string') {
    return '';
  }

  let result = template;

  // Common placeholders to replace
  const placeholders = {
    domain: findingData.target_url || findingData.domain || 'the target',
    header_name: findingData.metadata?.headerName || findingData.header_name || 'the header',
    severity: findingData.severity || 'unknown',
    title: findingData.title || 'this finding',
    category: findingData.category || 'security',
    port: findingData.port || 'unknown',
    path: findingData.path || 'unknown',
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
