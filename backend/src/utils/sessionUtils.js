const crypto = require('crypto');

/**
 * Generates a SHA-256 hex hash of a JWT token.
 * We store this instead of the raw token for security.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parses the User-Agent string into a human-readable device label.
 */
function parseDevice(ua = '') {
  if (!ua) return 'Unknown device';

  // Operating system
  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone/i.test(ua)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/cros/i.test(ua)) os = 'ChromeOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Browser (order matters: Edge/Opera/Brave/Samsung include Chrome in their UA)
  let browser = 'Unknown browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera\//i.test(ua)) browser = 'Opera';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/brave/i.test(ua)) browser = 'Brave';
  else if (/vivaldi/i.test(ua)) browser = 'Vivaldi';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'Internet Explorer';

  return `${os} · ${browser}`;
}

/**
 * Returns the real client IP, honouring X-Forwarded-For from trusted proxies.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'Unknown';
}

module.exports = { hashToken, parseDevice, getClientIp };
