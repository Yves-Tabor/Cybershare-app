const dns = require('dns').promises;
const { URL } = require('url');

/**
 * DNS Scanner
 * Checks for DNS security configurations (SPF, DMARC, DNSSEC)
 */
async function scanDNS(targetUrl) {
  const results = [];
  
  try {
    const url = new URL(targetUrl);
    const hostname = url.hostname;

    // Check SPF record
    try {
      const spfRecords = await dns.resolveTxt(hostname);
      const spfRecord = spfRecords.flat().find(record => record.startsWith('v=spf1'));
      
      if (!spfRecord) {
        results.push({
          category: 'DNS',
          severity: 'high',
          confidence: 'confirmed',
          title: 'Missing SPF Record',
          description: 'No SPF (Sender Policy Framework) record found for the domain. SPF helps prevent email spoofing by specifying which mail servers are authorized to send email for your domain.',
          recommendation: 'Add an SPF record to your DNS configuration. Example: v=spf1 include:_spf.google.com ~all',
          typeSlug: 'missing-spf',
          metadata: {
            domain: hostname
          }
        });
      } else {
        // Check if SPF ends with ~all or -all
        if (!spfRecord.includes('~all') && !spfRecord.includes('-all')) {
          results.push({
            category: 'DNS',
            severity: 'medium',
            confidence: 'confirmed',
            title: 'SPF Record Not Ending with all',
            description: 'The SPF record does not end with ~all or -all. This means the SPF policy does not explicitly reject unauthorized senders.',
            recommendation: 'Update your SPF record to end with ~all (soft fail) or -all (hard fail) for better protection.',
            typeSlug: 'spf-no-all',
            metadata: {
              domain: hostname,
              spfRecord: spfRecord
            }
          });
        }
      }
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        results.push({
          category: 'DNS',
          severity: 'high',
          confidence: 'confirmed',
          title: 'Missing SPF Record',
          description: 'No SPF record found for the domain.',
          recommendation: 'Add an SPF record to your DNS configuration.',
          typeSlug: 'missing-spf',
          metadata: {
            domain: hostname
          }
        });
      }
    }

    // Check DMARC record
    try {
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${hostname}`);
      const dmarcRecord = dmarcRecords.flat().find(record => record.startsWith('v=DMARC1'));
      
      if (!dmarcRecord) {
        results.push({
          category: 'DNS',
          severity: 'high',
          confidence: 'confirmed',
          title: 'Missing DMARC Record',
          description: 'No DMARC (Domain-based Message Authentication, Reporting, and Conformance) record found. DMARC builds on SPF and DKIM to provide email authentication and reporting.',
          recommendation: 'Add a DMARC record to your DNS configuration. Example: v=DMARC1; p=none; rua=mailto:dmarc@example.com',
          typeSlug: 'missing-dmarc',
          metadata: {
            domain: hostname
          }
        });
      } else {
        // Check DMARC policy
        if (dmarcRecord.includes('p=none')) {
          results.push({
            category: 'DNS',
            severity: 'medium',
            confidence: 'confirmed',
            title: 'DMARC Policy Set to None',
            description: 'The DMARC policy is set to "none", which means no action is taken on failing emails. This is typically used for monitoring only.',
            recommendation: 'Consider changing the DMARC policy to "quarantine" or "reject" once you are confident in your email authentication setup.',
            typeSlug: 'dmarc-policy-none',
            metadata: {
              domain: hostname,
              dmarcRecord: dmarcRecord
            }
          });
        }
      }
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        results.push({
          category: 'DNS',
          severity: 'high',
          confidence: 'confirmed',
          title: 'Missing DMARC Record',
          description: 'No DMARC record found for the domain.',
          recommendation: 'Add a DMARC record to your DNS configuration.',
          typeSlug: 'missing-dmarc',
          metadata: {
            domain: hostname
          }
        });
      }
    }

    // Check for DNSSEC (basic check - DNSSEC validation is complex)
    results.push({
      category: 'DNS',
      severity: 'informational',
      confidence: 'heuristic',
      title: 'DNSSEC Configuration',
      description: 'DNSSEC (DNS Security Extensions) adds cryptographic signatures to DNS records. This scanner performs a basic check. Full DNSSEC validation requires recursive resolver support.',
      recommendation: 'Consider implementing DNSSEC to protect against DNS spoofing and cache poisoning attacks.',
      metadata: {
        domain: hostname
      }
    });

    // Check DNS resolution
    try {
      await dns.lookup(hostname);
    } catch (error) {
      results.push({
        category: 'DNS',
        severity: 'critical',
        confidence: 'confirmed',
        title: 'DNS Resolution Failed',
        description: `Failed to resolve the domain: ${hostname}`,
        recommendation: 'Verify the domain name is correct and the DNS records are properly configured.',
        metadata: {
          domain: hostname
        }
      });
    }

  } catch (error) {
    results.push({
      category: 'DNS',
      severity: 'critical',
      title: 'DNS Scan Failed',
      description: `Failed to scan DNS configuration: ${error.message}`,
      recommendation: 'Verify the target URL and DNS configuration.',
    });
  }

  return results;
}

module.exports = { scanDNS };
