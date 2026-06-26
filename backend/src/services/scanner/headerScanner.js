const axios = require('axios');

/**
 * HTTP Security Header Scanner
 * Checks for missing security headers
 */
async function scanHeaders(targetUrl) {
  const results = [];
  
  try {
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      validateStatus: () => true,
    });

    const headers = response.headers;

    // Required security headers
    const securityHeaders = [
      {
        name: 'Content-Security-Policy',
        severity: 'high',
        title: 'Missing Content-Security-Policy Header',
        description: 'The Content-Security-Policy (CSP) header is missing. CSP helps prevent cross-site scripting (XSS) attacks by controlling which resources the browser can load.',
        recommendation: 'Implement a Content-Security-Policy header that restricts resource loading to trusted sources.',
      },
      {
        name: 'Strict-Transport-Security',
        severity: 'high',
        title: 'Missing Strict-Transport-Security Header',
        description: 'The Strict-Transport-Security (HSTS) header is missing. HSTS instructs browsers to only communicate over HTTPS, preventing protocol downgrade attacks.',
        recommendation: 'Add Strict-Transport-Security header with a reasonable max-age (e.g., 31536000 seconds for 1 year).',
      },
      {
        name: 'X-Frame-Options',
        severity: 'medium',
        title: 'Missing X-Frame-Options Header',
        description: 'The X-Frame-Options header is missing. This header protects against clickjacking attacks by preventing the site from being embedded in frames.',
        recommendation: 'Add X-Frame-Options header with value "DENY" or "SAMEORIGIN".',
      },
      {
        name: 'X-Content-Type-Options',
        severity: 'medium',
        title: 'Missing X-Content-Type-Options Header',
        description: 'The X-Content-Type-Options header is missing. This header prevents MIME-sniffing attacks by forcing the browser to respect the declared content type.',
        recommendation: 'Add X-Content-Type-Options header with value "nosniff".',
      },
      {
        name: 'Referrer-Policy',
        severity: 'low',
        title: 'Missing Referrer-Policy Header',
        description: 'The Referrer-Policy header is missing. This header controls how much referrer information is sent with navigation requests.',
        recommendation: 'Add Referrer-Policy header with value "strict-origin-when-cross-origin" or "no-referrer".',
      },
      {
        name: 'Permissions-Policy',
        severity: 'low',
        title: 'Missing Permissions-Policy Header',
        description: 'The Permissions-Policy (formerly Feature-Policy) header is missing. This header controls which browser features and APIs can be used.',
        recommendation: 'Add Permissions-Policy header to restrict access to sensitive features like geolocation, camera, microphone, etc.',
      },
    ];

    // Check each security header
    for (const header of securityHeaders) {
      const headerKey = Object.keys(headers).find(
        key => key.toLowerCase() === header.name.toLowerCase()
      );

      if (!headerKey) {
        results.push({
          category: 'HTTP Headers',
          severity: header.severity,
          title: header.title,
          description: header.description,
          recommendation: header.recommendation,
        });
      }
    }

    // Check for server information disclosure
    const serverHeader = Object.keys(headers).find(
      key => key.toLowerCase() === 'server'
    );
    if (serverHeader && headers[serverHeader]) {
      results.push({
        category: 'HTTP Headers',
        severity: 'low',
        title: 'Server Information Disclosure',
        description: `The Server header reveals: ${headers[serverHeader]}. This can help attackers identify the server technology and potential vulnerabilities.`,
        recommendation: 'Configure your server to hide or minimize the Server header information.',
      });
    }

    // Check for X-Powered-By header
    const poweredByHeader = Object.keys(headers).find(
      key => key.toLowerCase() === 'x-powered-by'
    );
    if (poweredByHeader && headers[poweredByHeader]) {
      results.push({
        category: 'HTTP Headers',
        severity: 'low',
        title: 'Technology Information Disclosure',
        description: `The X-Powered-By header reveals: ${headers[poweredByHeader]}. This exposes the underlying technology stack.`,
        recommendation: 'Remove or disable the X-Powered-By header in your application configuration.',
      });
    }

  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      results.push({
        category: 'HTTP Headers',
        severity: 'critical',
        title: 'Domain Not Found',
        description: `The target domain could not be resolved: ${targetUrl}`,
        recommendation: 'Verify the target URL is correct and the domain is accessible.',
      });
    } else if (error.code === 'ECONNREFUSED') {
      results.push({
        category: 'HTTP Headers',
        severity: 'critical',
        title: 'Connection Refused',
        description: `The server refused the connection to: ${targetUrl}`,
        recommendation: 'Verify the target server is running and accessible.',
      });
    } else {
      results.push({
        category: 'HTTP Headers',
        severity: 'critical',
        title: 'HTTP Request Failed',
        description: `Failed to retrieve headers from ${targetUrl}: ${error.message}`,
        recommendation: 'Check the target URL and network connectivity.',
      });
    }
  }

  return results;
}

module.exports = { scanHeaders };
