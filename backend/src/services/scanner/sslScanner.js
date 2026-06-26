const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * SSL/TLS Scanner
 * Checks SSL certificate validity and configuration
 */
async function scanSSL(targetUrl) {
  const results = [];
  
  try {
    const url = new URL(targetUrl);
    const hostname = url.hostname;
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);

    if (url.protocol !== 'https:') {
      results.push({
        category: 'SSL/TLS',
        severity: 'critical',
        title: 'Not Using HTTPS',
        description: 'The target is not using HTTPS. All data transmitted is unencrypted and vulnerable to interception.',
        recommendation: 'Configure your server to use HTTPS with a valid SSL certificate.',
      });
      return results;
    }

    const certInfo = await getCertificate(hostname, port);

    if (!certInfo) {
      results.push({
        category: 'SSL/TLS',
        severity: 'critical',
        title: 'SSL Certificate Not Accessible',
        description: 'Could not retrieve SSL certificate information.',
        recommendation: 'Ensure your SSL certificate is properly configured and the server is accessible.',
      });
      return results;
    }

    // Check if certificate is self-signed
    if (certInfo.issuer && certInfo.issuer.includes('CN=')) {
      const issuer = certInfo.issuer.match(/CN=([^,]+)/);
      if (issuer && issuer[1] === hostname) {
        results.push({
          category: 'SSL/TLS',
          severity: 'high',
          title: 'Self-Signed Certificate',
          description: 'The SSL certificate is self-signed. Browsers will show security warnings and users may not trust the site.',
          recommendation: 'Use a certificate from a trusted Certificate Authority (CA) like Let\'s Encrypt, DigiCert, or Comodo.',
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
        title: 'Expired SSL Certificate',
        description: `The SSL certificate expired ${Math.abs(daysUntilExpiry)} days ago.`,
        recommendation: 'Renew your SSL certificate immediately.',
      });
    } else if (daysUntilExpiry <= 7) {
      results.push({
        category: 'SSL/TLS',
        severity: 'critical',
        title: 'SSL Certificate Expiring Soon',
        description: `The SSL certificate will expire in ${daysUntilExpiry} days.`,
        recommendation: 'Renew your SSL certificate as soon as possible.',
      });
    } else if (daysUntilExpiry <= 30) {
      results.push({
        category: 'SSL/TLS',
        severity: 'high',
        title: 'SSL Certificate Expiring Soon',
        description: `The SSL certificate will expire in ${daysUntilExpiry} days.`,
        recommendation: 'Plan to renew your SSL certificate before expiration.',
      });
    }

    // Check certificate validity period (too long)
    const validFrom = new Date(certInfo.validFrom);
    const certLifetime = (validTo - validFrom) / (1000 * 60 * 60 * 24 * 365); // in years
    if (certLifetime > 1) {
      results.push({
        category: 'SSL/TLS',
        severity: 'medium',
        title: 'Long Certificate Validity Period',
        description: `The SSL certificate has a validity period of ${certLifetime.toFixed(1)} years. Shorter validity periods improve security by limiting the window for compromised keys.`,
        recommendation: 'Consider using certificates with shorter validity periods (e.g., 90 days) and automate renewal.',
      });
    }

    // Check for weak TLS versions (this is a simplified check)
    // In production, you would check the actual TLS version negotiated
    results.push({
      category: 'SSL/TLS',
      severity: 'low',
      title: 'TLS Version Check',
      description: 'Ensure your server supports only TLS 1.2 and TLS 1.3. Disable SSLv2, SSLv3, and TLS 1.0/1.1.',
      recommendation: 'Configure your server to disable deprecated TLS versions and only allow TLS 1.2 and TLS 1.3.',
    });

    // Certificate issuer information
    if (certInfo.issuer) {
      results.push({
        category: 'SSL/TLS',
        severity: 'informational',
        title: 'Certificate Issuer',
        description: `Certificate issued by: ${certInfo.issuer}`,
        recommendation: 'Ensure you are using a trusted Certificate Authority.',
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

function getCertificate(hostname, port) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port,
      method: 'GET',
      path: '/',
      rejectUnauthorized: false, // Allow self-signed certificates
    };

    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      if (cert && Object.keys(cert).length > 0) {
        resolve({
          issuer: cert.issuer,
          subject: cert.subject,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
        });
      } else {
        resolve(null);
      }
      req.destroy();
    });

    req.on('error', () => {
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.setTimeout(10000);
    req.end();
  });
}

module.exports = { scanSSL };
