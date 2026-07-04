const axios = require('axios');

/**
 * Technology Scanner
 * Detects web technologies using HTTP headers and response analysis
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

    // Detect via headers
    const headerPatterns = {
      'X-Powered-By': {
        patterns: {
          'Express': /express/i,
          'PHP': /php/i,
          'ASP.NET': /asp\.net/i,
          'Next.js': /next\.js/i,
          'Nuxt.js': /nuxt\.js/i,
        },
      },
      'Server': {
        patterns: {
          'Apache': /apache/i,
          'Nginx': /nginx/i,
          'IIS': /iis/i,
          'Cloudflare': /cloudflare/i,
          'LiteSpeed': /litespeed/i,
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
          if (patterns[tech].test(headerValue)) {
            if (!detectedTechnologies.includes(tech)) {
              detectedTechnologies.push(tech);
            }
          }
        });
      }
    });

    // Detect via HTML content (basic patterns)
    const htmlPatterns = {
      'React': /react/i,
      'Vue': /vue/i,
      'Angular': /angular/i,
      'jQuery': /jquery/i,
      'WordPress': /wp-content|wordpress/i,
      'Laravel': /laravel/i,
      'Bootstrap': /bootstrap/i,
      'Tailwind CSS': /tailwind/i,
      'Next.js': /next/i,
      'Nuxt.js': /nuxt/i,
      'Svelte': /svelte/i,
    };

    if (typeof html === 'string') {
      Object.keys(htmlPatterns).forEach(tech => {
        if (htmlPatterns[tech].test(html)) {
          if (!detectedTechnologies.includes(tech)) {
            detectedTechnologies.push(tech);
          }
        }
      });
    }

    // Add informational result about detected technologies
    if (detectedTechnologies.length > 0) {
      results.push({
        category: 'Technology Detection',
        severity: 'informational',
        title: 'Detected Technologies',
        description: `The following technologies were detected: ${detectedTechnologies.join(', ')}.`,
        recommendation: 'Keep these technologies updated with the latest security patches. Monitor for vulnerabilities in detected frameworks and libraries.',
      });
    } else {
      results.push({
        category: 'Technology Detection',
        severity: 'informational',
        title: 'No Technologies Detected',
        description: 'No specific technologies could be identified from headers or HTML content.',
        recommendation: 'This may indicate the site is using custom solutions or has security headers that hide technology information.',
      });
    }

    // Check for outdated technology indicators (simplified)
    if (detectedTechnologies.includes('PHP')) {
      results.push({
        category: 'Technology Detection',
        severity: 'low',
        title: 'PHP Detected',
        description: 'PHP was detected. Ensure you are using a supported PHP version (8.1+ recommended).',
        recommendation: 'Keep PHP updated to the latest stable version and apply security patches promptly.',
      });
    }

    if (detectedTechnologies.includes('WordPress')) {
      results.push({
        category: 'Technology Detection',
        severity: 'medium',
        title: 'WordPress Detected',
        description: 'WordPress was detected. WordPress is a common target for attacks due to its popularity.',
        recommendation: 'Keep WordPress core, themes, and plugins updated. Use security plugins and implement proper access controls.',
      });
    }

  } catch (error) {
    results.push({
      category: 'Technology Detection',
      severity: 'critical',
      title: 'Technology Scan Failed',
      description: `Failed to scan technologies: ${error.message}`,
      recommendation: 'Verify the target URL is accessible.',
    });
  }

  return results;
}

module.exports = { scanTechnologies };
