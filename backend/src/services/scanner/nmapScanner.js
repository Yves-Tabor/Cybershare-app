const { exec } = require("child_process");
const { URL } = require("url");
const util = require("util");
const { resolveToolExecutable } = require("./toolResolver");

const execPromise = util.promisify(exec);

const NMAP_TIMEOUT_MS = Math.min(
  Number(process.env.NMAP_TIMEOUT_MS) || 30000,
  30000,
);

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
    const nmapExecutable = resolveToolExecutable("nmap");

    // Check if nmap is available
    try {
      await execPromise(`${nmapExecutable} --version`, { timeout: 5000 });
    } catch (error) {
      results.push({
        category: "Network",
        severity: "critical",
        title: "Nmap Not Installed",
        description:
          "Nmap is not installed or not available in the system PATH. Network scanning requires Nmap to be installed.",
        recommendation:
          "Install Nmap from https://nmap.org/download.html and ensure it is added to your system PATH.",
      });
      return results;
    }

    // Run a fast Nmap scan and hard-limit host scan time
    const command = `${nmapExecutable} -Pn -T4 -F --host-timeout 25s ${hostname}`;
    const { stdout, stderr } = await execPromise(command, {
      timeout: NMAP_TIMEOUT_MS,
    });

    if (stderr && !stderr.toLowerCase().includes("warning")) {
      results.push({
        category: "Network",
        severity: "medium",
        title: "Nmap Scan Warning",
        description: `Nmap produced warnings: ${stderr}`,
        recommendation:
          "Review the warnings and ensure proper network connectivity.",
      });
    }

    // Parse nmap output
    const lines = stdout.split("\n");
    let openPorts = [];

    lines.forEach((line) => {
      const portMatch = line.match(/(\d+)\/tcp\s+open\s+(.+)/);
      if (portMatch) {
        const port = portMatch[1];
        const service = portMatch[2];
        openPorts.push({ port, service });
      }
    });

    if (openPorts.length === 0) {
      results.push({
        category: "Network",
        severity: "informational",
        title: "Nmap: No Open Ports Detected",
        description:
          "Nmap fast scan did not detect open ports. This can happen if the host filters probes, blocks scans, or has no commonly exposed ports.",
        recommendation:
          "Verify the target is accessible and consider scanning all ports if needed.",
      });
    } else {
      // Report open ports
      const portList = openPorts
        .map((p) => `Port ${p.port} (${p.service})`)
        .join(", ");
      results.push({
        category: "Network",
        severity: "informational",
        title: "Nmap: Open Ports Detected",
        description: `The following open ports were detected: ${portList}.`,
        recommendation:
          "Review each open port and ensure only necessary services are exposed. Consider closing unused ports.",
      });

      // Check for potentially risky services
      const riskyServices = [
        "ssh",
        "telnet",
        "ftp",
        "http",
        "https",
        "smb",
        "netbios",
      ];
      openPorts.forEach(({ port, service }) => {
        const serviceLower = service.toLowerCase();
        if (riskyServices.some((risk) => serviceLower.includes(risk))) {
          results.push({
            category: "Network",
            severity: "medium",
            title: `Nmap: Potentially Exposed Service ${service} on Port ${port}`,
            description: `Service ${service} is exposed on port ${port}. Ensure this service is properly secured and only accessible from trusted networks.`,
            recommendation:
              "Review access controls for this service and consider using firewalls to restrict access.",
          });
        }
      });

      // Check for common web ports
      const webPorts = openPorts.filter(
        (p) =>
          p.port === "80" ||
          p.port === "443" ||
          p.port === "8080" ||
          p.port === "8443",
      );
      if (webPorts.length > 0) {
        results.push({
          category: "Network",
          severity: "informational",
          title: "Nmap: Web Services Detected",
          description: `Web services are running on ports: ${webPorts.map((p) => p.port).join(", ")}.`,
          recommendation:
            "Ensure web servers are properly configured with security headers and HTTPS.",
        });
      }
    }
  } catch (error) {
    if (error.killed) {
      results.push({
        category: "Network",
        severity: "high",
        title: "Nmap Scan Timeout",
        description: `The Nmap scan timed out after ${Math.round(NMAP_TIMEOUT_MS / 1000)} seconds.`,
        recommendation:
          "The target may be slow to respond or filtering probes. This quick scan is capped at 30 seconds to keep scans responsive.",
      });
    } else {
      results.push({
        category: "Network",
        severity: "critical",
        title: "Nmap Scan Failed",
        description: `Failed to run Nmap scan: ${error.message || "unknown error"}`,
        recommendation:
          "Ensure Nmap is installed and accessible. Check network connectivity to the target.",
      });
    }
  }

  return results;
}

module.exports = { scanNmap };
