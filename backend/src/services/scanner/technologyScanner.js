const axios = require('axios');
const { lookupCVEs, cvssToSeverity } = require('./cveLookupService');

/**
 * Technology Scanner
 * Detects web technologies using HTTP headers and response analysis with improved precision
 * Includes version extraction and CVE cross-referencing for detected versions
 */
async function scanTechnologies(targetUrl) {
  const results = [];
  const detectedTechnologies = [];

  try {
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      validateStatus: () => true,
    });

    const headers = response.headers;
    const html = response.data;

    // Detect via headers with confidence scoring and version extraction
    const headerPatterns = {
      'X-Powered-By': {
        patterns: {
          'Express': { regex: /express/i, confidence: 'high', versionRegex: /express[\/\s-]?([0-9.]+)/i },
          'PHP': { regex: /php/i, confidence: 'high', versionRegex: /php[\/\s-]?([0-9.]+)/i },
          'ASP.NET': { regex: /asp\.net/i, confidence: 'high', versionRegex: /asp\.net[\/\s-]?([0-9.]+)/i },
          'Next.js': { regex: /next\.js/i, confidence: 'high', versionRegex: /next\.js[\/\s-]?([0-9.]+)/i },
          'Nuxt.js': { regex: /nuxt\.js/i, confidence: 'high', versionRegex: /nuxt\.js[\/\s-]?([0-9.]+)/i },
        },
      },
      'Server': {
        patterns: {
          'Apache': { regex: /apache/i, confidence: 'high', versionRegex: /apache[\/\s-]?([0-9.]+)/i },
          'Nginx': { regex: /nginx/i, confidence: 'high', versionRegex: /nginx[\/\s-]?([0-9.]+)/i },
          'IIS': { regex: /iis/i, confidence: 'high', versionRegex: /iis[\/\s-]?([0-9.]+)/i },
          'Cloudflare': { regex: /cloudflare/i, confidence: 'high' },
          'LiteSpeed': { regex: /litespeed/i, confidence: 'high', versionRegex: /litespeed[\/\s-]?([0-9.]+)/i },
        },
      },
    };

    Object.keys(headerPatterns).forEach(headerName => {
      const headerKey = Object.keys(headers).find(
        key => key.toLowerCase() === headerName.toLowerCase()
      );

      if (headerKey && headers[headerKey]) {
        const headerValue = headers[headerKey];
        const patterns = headerPatterns[headerName].patterns;

        Object.keys(patterns).forEach(tech => {
          if (patterns[tech].regex.test(headerValue)) {
            if (!detectedTechnologies.find(t => t.name === tech)) {
              // Extract version if versionRegex is available
              let version = null;
              if (patterns[tech].versionRegex) {
                const versionMatch = headerValue.match(patterns[tech].versionRegex);
                if (versionMatch && versionMatch[1]) {
                  version = versionMatch[1];
                }
              }

              detectedTechnologies.push({
                name: tech,
                source: `header:${headerName}`,
                confidence: patterns[tech].confidence,
                matchReason: `Detected via ${headerName} header`,
                value: headerValue,
                version: version
              });
            }
          }
        });
      }
    });

    // Detect via HTML content with more precise patterns and version extraction
    const htmlPatterns = {
      'React': {
        regex: /react(?:\.min)?\.js|__REACT_DEVTOOLS_GLOBAL_HOOK__|data-reactroot/i,
        confidence: 'high',
        matchReason: 'Detected via React script or DevTools hook',
        versionRegex: /react[\/-]?([0-9.]+)(?:\.min)?\.js/i
      },
      'Vue': {
        regex: /vue(?:\.min)?\.js|__vue__|data-v-[a-f0-9]+/i,
        confidence: 'high',
        matchReason: 'Detected via Vue script or directive attributes',
        versionRegex: /vue[\/-]?([0-9.]+)(?:\.min)?\.js/i
      },
      'Angular': {
        regex: /angular(?:\.min)?\.js|ng-app|ng-version/i,
        confidence: 'high',
        matchReason: 'Detected via Angular script or directive',
        versionRegex: /angular[\/-]?([0-9.]+)(?:\.min)?\.js|ng-version[^\d"]*"?([0-9.]+)/i
      },
      'jQuery': {
        regex: /jquery(?:-[0-9.]+)?(?:\.min)?\.js/i,
        confidence: 'high',
        matchReason: 'Detected via jQuery script file',
        versionRegex: /jquery-([0-9.]+)(?:\.min)?\.js/i
      },
      'WordPress': {
        regex: /wp-content\/|wp-includes\/|wp-json\/|generator" content="WordPress/i,
        confidence: 'high',
        matchReason: 'Detected via WordPress-specific paths or meta generator',
        versionRegex: /generator" content="WordPress ([0-9.]+)/i
      },
      'Laravel': {
        regex: /laravel|XSRF-TOKEN|laravel_session/i,
        confidence: 'medium',
        matchReason: 'Detected via Laravel-specific cookies or patterns'
      },
      'Bootstrap': {
        regex: /bootstrap(?:\.min)?\.css|bootstrap(?:\.min)?\.js/i,
        confidence: 'high',
        matchReason: 'Detected via Bootstrap CSS/JS files',
        versionRegex: /bootstrap[\/-]?([0-9.]+)(?:\.min)?\.(css|js)/i
      },
      'Tailwind CSS': {
        regex: /tailwind(?:\.min)?\.css|class="[^"]* (?:flex|grid|items-|justify-)/i,
        confidence: 'medium',
        matchReason: 'Detected via Tailwind CSS file or utility classes',
        versionRegex: /tailwind[\/-]?([0-9.]+)(?:\.min)?\.css/i
      },
      'Next.js': {
        regex: /_next\/static\/|__NEXT_DATA__|next\/link/i,
        confidence: 'high',
        matchReason: 'Detected via Next.js static paths or data script'
      },
      'Nuxt.js': {
        regex: /_nuxt\/|__NUXT__|nuxt-link/i,
        confidence: 'high',
        matchReason: 'Detected via Nuxt.js static paths or component'
      },
      'Svelte': {
        regex: /svelte(?:\.min)?\.js|__svelte/i,
        confidence: 'high',
        matchReason: 'Detected via Svelte script or internal marker',
        versionRegex: /svelte[\/-]?([0-9.]+)(?:\.min)?\.js/i
      },
    };

    if (typeof html === 'string') {
      Object.keys(htmlPatterns).forEach(tech => {
        const pattern = htmlPatterns[tech];
        if (pattern.regex.test(html)) {
          if (!detectedTechnologies.find(t => t.name === tech)) {
            // Extract version if versionRegex is available
            let version = null;
            if (pattern.versionRegex) {
              const versionMatch = html.match(pattern.versionRegex);
              if (versionMatch) {
                // Handle multiple capture groups (e.g., Angular ng-version)
                version = versionMatch[1] || versionMatch[2];
              }
            }

            detectedTechnologies.push({
              name: tech,
              source: 'html',
              confidence: pattern.confidence,
              matchReason: pattern.matchReason,
              version: version
            });
          }
        }
      });
    }

    // Add informational result about detected technologies with confidence
    if (detectedTechnologies.length > 0) {
      const techDetails = detectedTechnologies.map(t =>
        `${t.name} (${t.confidence} confidence, ${t.matchReason})`
      ).join(', ');

      results.push({
        category: 'Technology Detection',
        severity: 'informational',
        confidence: 'heuristic',
        title: 'Detected Technologies',
        description: `The following technologies were detected: ${techDetails}. This finding covers broad technology stack fingerprinting. (Note: HTTP header information disclosure is handled separately by the header scanner.)`,
        recommendation: 'Keep these technologies updated with the latest security patches. Monitor for vulnerabilities in detected frameworks and libraries.',
        metadata: {
          technologies: detectedTechnologies
        }
      });
    } else {
      results.push({
        category: 'Technology Detection',
        severity: 'informational',
        confidence: 'confirmed',
        title: 'No Technologies Detected',
        description: 'No specific technologies could be identified from headers or HTML content.',
        recommendation: 'This may indicate the site is using custom solutions or has security headers that hide technology information.',
      });
    }

    // Process detected technologies with CVE lookup for versions
    // Only technologies with specific version numbers get CVE lookups
    const technologiesWithCVE = ['WordPress', 'PHP', 'React', 'Vue', 'Angular', 'jQuery', 'Bootstrap', 'Apache', 'Nginx'];
    
    // Prepare CVE lookup tasks for parallel execution
    const cveLookupTasks = [];
    const techsWithVersions = [];
    
    for (const tech of detectedTechnologies) {
      if (!technologiesWithCVE.includes(tech.name)) continue;
      
      techsWithVersions.push(tech);
      
      // If version is detected, queue CVE lookup
      if (tech.version) {
        cveLookupTasks.push(
          lookupCVEs(tech.name, tech.version)
            .then(cveData => ({ tech, cveData }))
            .catch(error => ({ tech, cveData: null, error }))
        );
      }
    }
    
    // Execute all CVE lookups in parallel (rate-limited by queue)
    const cveResults = await Promise.all(cveLookupTasks);
    
    // Create a map of tech name to CVE data for easy lookup
    const cveDataMap = new Map();
    cveResults.forEach(({ tech, cveData }) => {
      cveDataMap.set(tech.name, cveData);
    });
    
    // Generate findings for each technology
    for (const tech of techsWithVersions) {
      const techInfo = {
        category: 'Technology Detection',
        confidence: tech.confidence,
        title: `${tech.name} Detected`,
        metadata: {
          technology: tech.name,
          matchReason: tech.matchReason,
          detectedVersion: tech.version || 'unknown'
        }
      };
      
      // If version is detected, use CVE lookup results
      if (tech.version) {
        const cveData = cveDataMap.get(tech.name);
        
        if (cveData && cveData.cveIds && cveData.cveIds.length > 0) {
          // CVEs found - escalate severity based on CVSS score
          const severity = cveData.cvssScore ? cvssToSeverity(cveData.cvssScore) : 'medium'; // Default to medium if score unavailable
          
          techInfo.severity = severity;
          const scoreText = cveData.cvssScore ? cveData.cvssScore : 'unavailable';
          techInfo.description = `${tech.name} version ${tech.version} has known vulnerabilities. ${cveData.cveIds.length} CVE(s) found with highest CVSS score: ${scoreText}.`;
          techInfo.recommendation = `Upgrade ${tech.name} from ${tech.version} to the latest stable version to address ${cveData.cveIds[0]}${cveData.cveIds.length > 1 ? ` and ${cveData.cveIds.length - 1} other CVEs` : ''}.`;
          techInfo.typeSlug = 'outdated-technology';
          techInfo.metadata.cveIds = cveData.cveIds;
          techInfo.metadata.cvssScore = cveData.cvssScore;
          techInfo.metadata.cveSummary = cveData.cveSummary;
          techInfo.metadata.cveCount = cveData.cveIds.length;
        } else {
          // No CVEs found - version is clean/patched
          techInfo.severity = 'info';
          techInfo.description = `${tech.name} version ${tech.version} was detected. No known CVEs found for this version - it appears to be up-to-date or patched.`;
          techInfo.recommendation = `Continue monitoring for security updates for ${tech.name}.`;
          techInfo.metadata.cveIds = [];
          techInfo.metadata.cvssScore = 0;
        }
      } else {
        // No version detected - keep as INFO
        techInfo.severity = 'info';
        techInfo.description = `${tech.name} was detected but version could not be determined. This is informational only - using ${tech.name} is not inherently a vulnerability.`;
        techInfo.recommendation = `Keep ${tech.name} updated with the latest security patches. Monitor for vulnerabilities in detected frameworks and libraries.`;
      }
      
      results.push(techInfo);
    }

  } catch (error) {
    results.push({
      category: 'Technology Detection',
      severity: 'critical',
      confidence: 'confirmed',
      title: 'Technology Scan Failed',
      description: `Failed to scan technologies: ${error.message}`,
      recommendation: 'Verify the target URL is accessible.',
    });
  }

  return results;
}

module.exports = { scanTechnologies };
