const axios = require('axios');

/**
 * Technology Scanner
 * Detects web technologies using HTTP headers and response analysis with improved precision
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

    // Detect via headers with confidence scoring
    const headerPatterns = {
      'X-Powered-By': {
        patterns: {
          'Express': { regex: /express/i, confidence: 'high' },
          'PHP': { regex: /php/i, confidence: 'high' },
          'ASP.NET': { regex: /asp\.net/i, confidence: 'high' },
          'Next.js': { regex: /next\.js/i, confidence: 'high' },
          'Nuxt.js': { regex: /nuxt\.js/i, confidence: 'high' },
        },
      },
      'Server': {
        patterns: {
          'Apache': { regex: /apache/i, confidence: 'high' },
          'Nginx': { regex: /nginx/i, confidence: 'high' },
          'IIS': { regex: /iis/i, confidence: 'high' },
          'Cloudflare': { regex: /cloudflare/i, confidence: 'high' },
          'LiteSpeed': { regex: /litespeed/i, confidence: 'high' },
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
              detectedTechnologies.push({
                name: tech,
                source: `header:${headerName}`,
                confidence: patterns[tech].confidence,
                matchReason: `Detected via ${headerName} header`,
                value: headerValue
              });
            }
          }
        });
      }
    });

    // Detect via HTML content with more precise patterns
    const htmlPatterns = {
      'React': {
        regex: /react(?:\.min)?\.js|__REACT_DEVTOOLS_GLOBAL_HOOK__|data-reactroot/i,
        confidence: 'high',
        matchReason: 'Detected via React script or DevTools hook'
      },
      'Vue': {
        regex: /vue(?:\.min)?\.js|__vue__|data-v-[a-f0-9]+/i,
        confidence: 'high',
        matchReason: 'Detected via Vue script or directive attributes'
      },
      'Angular': {
        regex: /angular(?:\.min)?\.js|ng-app|ng-version/i,
        confidence: 'high',
        matchReason: 'Detected via Angular script or directive'
      },
      'jQuery': {
        regex: /jquery(?:-[0-9.]+)?(?:\.min)?\.js/i,
        confidence: 'high',
        matchReason: 'Detected via jQuery script file'
      },
      'WordPress': {
        regex: /wp-content\/|wp-includes\/|wp-json\/|generator" content="WordPress/i,
        confidence: 'high',
        matchReason: 'Detected via WordPress-specific paths or meta generator'
      },
      'Laravel': {
        regex: /laravel|XSRF-TOKEN|laravel_session/i,
        confidence: 'medium',
        matchReason: 'Detected via Laravel-specific cookies or patterns'
      },
      'Bootstrap': {
        regex: /bootstrap(?:\.min)?\.css|bootstrap(?:\.min)?\.js/i,
        confidence: 'high',
        matchReason: 'Detected via Bootstrap CSS/JS files'
      },
      'Tailwind CSS': {
        regex: /tailwind(?:\.min)?\.css|class="[^"]* (?:flex|grid|items-|justify-)/i,
        confidence: 'medium',
        matchReason: 'Detected via Tailwind CSS file or utility classes'
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
        matchReason: 'Detected via Svelte script or internal marker'
      },
    };

    if (typeof html === 'string') {
      Object.keys(htmlPatterns).forEach(tech => {
        const pattern = htmlPatterns[tech];
        if (pattern.regex.test(html)) {
          if (!detectedTechnologies.find(t => t.name === tech)) {
            detectedTechnologies.push({
              name: tech,
              source: 'html',
              confidence: pattern.confidence,
              matchReason: pattern.matchReason,
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

    // Downgrade generic technology detection to INFO severity
    // Only escalate to MEDIUM/HIGH when specific vulnerable versions are detected
    if (detectedTechnologies.find(t => t.name === 'PHP')) {
      const phpTech = detectedTechnologies.find(t => t.name === 'PHP');
      results.push({
        category: 'Technology Detection',
        severity: 'info',
        confidence: phpTech?.confidence || 'medium',
        title: 'PHP Detected',
        description: 'PHP was detected. Ensure you are using a supported PHP version (8.1+ recommended).',
        recommendation: 'Keep PHP updated to the latest stable version and apply security patches promptly.',
        metadata: {
          technology: 'PHP',
          matchReason: phpTech?.matchReason
        }
      });
    }

    if (detectedTechnologies.find(t => t.name === 'WordPress')) {
      const wpTech = detectedTechnologies.find(t => t.name === 'WordPress');
      results.push({
        category: 'Technology Detection',
        severity: 'info',
        confidence: wpTech?.confidence || 'high',
        title: 'WordPress Detected',
        description: 'WordPress was detected. This is informational only - using WordPress is not inherently a vulnerability.',
        recommendation: 'Keep WordPress core, themes, and plugins updated. Use security plugins and implement proper access controls.',
        metadata: {
          technology: 'WordPress',
          matchReason: wpTech?.matchReason
        }
      });
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
