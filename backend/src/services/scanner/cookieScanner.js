const axios = require('axios');

/**
 * Cookie Security Scanner
 * Checks for cookie security flags (Secure, HttpOnly, SameSite)
 */
async function scanCookies(targetUrl) {
  const results = [];
  
  try {
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      validateStatus: () => true,
      withCredentials: true,
    });

    const cookies = response.headers['set-cookie'];

    if (!cookies || cookies.length === 0) {
      results.push({
        category: 'Cookies',
        severity: 'informational',
        confidence: 'confirmed',
        title: 'No Cookies Set',
        description: 'No cookies were set in the HTTP response. This may be expected if the site does not use cookies.',
        recommendation: 'If your application uses cookies, ensure they are being set with proper security flags.',
      });
      return results;
    }

    // Analyze each cookie
    cookies.forEach(cookieString => {
      const cookie = parseCookie(cookieString);
      
      if (!cookie.name) return;

      // Check for Secure flag
      if (!cookie.secure) {
        results.push({
          category: 'Cookies',
          severity: 'high',
          confidence: 'confirmed',
          title: `Missing Secure Flag on Cookie: ${cookie.name}`,
          description: `The cookie "${cookie.name}" is missing the Secure flag. Without this flag, the cookie can be transmitted over unencrypted HTTP connections, making it vulnerable to interception.`,
          recommendation: 'Add the Secure flag to this cookie to ensure it is only transmitted over HTTPS.',
          typeSlug: 'insecure-cookies',
          metadata: {
            cookieName: cookie.name
          }
        });
      }

      // Check for HttpOnly flag
      if (!cookie.httponly) {
        results.push({
          category: 'Cookies',
          severity: 'high',
          confidence: 'confirmed',
          title: `Missing HttpOnly Flag on Cookie: ${cookie.name}`,
          description: `The cookie "${cookie.name}" is missing the HttpOnly flag. Without this flag, JavaScript can access the cookie, making it vulnerable to XSS attacks.`,
          recommendation: 'Add the HttpOnly flag to this cookie to prevent JavaScript access.',
          typeSlug: 'insecure-cookies',
          metadata: {
            cookieName: cookie.name
          }
        });
      }

      // Check for SameSite flag
      if (!cookie.samesite) {
        results.push({
          category: 'Cookies',
          severity: 'medium',
          confidence: 'confirmed',
          title: `Missing SameSite Flag on Cookie: ${cookie.name}`,
          description: `The cookie "${cookie.name}" is missing the SameSite flag. This flag controls whether cookies are sent with cross-site requests, helping prevent CSRF attacks.`,
          recommendation: 'Add the SameSite flag with value "Strict" or "Lax" to control cross-site cookie behavior.',
          typeSlug: 'insecure-cookies',
          metadata: {
            cookieName: cookie.name
          }
        });
      } else if (cookie.samesite === 'None' && !cookie.secure) {
        results.push({
          category: 'Cookies',
          severity: 'high',
          confidence: 'confirmed',
          title: `SameSite=None Without Secure Flag on Cookie: ${cookie.name}`,
          description: `The cookie "${cookie.name}" has SameSite=None but is missing the Secure flag. Modern browsers require Secure flag when SameSite=None is used.`,
          recommendation: 'Add the Secure flag when using SameSite=None.',
          metadata: {
            cookieName: cookie.name,
            sameSiteValue: 'None'
          }
        });
      }

      // Check for overly long expiration
      if (cookie.expires) {
        const expiresDate = new Date(cookie.expires);
        const now = new Date();
        const daysUntilExpiry = (expiresDate - now) / (1000 * 60 * 60 * 24);

        if (daysUntilExpiry > 365) {
          results.push({
            category: 'Cookies',
            severity: 'low',
            confidence: 'confirmed',
            title: `Long Expiration on Cookie: ${cookie.name}`,
            description: `The cookie "${cookie.name}" has an expiration time more than 1 year in the future. Long-lived cookies increase the risk if the cookie is compromised.`,
            recommendation: 'Consider using shorter expiration times for session cookies and implement proper session management.',
            metadata: {
              cookieName: cookie.name,
              daysUntilExpiry: Math.round(daysUntilExpiry)
            }
          });
        }
      }
    });

  } catch (error) {
    results.push({
      category: 'Cookies',
      severity: 'critical',
      title: 'Cookie Scan Failed',
      description: `Failed to scan cookies: ${error.message}`,
      recommendation: 'Verify the target URL is accessible and returns proper HTTP responses.',
    });
  }

  return results;
}

function parseCookie(cookieString) {
  const parts = cookieString.split(';').map(p => p.trim());
  const cookie = {
    name: null,
    secure: false,
    httponly: false,
    samesite: null,
    expires: null,
  };

  parts.forEach((part, index) => {
    if (index === 0) {
      // First part is name=value
      const [name, value] = part.split('=');
      cookie.name = name;
    } else {
      const lowerPart = part.toLowerCase();
      if (lowerPart === 'secure') {
        cookie.secure = true;
      } else if (lowerPart === 'httponly') {
        cookie.httponly = true;
      } else if (lowerPart.startsWith('samesite=')) {
        cookie.samesite = part.split('=')[1];
      } else if (lowerPart.startsWith('expires=')) {
        cookie.expires = part.split('=')[1];
      } else if (lowerPart.startsWith('max-age=')) {
        const maxAge = parseInt(part.split('=')[1]);
        if (!isNaN(maxAge)) {
          const expiresDate = new Date(Date.now() + maxAge * 1000);
          cookie.expires = expiresDate.toUTCString();
        }
      }
    }
  });

  return cookie;
}

module.exports = { scanCookies };
