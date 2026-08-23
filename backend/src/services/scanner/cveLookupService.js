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
 */
function extractHighestCVSS(cveData) {
  let highestScore = 0;
  
  cveData.forEach(vuln => {
    if (vuln.metrics && vuln.metrics.cvssMetricV31) {
      vuln.metrics.cvssMetricV31.forEach(metric => {
        if (metric.cvssData && metric.cvssData.baseScore) {
          highestScore = Math.max(highestScore, metric.cvssData.baseScore);
        }
      });
    } else if (vuln.metrics && vuln.metrics.cvssMetricV2) {
      vuln.metrics.cvssMetricV2.forEach(metric => {
        if (metric.cvssData && metric.cvssData.baseScore) {
          highestScore = Math.max(highestScore, metric.cvssData.baseScore);
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
      
      // Process results
      const result = {
        cveIds: extractCVEIds(cveData),
        cvssScore: extractHighestCVSS(cveData),
        cveSummary: generateSummary(cveData),
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
