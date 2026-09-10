const https = require('https');
const axios = require('axios');
const { URL } = require('url');

/**
 * SSL/TLS Scanner
 * Checks SSL certificate validity and configuration
 */
async function scanSSL(targetUrl) {
  const results = [];

  try {
    let urlString = targetUrl;
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
      urlString = 'https://' + urlString;
    }
    const url = new URL(urlString);
    const hostname = url.hostname;
    const port = parseInt(url.port) || 443;

    if (url.protocol === 'http:' && !url.port) {
      results.push({
        category: 'SSL/TLS',
        severity: 'medium',
        title: 'Target URL Uses HTTP',
        description: 'The target URL was specified with http://. Checking SSL/TLS configuration on default port 443.',
        recommendation: 'Ensure your web server redirects all HTTP traffic to HTTPS.',
      });
    }

    const certInfo = await getCertificate(hostname, port);

    if (!certInfo) {
      results.push({
        category: 'SSL/TLS',
        severity: 'high',
        title: 'SSL Certificate Not Accessible',
        description: `Could not retrieve SSL certificate information from ${hostname}:${port}.`,
        recommendation: 'Ensure your SSL certificate is properly configured and port 443 is accessible.',
      });
      return results;
    }

    // Check if certificate is self-signed
    if (certInfo.issuer) {
      const issuerCN = typeof certInfo.issuer === 'object' ? certInfo.issuer.CN : null;
      if (issuerCN && issuerCN === hostname) {
        results.push({
          category: 'SSL/TLS',
          severity: 'high',
          confidence: 'confirmed',
          title: 'Self-Signed Certificate',
          description: 'The SSL certificate is self-signed. Browsers will show security warnings and users may not trust the site.',
          recommendation: "Use a certificate from a trusted Certificate Authority (CA) like Let's Encrypt, DigiCert, or Comodo.",
          typeSlug: 'self-signed-cert',
          metadata: {
            domain: hostname,
            issuerCN: issuerCN
          }
        });
      }
    }

    // Check certificate expiration
    const now = new Date();
    const validTo = new Date(certInfo.validTo);
    const daysUntilExpiry = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      results.push({
        category: 'SSL/TLS',
        severity: 'critical',
        confidence: 'confirmed',
        title: 'Expired SSL Certificate',
        description: `The SSL certificate expired ${Math.abs(daysUntilExpiry)} days ago.`,
        recommendation: 'Renew your SSL certificate immediately.',
        typeSlug: 'expired-ssl-cert',
        metadata: {
          domain: hostname,
          days_expired: Math.abs(daysUntilExpiry),
          expiryDate: validTo.toISOString()
        }
      });
    } else if (daysUntilExpiry <= 7) {
      results.push({
        category: 'SSL/TLS',
        severity: 'critical',
        confidence: 'confirmed',
        title: 'SSL Certificate Expiring Soon',
        description: `The SSL certificate will expire in ${daysUntilExpiry} days.`,
        recommendation: 'Renew your SSL certificate as soon as possible.',
        typeSlug: 'ssl-cert-expiring-soon',
        metadata: {
          domain: hostname,
          days_remaining: daysUntilExpiry,
          expiryDate: validTo.toISOString()
        }
      });
    } else if (daysUntilExpiry <= 30) {
      results.push({
        category: 'SSL/TLS',
        severity: 'high',
        confidence: 'confirmed',
        title: 'SSL Certificate Expiring Soon',
        description: `The SSL certificate will expire in ${daysUntilExpiry} days.`,
        recommendation: 'Plan to renew your SSL certificate before expiration.',
        typeSlug: 'ssl-cert-expiring-soon',
        metadata: {
          domain: hostname,
          days_remaining: daysUntilExpiry,
          expiryDate: validTo.toISOString()
        }
      });
    }

    // Check certificate validity period (too long)
    const validFrom = new Date(certInfo.validFrom);
    const certLifetime = (validTo - validFrom) / (1000 * 60 * 60 * 24 * 365); // in years
    if (certLifetime > 1) {
      results.push({
        category: 'SSL/TLS',
        severity: 'medium',
        confidence: 'confirmed',
        title: 'Long Certificate Validity Period',
        description: `The SSL certificate has a validity period of ${certLifetime.toFixed(1)} years. Shorter validity periods improve security by limiting the window for compromised keys.`,
        recommendation: 'Consider using certificates with shorter validity periods (e.g., 90 days) and automate renewal.',
        typeSlug: 'long-cert-validity',
        metadata: {
          domain: hostname,
          validity_years: certLifetime.toFixed(1)
        }
      });
    }

    // Bug Fix #3: Real TLS version check using socket.getProtocol()
    if (certInfo.tlsVersion) {
      const tls = certInfo.tlsVersion; // e.g. "TLSv1.3", "TLSv1.2", "TLSv1.1", "TLSv1"
      if (tls === 'TLSv1' || tls === 'TLSv1.1' || tls === 'SSLv3' || tls === 'SSLv2') {
        results.push({
          category: 'SSL/TLS',
          severity: 'high',
          confidence: 'confirmed',
          title: `Deprecated TLS Version: ${tls}`,
          description: `The server negotiated ${tls}, which is deprecated and has known vulnerabilities. Modern clients and standards require TLS 1.2 or higher.`,
          recommendation: 'Disable TLS 1.0 and TLS 1.1 on your server and configure it to only accept TLS 1.2 and TLS 1.3.',
          typeSlug: 'weak-tls',
          metadata: {
            domain: hostname,
            tls_version: tls
          }
        });
      } else if (tls === 'TLSv1.2') {
        results.push({
          category: 'SSL/TLS',
          severity: 'low',
          confidence: 'confirmed',
          title: 'TLS 1.2 in Use',
          description: `The server is using ${tls}. While still acceptable, TLS 1.3 offers better security and performance.`,
          recommendation: 'Consider enabling TLS 1.3 on your server for improved security.',
          metadata: {
            tlsVersion: tls
          }
        });
      } else {
        // TLSv1.3 — ideal
        results.push({
          category: 'SSL/TLS',
          severity: 'good-news',
          confidence: 'confirmed',
          title: `TLS Version: ${tls}`,
          description: `The server is using ${tls}, which is the most secure TLS version currently available.`,
          recommendation: 'No action needed. Ensure TLS 1.3 remains enabled.',
          metadata: {
            tlsVersion: tls
          }
        });
      }
    } else {
      // Fallback if getProtocol() returned nothing
      results.push({
        category: 'SSL/TLS',
        severity: 'low',
        confidence: 'heuristic',
        title: 'TLS Version Check',
        description: 'Could not determine the negotiated TLS version. Ensure your server supports only TLS 1.2 and TLS 1.3.',
        recommendation: 'Configure your server to disable deprecated TLS versions and only allow TLS 1.2 and TLS 1.3.',
      });
    }

    // Certificate issuer information
    if (certInfo.issuer) {
      const issuerStr = typeof certInfo.issuer === 'object'
        ? Object.entries(certInfo.issuer).map(([k, v]) => `${k}=${v}`).join(', ')
        : certInfo.issuer;
      results.push({
        category: 'SSL/TLS',
        severity: 'good-news',
        confidence: 'confirmed',
        title: 'Certificate Issuer',
        description: `Certificate issued by: ${issuerStr}`,
        recommendation: 'Ensure you are using a trusted Certificate Authority.',
        metadata: {
          issuer: issuerStr
        }
      });
    }

  } catch (error) {
    results.push({
      category: 'SSL/TLS',
      severity: 'critical',
      title: 'SSL Scan Failed',
      description: `Failed to scan SSL configuration: ${error.message}`,
      recommendation: 'Verify the target URL uses HTTPS and the server is accessible.',
    });
  }

  return results;
}

/**
 * Follow up to 5 redirects (including HTTP→HTTPS) and return the final URL.
 * Uses a HEAD request to avoid downloading the body.
 */
async function resolveRedirects(targetUrl) {
  try {
    const response = await axios.head(targetUrl, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
    });
    // axios resolves the final URL after redirects
    return response.request?.res?.responseUrl || response.config?.url || targetUrl;
  } catch {
    // If HEAD fails (some servers don't support it), fall back to the original URL
    return targetUrl;
  }
}

/**
 * Bug Fix #1: Establish an HTTPS connection, grab cert + TLS version, then
 * cleanly close the socket — never calling req.destroy() inside the response
 * handler (which corrupts socket state on keep-alive connections).
 *
 * Bug Fix #2: Get the full certificate chain to correctly extract issuer CN
 * from the actual issuer certificate, not the leaf certificate.
 */
function getCertificate(hostname, port) {
  return new Promise((resolve) => {
    const tls = require('tls');

    const socket = tls.connect({
      host: hostname,
      port: port,
      servername: hostname, // SNI support
      rejectUnauthorized: false,
      minVersion: 'TLSv1',
    }, () => {
      // NOTE: getPeerCertificate(true) returns a single cert OBJECT (the leaf),
      // NOT an array. The full chain is accessed via cert.issuerCertificate links.
      const cert = socket.getPeerCertificate(true);
      const tlsVersion = socket.getProtocol ? socket.getProtocol() : null;

      if (cert && Object.keys(cert).length > 0) {
        let issuer = cert.issuer; // fallback: leaf cert's issuer field

        // Walk the issuerCertificate chain to find the immediate CA.
        // Root certs self-reference (issuerCertificate.subject === own subject),
        // so we use fingerprint comparison to detect and stop the loop.
        if (cert.issuerCertificate) {
          const leafFingerprint = cert.fingerprint256 || cert.fingerprint;
          const issuerCert = cert.issuerCertificate;
          const issuerFingerprint = issuerCert.fingerprint256 || issuerCert.fingerprint;

          // issuerCertificate.subject = the immediate CA's identity (what issued the leaf)
          if (issuerCert.subject) {
            // Only use it if it's not the leaf itself (self-signed case)
            if (leafFingerprint !== issuerFingerprint) {
              issuer = issuerCert.subject;
            }
            // For self-signed certs, issuer === cert.issuer is correct — keep fallback
          }
        }

        // Debug logging
        console.log('[SSL Scanner] Leaf subject:', JSON.stringify(cert.subject));
        console.log('[SSL Scanner] Leaf issuer field:', JSON.stringify(cert.issuer));
        console.log('[SSL Scanner] Resolved issuer (from issuerCertificate.subject):', JSON.stringify(issuer));

        resolve({
          issuer: issuer,
          subject: cert.subject,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          tlsVersion,
        });
      } else {
        resolve(null);
      }
      socket.end();
    });

    socket.on('error', () => {
      resolve(null);
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      resolve(null);
    });
  });
}

module.exports = { scanSSL, getCertificate };
