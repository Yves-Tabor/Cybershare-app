const { scanLogger } = require('../../../src/utils/logger');

/**
 * Nuclei JSONL Parser
 * Parses Nuclei JSONL output into structured array
 */

/**
 * Parse Nuclei JSONL output
 */
function parseNucleiJsonl(jsonlString) {
  if (!jsonlString || !jsonlString.trim()) {
    return [];
  }

  try {
    const lines = jsonlString.trim().split('\n');
    const results = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const finding = JSON.parse(line);
        results.push(finding);
      } catch (e) {
        scanLogger.warn('[NucleiParser] Failed to parse JSON line:', line.substring(0, 100));
        // Skip invalid JSON lines
      }
    }

    return results;
  } catch (error) {
    scanLogger.error('[NucleiParser] Failed to parse JSONL:', error);
    return [];
  }
}

/**
 * Extract severity from Nuclei finding
 */
function extractSeverity(finding) {
  if (!finding.info || !finding.info.severity) {
    return 'informational';
  }

  const severity = finding.info.severity.toLowerCase();
  const severityMap = {
    'critical': 'critical',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'info': 'informational',
    'unknown': 'informational',
  };

  return severityMap[severity] || 'informational';
}

/**
 * Extract CVE ID from Nuclei finding
 */
function extractCveId(finding) {
  if (finding.info && finding.info.classification && finding.info.classification.cve) {
    return finding.info.classification.cve.id || null;
  }
  return null;
}

/**
 * Extract CVSS score from Nuclei finding
 */
function extractCvssScore(finding) {
  if (finding.info && finding.info.classification && finding.info.classification.cvss) {
    return finding.info.classification.cvss.score || null;
  }
  return null;
}

/**
 * Extract references from Nuclei finding
 */
function extractReferences(finding) {
  if (finding.info && finding.info.reference) {
    return Array.isArray(finding.info.reference) 
      ? finding.info.reference 
      : [finding.info.reference];
  }
  return [];
}

/**
 * Extract tags from Nuclei finding
 */
function extractTags(finding) {
  if (finding.info && finding.info.tags) {
    return Array.isArray(finding.info.tags) 
      ? finding.info.tags 
      : finding.info.tags.split(',').map(t => t.trim());
  }
  return [];
}

/**
 * Normalize Nuclei finding to standard format
 */
function normalizeNucleiFinding(finding) {
  return {
    templateId: finding.templateID || null,
    templatePath: finding.templatePath || null,
    severity: extractSeverity(finding),
    name: finding.info?.name || 'Unknown Finding',
    description: finding.info?.description || null,
    remediation: finding.info?.remediation || null,
    cveId: extractCveId(finding),
    cvssScore: extractCvssScore(finding),
    references: extractReferences(finding),
    tags: extractTags(finding),
    matchedAt: finding.matchedAt || null,
    extractedResults: finding.extractedResults || null,
    request: finding.request || null,
    response: finding.response || null,
    curlCommand: finding.curlCommand || null,
    matcherStatus: finding.matcherStatus || null,
  };
}

module.exports = {
  parseNucleiJsonl,
  extractSeverity,
  extractCveId,
  extractCvssScore,
  extractReferences,
  extractTags,
  normalizeNucleiFinding,
};
