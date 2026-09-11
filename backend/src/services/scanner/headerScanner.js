const axios = require('axios');
const { URL } = require('url');

/**
 * HTTP Security Header Scanner
 * Checks for missing security headers
 */
async function scanHeaders(targetUrl) {
  const results = [];

  try {
    const url = new URL(targetUrl);
    const hostname = url.hostname;

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
        typeSlug: 'missing-csp',
      },
      {
        name: 'Strict-Transport-Security',
        severity: 'high',
        title: 'Missing Strict-Transport-Security Header',
        description: 'The Strict-Transport-Security (HSTS) header is missing. HSTS instructs browsers to only communicate over HTTPS, preventing protocol downgrade attacks.',
        recommendation: 'Add Strict-Transport-Security header with a reasonable max-age (e.g., 31536000 seconds for 1 year).',
        typeSlug: 'missing-hsts',
      },
      {
        name: 'X-Frame-Options',
        severity: 'medium',
        title: 'Missing X-Frame-Options Header',
        description: 'The X-Frame-Options header is missing. This header protects against clickjacking attacks by preventing the site from being embedded in frames.',
        recommendation: 'Add X-Frame-Options header with value "DENY" or "SAMEORIGIN".',
        typeSlug: 'missing-x-frame-options',
      },
      {
        name: 'X-Content-Type-Options',
        severity: 'medium',
        title: 'Missing X-Content-Type-Options Header',
        description: 'The X-Content-Type-Options header is missing. This header prevents MIME-sniffing attacks by forcing the browser to respect the declared content type.',
        recommendation: 'Add X-Content-Type-Options header with value "nosniff".',
        typeSlug: 'missing-x-content-type-options',
      },
      {
        name: 'Referrer-Policy',
        severity: 'low',
        title: 'Missing Referrer-Policy Header',
        description: 'The Referrer-Policy header is missing. This header controls how much referrer information is sent with navigation requests.',
        recommendation: 'Add Referrer-Policy header with value "strict-origin-when-cross-origin" or "no-referrer".',
        typeSlug: 'missing-referrer-policy',
      },
      {
        name: 'Permissions-Policy',
        severity: 'low',
        title: 'Missing Permissions-Policy Header',
        description: 'The Permissions-Policy (formerly Feature-Policy) header is missing. This header controls which browser features and APIs can be used.',
        recommendation: 'Add Permissions-Policy header to restrict access to sensitive features like geolocation, camera, microphone, etc.',
        typeSlug: 'missing-permissions-policy',
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
          confidence: 'confirmed',
          title: header.title,
          description: header.description,
          recommendation: header.recommendation,
          typeSlug: header.typeSlug || null,
          metadata: {
            domain: hostname
          }
        });
      }
    }

    // Check for server information disclosure with version detection
    const serverHeader = Object.keys(headers).find(
      key => key.toLowerCase() === 'server'
    );
    if (serverHeader && headers[serverHeader]) {
      const serverValue = headers[serverHeader];
      const versionPattern = /\d+\.\d+(\.\d+)?/; // Matches version numbers like 1.18.0 or 7.4.3
      const hasVersion = versionPattern.test(serverValue);

      results.push({
        category: 'HTTP Headers',
        severity: hasVersion ? 'medium' : 'good-news',
        confidence: 'confirmed',
        title: 'Server Information Disclosure',
        description: `The Server header reveals: ${serverValue}. This finding specifically addresses HTTP header information disclosure risks. (Note: Technology detection is handled separately by the technology scanner.)`,
        recommendation: hasVersion
          ? `Remove or generalize the Server header to prevent version fingerprinting (e.g., use "nginx" instead of "${serverValue}").`
          : 'Consider removing the Server header entirely to minimize information disclosure.',
        typeSlug: hasVersion ? 'info-disclosure-headers' : null,
        metadata: {
          domain: hostname,
          header_name: 'Server',
          headerValue: serverValue,
          hasVersion: hasVersion
        }
      });
    }

    // Check for X-Powered-By header with version detection
    const poweredByHeader = Object.keys(headers).find(
      key => key.toLowerCase() === 'x-powered-by'
    );
    if (poweredByHeader && headers[poweredByHeader]) {
      const poweredByValue = headers[poweredByHeader];
      const versionPattern = /\d+\.\d+(\.\d+)?/;
      const hasVersion = versionPattern.test(poweredByValue);

      results.push({
        category: 'HTTP Headers',
        severity: hasVersion ? 'medium' : 'info',
        confidence: 'confirmed',
        title: 'Technology Information Disclosure',
        description: `The X-Powered-By header reveals: ${poweredByValue}. This exposes the underlying technology stack.`,
        recommendation: hasVersion
          ? `Remove or generalize the X-Powered-By header to prevent version fingerprinting (currently: "${poweredByValue}").`
          : 'Remove the X-Powered-By header in your application configuration.',
        typeSlug: 'info-disclosure-headers',
        metadata: {
          domain: hostname,
          header_name: 'X-Powered-By',
          headerValue: poweredByValue,
          hasVersion: hasVersion
        }
      });
    }

    // Check for X-AspNet-Version header
    const aspNetVersionHeader = Object.keys(headers).find(
      key => key.toLowerCase() === 'x-aspnet-version'
    );
    if (aspNetVersionHeader && headers[aspNetVersionHeader]) {
      results.push({
        category: 'HTTP Headers',
        severity: 'medium',
        confidence: 'confirmed',
        title: 'ASP.NET Version Disclosure',
        description: `The X-AspNet-Version header reveals: ${headers[aspNetVersionHeader]}. This exposes specific ASP.NET version information.`,
        recommendation: `Remove the X-AspNet-Version header to prevent version fingerprinting (currently: "${headers[aspNetVersionHeader]}").`,
        typeSlug: 'info-disclosure-headers',
        metadata: {
          domain: hostname,
          header_name: 'X-AspNet-Version',
          headerValue: headers[aspNetVersionHeader]
        }
      });
    }

    // Check for X-AspNetMvc-Version header
    const aspNetMvcVersionHeader = Object.keys(headers).find(
      key => key.toLowerCase() === 'x-aspnetmvc-version'
    );
    if (aspNetMvcVersionHeader && headers[aspNetMvcVersionHeader]) {
      results.push({
        category: 'HTTP Headers',
        severity: 'medium',
        confidence: 'confirmed',
        title: 'ASP.NET MVC Version Disclosure',
        description: `The X-AspNetMvc-Version header reveals: ${headers[aspNetMvcVersionHeader]}. This exposes specific ASP.NET MVC version information.`,
        recommendation: `Remove the X-AspNetMvc-Version header to prevent version fingerprinting (currently: "${headers[aspNetMvcVersionHeader]}").`,
        typeSlug: 'info-disclosure-headers',
        metadata: {
          domain: hostname,
          header_name: 'X-AspNetMvc-Version',
          headerValue: headers[aspNetMvcVersionHeader]
        }
      });
    }

    // Check for Via header
    const viaHeader = Object.keys(headers).find(
      key => key.toLowerCase() === 'via'
    );
    if (viaHeader && headers[viaHeader]) {
      const viaValue = headers[viaHeader];
      const versionPattern = /\d+\.\d+(\.\d+)?/;
      const hasVersion = versionPattern.test(viaValue);

      results.push({
        category: 'HTTP Headers',
        severity: hasVersion ? 'medium' : 'info',
        confidence: 'confirmed',
        title: 'Proxy Information Disclosure',
        description: `The Via header reveals: ${viaValue}. This can expose proxy server information and version details.`,
        recommendation: hasVersion
          ? `Remove or generalize the Via header to prevent proxy version fingerprinting (currently: "${viaValue}").`
          : 'Consider removing the Via header if proxy information disclosure is a concern.',
        typeSlug: 'info-disclosure-headers',
        metadata: {
          domain: hostname,
          header_name: 'Via',
          headerValue: viaValue,
          hasVersion: hasVersion
        }
      });
    }

    // Check for X-Generator header
    const generatorHeader = Object.keys(headers).find(
      key => key.toLowerCase() === 'x-generator'
    );
    if (generatorHeader && headers[generatorHeader]) {
      const generatorValue = headers[generatorHeader];
      const versionPattern = /\d+\.\d+(\.\d+)?/;
      const hasVersion = versionPattern.test(generatorValue);

      results.push({
        category: 'HTTP Headers',
        severity: hasVersion ? 'medium' : 'info',
        confidence: 'confirmed',
        title: 'Generator Information Disclosure',
        description: `The X-Generator header reveals: ${generatorValue}. This exposes the software or CMS used to generate the content.`,
        recommendation: hasVersion
          ? `Remove or generalize the X-Generator header to prevent version fingerprinting (currently: "${generatorValue}").`
          : 'Remove the X-Generator header to minimize technology stack disclosure.',
        typeSlug: 'info-disclosure-headers',
        metadata: {
          domain: hostname,
          header_name: 'X-Generator',
          headerValue: generatorValue,
          hasVersion: hasVersion
        }
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
