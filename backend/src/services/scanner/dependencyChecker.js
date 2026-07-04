const { exec } = require("child_process");
const util = require("util");
const { resolveToolExecutable } = require("./toolResolver");

const execPromise = util.promisify(exec);

/**
 * Dependency Checker
 * Checks if external security tools (Nmap, Nuclei) are installed
 */
async function checkDependencies() {
  const nmapExecutable = resolveToolExecutable("nmap");
  const nucleiExecutable = resolveToolExecutable("nuclei");

  const dependencies = {
    nmap: {
      installed: false,
      version: null,
      command: `${nmapExecutable} --version`,
    },
    nuclei: {
      installed: false,
      version: null,
      command: `${nucleiExecutable} -version`,
    },
  };

  // Check Nmap
  try {
    const { stdout } = await execPromise(`${nmapExecutable} --version`, {
      timeout: 5000,
    });

    dependencies.nmap.installed = true;

    // Extract version from output
    const versionMatch = stdout.match(/Nmap version (\d+\.\d+)/i);
    dependencies.nmap.version = versionMatch ? versionMatch[1] : "installed";
  } catch (error) {
    dependencies.nmap.installed = false;
  }

  // Check Nuclei
  try {
    const { stdout, stderr } = await execPromise(
      `${nucleiExecutable} -version`,
      {
        timeout: 5000,
      },
    );
    const output = `${stdout || ""}\n${stderr || ""}`;

    dependencies.nuclei.installed = true;

    // Extract version from output
    const versionMatch = output.match(/version:\s*v?(\d+\.\d+\.\d+)/i);
    dependencies.nuclei.version = versionMatch ? versionMatch[1] : "installed";
  } catch (error) {
    dependencies.nuclei.installed = false;
  }

  // Determine scan mode
  const allInstalled =
    dependencies.nmap.installed && dependencies.nuclei.installed;
  const scanMode = allInstalled ? "full" : "limited";

  return {
    dependencies,
    scanMode,
    availableScanners: getAvailableScanners(dependencies),
  };
}

function getAvailableScanners(dependencies) {
  const scanners = [
    { name: "HTTP Headers", available: true, category: "HTTP Headers" },
    { name: "SSL/TLS", available: true, category: "SSL/TLS" },
    { name: "DNS Security", available: true, category: "DNS" },
    { name: "Cookie Security", available: true, category: "Cookies" },
    {
      name: "Technology Detection",
      available: true,
      category: "Technology Detection",
    },
    {
      name: "Port Scanning (Nmap)",
      available: dependencies.nmap.installed,
      category: "Network",
    },
    {
      name: "Vulnerability Scanning (Nuclei)",
      available: dependencies.nuclei.installed,
      category: "Vulnerability",
    },
  ];

  return scanners;
}

module.exports = { checkDependencies };
