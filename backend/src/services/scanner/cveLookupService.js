const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * CVE Lookup Service
 * Queries NVD API for known vulnerabilities matching detected technology versions
 * Implements rate limiting with a queue for parallel requests and caching to avoid API abuse
 */

// Rate limiting configuration
const RATE_LIMIT_DELAY_MS = 6000; // 6 seconds between requests (safe for no API key: ~5 req/30s)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_FILE_PATH = path.join(__dirname, '../../../data/cve-cache.json');

// In-memory cache (also persisted to file)
let cveCache = {};
let isCacheLoaded = false;

// Rate-limited queue for parallel requests
const requestQueue = [];
let isProcessingQueue = false;

/**
 * Load cache from file on first use
 */
async function loadCache() {
  if (isCacheLoaded) return;

  try {
    const cacheData = await fs.readFile(CACHE_FILE_PATH, 'utf8');
    cveCache = JSON.parse(cacheData);
    
    // Clean expired entries
    const now = Date.now();
    Object.keys(cveCache).forEach(key => {
      if (now - cveCache[key].timestamp > CACHE_TTL_MS) {
        delete cveCache[key];
      }
    });
    
    isCacheLoaded = true;
  } catch (error) {
    // Cache file doesn't exist or is invalid - start fresh
    cveCache = {};
    isCacheLoaded = true;
  }
}

/**
 * Save cache to file
 */
async function saveCache() {
  try {
    const cacheDir = path.dirname(CACHE_FILE_PATH);
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cveCache, null, 2));
  } catch (error) {
    console.error('[CVE Lookup] Failed to save cache:', error.message);
  }
}

/**
 * Process the request queue with rate limiting
 */
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const { resolve, reject, fn } = requestQueue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Rate limit delay between requests
    if (requestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  isProcessingQueue = false;
}

/**
 * Add a request to the rate-limited queue
 */
function queueRequest(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, fn });
    
    // Start processing if not already running
    if (!isProcessingQueue) {
      processQueue().catch(err => {
        console.error('[CVE Lookup] Queue processing error:', err.message);
      });
    }
  });
}

/**
 * Parse version string to comparable number array
 * Handles semantic versioning (e.g., "5.4.2" -> [5, 4, 2])
 */
function parseVersion(versionStr) {
  if (!versionStr) return null;
  const parts = versionStr.split('.').map(p => parseInt(p, 10));
  const result = parts.every(p => !isNaN(p)) ? parts : null;
  console.log(`[CVE Lookup] parseVersion("${versionStr}") ->`, result);
  return result;
}

/**
 * Compare two version arrays
 * Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
 */
function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  
  const maxLength = Math.max(v1.length, v2.length);
  for (let i = 0; i < maxLength; i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  console.log(`[CVE Lookup] compareVersions([${v1}], [${v2}]) -> 0 (equal)`);
  return 0;
}

/**
 * Check if a version falls within a version range from NVD CVE configuration
 */
function isVersionInRange(detectedVersion, config) {
  const detected = parseVersion(detectedVersion);
  if (!detected) return false; // Can't compare if version is unparseable
  
  console.log(`[CVE Lookup] isVersionInRange("${detectedVersion}", config):`, JSON.stringify(config, null, 2));
  
  // Check versionStartIncluding
  if (config.versionStartIncluding) {
    const start = parseVersion(config.versionStartIncluding);
    const cmp = compareVersions(detected, start);
    console.log(`[CVE Lookup] versionStartIncluding="${config.versionStartIncluding}" -> compare=${cmp}`);
    if (start && cmp < 0) {
      console.log(`[CVE Lookup] REJECTED: detected version before start range`);
      return false; // Detected version is before start range
    }
  }
  
  // Check versionEndExcluding
  if (config.versionEndExcluding) {
    const end = parseVersion(config.versionEndExcluding);
    const cmp = compareVersions(detected, end);
    console.log(`[CVE Lookup] versionEndExcluding="${config.versionEndExcluding}" -> compare=${cmp}`);
    if (end && cmp >= 0) {
      console.log(`[CVE Lookup] REJECTED: detected version at or after end range`);
      return false; // Detected version is at or after end range
    }
  }
  
  // Check versionEndIncluding
  if (config.versionEndIncluding) {
    const end = parseVersion(config.versionEndIncluding);
    const cmp = compareVersions(detected, end);
    console.log(`[CVE Lookup] versionEndIncluding="${config.versionEndIncluding}" -> compare=${cmp}`);
    if (end && cmp > 0) {
      console.log(`[CVE Lookup] REJECTED: detected version after end range`);
      return false; // Detected version is after end range
    }
  }
  
  // Check versionStartExcluding
  if (config.versionStartExcluding) {
    const start = parseVersion(config.versionStartExcluding);
    const cmp = compareVersions(detected, start);
    console.log(`[CVE Lookup] versionStartExcluding="${config.versionStartExcluding}" -> compare=${cmp}`);
    if (start && cmp <= 0) {
      console.log(`[CVE Lookup] REJECTED: detected version at or before start range`);
      return false; // Detected version is at or before start range
    }
  }
  
  console.log(`[CVE Lookup] ACCEPTED: version in range`);
  return true;
}

/**
 * Filter CVEs by version range matching
 * Only includes CVEs where the detected version falls within the affected version range
 */
function filterCVEsByVersion(cveData, detectedVersion) {
  if (!cveData || cveData.length === 0) return [];
  
  console.log(`[CVE Lookup] filterCVEsByVersion: Starting with ${cveData.length} CVEs for version "${detectedVersion}"`);
  
  return cveData.filter(vuln => {
    // ─── NVD API behaviour note ────────────────────────────────────────────────
    // When querying by exact CPE version (e.g. cpe:...:wordpress:6.1.1:...),
    // the NVD already confirms applicability via CPE matching on its side.
    // Older CVEs (pre-NVD 2.0 migration, roughly pre-2024) are returned without
    // a `configurations` block — they have no version range fields to validate
    // against, but their presence in the response IS the version confirmation.
    // Accept them so we don't produce false negatives for legacy CVEs.
    // ──────────────────────────────────────────────────────────────────────────
    if (!vuln.configurations || vuln.configurations.length === 0) {
      console.log(`[CVE Lookup] CVE ${vuln.cve?.id}: ACCEPTED (no configurations block — NVD CPE query already confirmed applicability)`);
      return true;
    }
    
    // Check each configuration
    for (const config of vuln.configurations) {
      if (!config.nodes) continue;
      
      // Check each node in the configuration
      for (const node of config.nodes) {
        if (!node.cpeMatch) continue;
        
        // Check if any CPE match applies to our detected version
        for (const cpe of node.cpeMatch) {
          // Skip if this CPE doesn't match our criteria (already filtered by API query)
          if (!cpe.criteria) continue;
          
          // Check version range if specified
          const versionInRange = isVersionInRange(detectedVersion, cpe);
          if (versionInRange) {
            console.log(`[CVE Lookup] CVE ${vuln.cve?.id}: ACCEPTED (version in range)`);
            return true; // This CVE applies to our detected version
          }
        }
      }
    }
    
    console.log(`[CVE Lookup] CVE ${vuln.cve?.id}: REJECTED (no matching version range)`);
    return false; // No configuration matched our version
  });
}

/**
 * Generate CPE string for NVD API query
 * Format: cpe:2.3:a:vendor:product:version:*:*:*:*:*:*:*
 */
function generateCPE(product, version) {
  // Product to vendor mapping for common technologies
  const vendorMap = {
    'WordPress': 'wordpress',
    'React': 'facebook',
    'Vue': 'vuejs',
    'Angular': 'angularjs',
    'jQuery': 'jquery',
    'Bootstrap': 'getbootstrap',
    'PHP': 'php',
    'Apache': 'apache',
    'Nginx': 'nginx',
    'Next.js': 'vercel',
    'Laravel': 'laravel',
  };
  
  const vendor = vendorMap[product] || product.toLowerCase();
  const normalizedProduct = product.toLowerCase().replace(/\s+/g, '');
  
  return `cpe:2.3:a:${vendor}:${normalizedProduct}:${version}:*:*:*:*:*:*:*`;
}

/**
 * Query NVD API for CVEs matching a CPE string
 * Note: Rate limiting is handled by the queue, not this function
 */
async function queryNVDAPI(cpeString) {
  const apiUrl = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${encodeURIComponent(cpeString)}`;
  
  try {
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Cybershare-Scanner/1.0'
      }
    });
    
    if (response.data && response.data.vulnerabilities) {
      return response.data.vulnerabilities;
    }
    
    return [];
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.error('[CVE Lookup] NVD API timeout');
      throw new Error('NVD API timeout - service may be unavailable');
    } else if (error.response && error.response.status === 403) {
      console.error('[CVE Lookup] NVD API rate limit exceeded');
      throw new Error('NVD API rate limit exceeded');
    } else {
      console.error('[CVE Lookup] NVD API error:', error.message);
      throw new Error(`NVD API error: ${error.message}`);
    }
  }
}

/**
 * Extract highest CVSS score from CVE data
 * Returns null if no valid score is found (instead of defaulting to 0)
 */
function extractHighestCVSS(cveData) {
  let highestScore = null;
  
  cveData.forEach(vuln => {
    if (vuln.metrics && vuln.metrics.cvssMetricV31) {
      vuln.metrics.cvssMetricV31.forEach(metric => {
        if (metric.cvssData && metric.cvssData.baseScore && metric.cvssData.baseScore > 0) {
          if (highestScore === null || metric.cvssData.baseScore > highestScore) {
            highestScore = metric.cvssData.baseScore;
          }
        }
      });
    } else if (vuln.metrics && vuln.metrics.cvssMetricV2) {
      vuln.metrics.cvssMetricV2.forEach(metric => {
        if (metric.cvssData && metric.cvssData.baseScore && metric.cvssData.baseScore > 0) {
          if (highestScore === null || metric.cvssData.baseScore > highestScore) {
            highestScore = metric.cvssData.baseScore;
          }
        }
      });
    }
  });
  
  return highestScore;
}

/**
 * Extract CVE IDs from CVE data
 */
function extractCVEIds(cveData) {
  return cveData.map(vuln => vuln.cve.id);
}

/**
 * Generate a brief summary of the top vulnerability
 */
function generateSummary(cveData) {
  if (!cveData || cveData.length === 0) return null;
  
  // Sort by CVSS score (highest first)
  const sorted = [...cveData].sort((a, b) => {
    const scoreA = extractHighestCVSS([a]);
    const scoreB = extractHighestCVSS([b]);
    return scoreB - scoreA;
  });
  
  const topVuln = sorted[0];
  const description = topVuln.cve.descriptions?.[0]?.value || '';
  
  // Paraphrase to a brief one-sentence summary
  if (description.length > 200) {
    return description.substring(0, 200) + '...';
  }
  
  return description;
}

/**
 * Map CVSS score to severity level
 */
function cvssToSeverity(cvssScore) {
  if (cvssScore >= 9.0) return 'critical';
  if (cvssScore >= 7.0) return 'high';
  if (cvssScore >= 4.0) return 'medium';
  if (cvssScore >= 0.1) return 'low';
  return 'info';
}

/**
 * Main function to look up CVEs for a technology version
 * Uses rate-limited queue for parallel requests
 */
async function lookupCVEs(product, version) {
  await loadCache();
  
  const cacheKey = `${product.toLowerCase()}:${version}`;
  
  // Check cache first
  if (cveCache[cacheKey] && (Date.now() - cveCache[cacheKey].timestamp) < CACHE_TTL_MS) {
    return cveCache[cacheKey].data;
  }
  
  // Queue the API request with rate limiting
  return queueRequest(async () => {
    try {
      const cpeString = generateCPE(product, version);
      const cveData = await queryNVDAPI(cpeString);
      
      // Filter CVEs by version range to exclude irrelevant CVEs
      const filteredCVEs = filterCVEsByVersion(cveData, version);
      
      console.log(`[CVE Lookup] Filtered ${cveData.length} CVEs to ${filteredCVEs.length} applicable CVEs for ${product} ${version}`);
      
      // Process results
      const result = {
        cveIds: extractCVEIds(filteredCVEs),
        cvssScore: extractHighestCVSS(filteredCVEs),
        cveSummary: generateSummary(filteredCVEs),
        severity: null, // Will be set by caller based on CVSS
        timestamp: Date.now()
      };
      
      // Cache the result
      cveCache[cacheKey] = {
        data: result,
        timestamp: Date.now()
      };
      
      // Save cache asynchronously (don't block)
      saveCache().catch(err => console.error('[CVE Lookup] Failed to save cache:', err.message));
      
      return result;
      
    } catch (error) {
      console.error(`[CVE Lookup] Failed to lookup CVEs for ${product} ${version}:`, error.message);
      
      // Return null to indicate lookup failure - scanner will fall back to INFO
      return null;
    }
  });
}

/**
 * Clear cache (useful for testing or forcing refresh)
 */
async function clearCache() {
  cveCache = {};
  try {
    await fs.unlink(CACHE_FILE_PATH);
  } catch (error) {
    // File doesn't exist - that's fine
  }
}

module.exports = {
  lookupCVEs,
  cvssToSeverity,
  clearCache,
  generateCPE
};
