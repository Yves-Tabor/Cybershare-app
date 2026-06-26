const { exec } = require('child_process');
const { URL } = require('url');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * Nuclei Scanner
 * Uses Nuclei to detect CVEs and security misconfigurations
 * Note: Nuclei must be installed on the system and available in PATH
 */
async function scanNuclei(targetUrl) {
  const results = [];
  
  try {
    const url = new URL(targetUrl);
    const hostname = url.hostname;

    // Check if nuclei is available
    try {
      await execPromise('nuclei -version');
    } catch (error) {
      results.push({
        category: 'Vulnerability',
        severity: 'critical',
        title: 'Nuclei Not Installed',
        description: 'Nuclei is not installed or not available in the system PATH. Vulnerability scanning requires Nuclei to be installed.',
        recommendation: 'Install Nuclei by running: go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest. Update templates with: nuclei -update-templates',
      });
      return results;
    }

    // Run nuclei scan with limited templates for faster scanning
    const command = `nuclei -u ${targetUrl} -t cves/ -t exposures/ -t misconfigurations/ -severity critical,high,medium -json -silent`;
    const { stdout, stderr } = await execPromise(command, {
      timeout: 120000, // 2 minute timeout
    });

    if (stderr && !stderr.includes('no results found')) {
      results.push({
        category: 'Vulnerability',
        severity: 'low',
        title: 'Nuclei Scan Warning',
        description: `Nuclei produced warnings: ${stderr}`,
        recommendation: 'Review the warnings and ensure proper network connectivity.',
      });
    }

    // Parse nuclei JSON output
    if (stdout.trim()) {
      const lines = stdout.trim().split('\n');
      
      lines.forEach(line => {
        try {
          const finding = JSON.parse(line);
          
          // Map nuclei severity to our severity levels
          let severity = 'low';
          if (finding.info && finding.info.severity) {
            const nucleiSeverity = finding.info.severity.toLowerCase();
            if (nucleiSeverity === 'critical') severity = 'critical';
            else if (nucleiSeverity === 'high') severity = 'high';
            else if (nucleiSeverity === 'medium') severity = 'medium';
            else if (nucleiSeverity === 'low') severity = 'low';
            else severity = 'informational';
          }

          results.push({
            category: 'Vulnerability',
            severity,
            title: finding.info?.name || 'Security Finding',
            description: finding.info?.description || `Nuclei detected: ${finding.templateID}`,
            recommendation: finding.info?.remediation || 'Review the finding and apply appropriate security measures.',
          });
        } catch (parseError) {
          // Skip lines that can't be parsed as JSON
        }
      });

      if (results.length === 0) {
        results.push({
          category: 'Vulnerability',
          severity: 'informational',
          title: 'No Vulnerabilities Detected',
          description: 'Nuclei did not detect any critical, high, or medium severity vulnerabilities with the current template set.',
          recommendation: 'This is a good sign, but continue to monitor for new vulnerabilities and keep systems updated.',
        });
      }
    } else {
      results.push({
        category: 'Vulnerability',
        severity: 'informational',
        title: 'No Vulnerabilities Detected',
        description: 'Nuclei did not detect any vulnerabilities with the current template set.',
        recommendation: 'This is a good sign, but continue to monitor for new vulnerabilities and keep systems updated.',
      });
    }

  } catch (error) {
    if (error.killed) {
      results.push({
        category: 'Vulnerability',
        severity: 'high',
        title: 'Nuclei Scan Timeout',
        description: 'The Nuclei scan timed out after 2 minutes.',
        recommendation: 'The target may be slow to respond or blocking the scan. Consider increasing the timeout or using fewer templates.',
      });
    } else {
      results.push({
        category: 'Vulnerability',
        severity: 'critical',
        title: 'Nuclei Scan Failed',
        description: `Failed to run Nuclei scan: ${error.message}`,
        recommendation: 'Ensure Nuclei is installed and accessible. Check network connectivity to the target.',
      });
    }
  }

  return results;
}

module.exports = { scanNuclei };
