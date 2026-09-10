const fs = require("fs");
const { execFile } = require("child_process");
const { URL } = require("url");
const path = require("path");
const util = require("util");
const {
  resolveToolExecutable,
  resolveNucleiTemplatesDir,
} = require("./toolResolver");

const execFilePromise = util.promisify(execFile);

const NUCLEI_TIMEOUT_MS = Math.min(
  Number(process.env.NUCLEI_TIMEOUT_MS) || 30000,
  30000,
);

function getQuickTemplatePaths(nucleiTemplatesDir) {
  const quickTemplateDirs = [
    ["http", "exposures", "apis"],
    ["http", "exposures", "backups"],
    ["http", "exposures", "logs"],
    ["http", "misconfiguration", "debug"],
    ["http", "misconfiguration", "apache"],
    ["http", "misconfiguration", "nginx"],
    ["http", "misconfiguration", "proxy"],
  ];

  return quickTemplateDirs
    .map((segments) => path.join(nucleiTemplatesDir, ...segments))
    .filter((templatePath) => fs.existsSync(templatePath));
}

/**
 * Nuclei Scanner
 * Uses Nuclei to detect CVEs and security misconfigurations
 * Note: Nuclei must be installed on the system and available in PATH
 */
function unquotePath(filePath) {
  return typeof filePath === "string" &&
    filePath.startsWith('"') &&
    filePath.endsWith('"')
    ? filePath.slice(1, -1)
    : filePath;
}

async function runNuclei(executablePath, targetUrl, templatePaths) {
  const args = ["-u", targetUrl];
  templatePaths.forEach((templatePath) => {
    args.push("-t", templatePath);
  });
  args.push(
    "-severity",
    "critical,high",
    "-rl",
    "50",
    "-timeout",
    "5",
    "-retries",
    "0",
    "-j",
    "-silent",
    "-duc",
    "-ni",
    "-nh",
    "-no-stdin",
  );

  return execFilePromise(executablePath, args, {
    timeout: NUCLEI_TIMEOUT_MS,
  });
}

async function scanNuclei(targetUrl) {
  const results = [];

  try {
    new URL(targetUrl);
    const nucleiExecutable = unquotePath(resolveToolExecutable("nuclei"));
    const nucleiTemplatesDir = resolveNucleiTemplatesDir();

    // Check if nuclei is available
    try {
      await execFilePromise(nucleiExecutable, ["-version"], {
        timeout: 5000,
      });
    } catch (error) {
      results.push({
        category: "Vulnerability",
        severity: "critical",
        title: "Nuclei Not Installed",
        description:
          "Nuclei is not installed or not available in the system PATH. Vulnerability scanning requires Nuclei to be installed.",
        recommendation:
          "Install Nuclei by running: go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest. Update templates with: nuclei -update-templates",
      });
      return results;
    }

    if (!nucleiTemplatesDir) {
      results.push({
        category: "Vulnerability",
        severity: "critical",
        title: "Nuclei Templates Not Found",
        description:
          "Nuclei is installed, but the nuclei-templates directory could not be located.",
        recommendation:
          "Run nuclei -update-templates or set NUCLEI_TEMPLATES_DIR to your nuclei templates folder.",
      });
      return results;
    }

    // Use a small curated Nuclei template set so quick scans finish reliably
    const templatePaths = getQuickTemplatePaths(nucleiTemplatesDir);

    if (templatePaths.length === 0) {
      results.push({
        category: "Vulnerability",
        severity: "critical",
        title: "Nuclei Templates Not Found",
        description:
          "Nuclei is installed, but no supported quick-scan template folders were found.",
        recommendation:
          "Update nuclei templates with nuclei -update-templates or set NUCLEI_TEMPLATES_DIR correctly.",
      });
      return results;
    }

    // Run nuclei scan with a small curated template set for fast, reliable results
    const { stdout, stderr } = await runNuclei(
      nucleiExecutable,
      targetUrl,
      templatePaths,
    );

    if (stderr && !stderr.includes("no results found")) {
      results.push({
        category: "Vulnerability",
        severity: "low",
        title: "Nuclei Scan Warning",
        description: `Nuclei produced warnings: ${stderr}`,
        recommendation:
          "Review the warnings and ensure proper network connectivity.",
      });
    }

    // Parse nuclei JSON output
    if (stdout.trim()) {
      const lines = stdout.trim().split("\n");

      lines.forEach((line) => {
        try {
          const finding = JSON.parse(line);

          // Map nuclei severity to our severity levels
          let severity = "low";
          if (finding.info && finding.info.severity) {
            const nucleiSeverity = finding.info.severity.toLowerCase();
            if (nucleiSeverity === "critical") severity = "critical";
            else if (nucleiSeverity === "high") severity = "high";
            else if (nucleiSeverity === "medium") severity = "medium";
            else if (nucleiSeverity === "low") severity = "low";
            else severity = "informational";
          }

          results.push({
            category: "Vulnerability",
            severity,
            title: `Nuclei: ${finding.info?.name || "Security Finding"}`,
            description:
              finding.info?.description ||
              `Nuclei detected: ${finding.templateID}`,
            recommendation:
              finding.info?.remediation ||
              "Review the finding and apply appropriate security measures.",
            typeSlug: 'nuclei-generic-finding',
            metadata: {
              templateName: finding.info?.name || finding.templateID || "Unknown",
              templateId: finding.templateID,
              referenceUrl: finding.info?.reference || finding.info?.tags?.reference || null,
              severity: finding.info?.severity
            }
          });
        } catch (parseError) {
          // Skip lines that can't be parsed as JSON
        }
      });

      if (results.length === 0) {
        results.push({
          category: "Vulnerability",
          severity: "informational",
          title: "Nuclei: No Vulnerabilities Detected",
          description:
            "Nuclei did not detect any critical or high severity vulnerabilities with the current template set.",
          recommendation:
            "This is a good sign, but continue to monitor for new vulnerabilities and keep systems updated.",
        });
      }
    } else {
      results.push({
        category: "Vulnerability",
        severity: "informational",
        title: "Nuclei: No Vulnerabilities Detected",
        description:
          "Nuclei did not detect any vulnerabilities with the current template set.",
        recommendation:
          "This is a good sign, but continue to monitor for new vulnerabilities and keep systems updated.",
      });
    }
  } catch (error) {
    if (error.killed) {
      results.push({
        category: "Vulnerability",
        severity: "high",
        title: "Nuclei Scan Timeout",
        description: `The Nuclei scan timed out after ${Math.round(NUCLEI_TIMEOUT_MS / 1000)} seconds.`,
        recommendation:
          "The target may be slow to respond or template execution is extensive. This quick scan is capped at 30 seconds to keep scans responsive.",
      });
    } else {
      results.push({
        category: "Vulnerability",
        severity: "critical",
        title: "Nuclei Scan Failed",
        description: `Failed to run Nuclei scan: ${error.message}`,
        recommendation:
          "Ensure Nuclei is installed and accessible. Check network connectivity to the target.",
      });
    }
  }

  return results;
}

module.exports = { scanNuclei };
