const { exec } = require('child_process');
const { URL } = require('url');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * Nmap Scanner
 * Uses Nmap to detect open ports and services
 * Note: Nmap must be installed on the system and available in PATH
 */
async function scanNmap(targetUrl) {
  const results = [];
  
  try {
    const url = new URL(targetUrl);
    const hostname = url.hostname;
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);

    // Check if nmap is available
    try {
      await execPromise('nmap --version');
    } catch (error) {
      results.push({
        category: 'Network',
        severity: 'critical',
        title: 'Nmap Not Installed',
        description: 'Nmap is not installed or not available in the system PATH. Network scanning requires Nmap to be installed.',
        recommendation: 'Install Nmap from https://nmap.org/download.html and ensure it is added to your system PATH.',
      });
      return results;
    }

    // Run nmap scan
    const command = `nmap -Pn -sV --top-ports 100 ${hostname}`;
    const { stdout, stderr } = await execPromise(command, {
      timeout: 60000, // 60 second timeout
    });

    if (stderr && !stderr.includes('Warning')) {
      results.push({
        category: 'Network',
        severity: 'medium',
        title: 'Nmap Scan Warning',
        description: `Nmap produced warnings: ${stderr}`,
        recommendation: 'Review the warnings and ensure proper network connectivity.',
      });
    }

    // Parse nmap output
    const lines = stdout.split('\n');
    let openPorts = [];

    lines.forEach(line => {
      const portMatch = line.match(/(\d+)\/tcp\s+open\s+(.+)/);
      if (portMatch) {
        const port = portMatch[1];
        const service = portMatch[2];
        openPorts.push({ port, service });
      }
    });

    if (openPorts.length === 0) {
      results.push({
        category: 'Network',
        severity: 'informational',
        title: 'No Open Ports Detected',
        description: 'Nmap did not detect any open ports on the top 100 ports. This could indicate a firewall is blocking the scan or the host is down.',
        recommendation: 'Verify the target is accessible and consider scanning all ports if needed.',
      });
    } else {
      // Report open ports
      const portList = openPorts.map(p => `Port ${p.port} (${p.service})`).join(', ');
      results.push({
        category: 'Network',
        severity: 'informational',
        title: 'Open Ports Detected',
        description: `The following open ports were detected: ${portList}.`,
        recommendation: 'Review each open port and ensure only necessary services are exposed. Consider closing unused ports.',
      });

      // Check for potentially risky services
      const riskyServices = ['ssh', 'telnet', 'ftp', 'http', 'https', 'smb', 'netbios'];
      openPorts.forEach(({ port, service }) => {
        const serviceLower = service.toLowerCase();
        if (riskyServices.some(risk => serviceLower.includes(risk))) {
          results.push({
            category: 'Network',
            severity: 'medium',
            title: `Potentially Exposed Service: ${service} on Port ${port}`,
            description: `Service ${service} is exposed on port ${port}. Ensure this service is properly secured and only accessible from trusted networks.`,
            recommendation: 'Review access controls for this service and consider using firewalls to restrict access.',
          });
        }
      });

      // Check for common web ports
      const webPorts = openPorts.filter(p => p.port === '80' || p.port === '443' || p.port === '8080' || p.port === '8443');
      if (webPorts.length > 0) {
        results.push({
          category: 'Network',
          severity: 'informational',
          title: 'Web Services Detected',
          description: `Web services are running on ports: ${webPorts.map(p => p.port).join(', ')}.`,
          recommendation: 'Ensure web servers are properly configured with security headers and HTTPS.',
        });
      }
    }

  } catch (error) {
    if (error.killed) {
      results.push({
        category: 'Network',
        severity: 'high',
        title: 'Nmap Scan Timeout',
        description: 'The Nmap scan timed out after 60 seconds.',
        recommendation: 'The target may be slow to respond or blocking the scan. Consider increasing the timeout or scanning fewer ports.',
      });
    } else {
      results.push({
        category: 'Network',
        severity: 'critical',
        title: 'Nmap Scan Failed',
        description: `Failed to run Nmap scan: ${error.message}`,
        recommendation: 'Ensure Nmap is installed and accessible. Check network connectivity to the target.',
      });
    }
  }

  return results;
}

module.exports = { scanNmap };
