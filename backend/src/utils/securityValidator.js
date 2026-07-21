const { URL } = require('url');
const dns = require('dns').promises;
const { logger } = require('./logger');

/**
 * Security Validator
 * Validates URLs and targets to prevent SSRF, command injection, and other attacks
 */

// Private IP ranges that should be rejected
const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255', cidr: '10.0.0.0/8' },
  { start: '172.16.0.0', end: '172.31.255.255', cidr: '172.16.0.0/12' },
  { start: '192.168.0.0', end: '192.168.255.255', cidr: '192.168.0.0/16' },
  { start: '127.0.0.0', end: '127.255.255.255', cidr: '127.0.0.0/8' },
  { start: '169.254.0.0', end: '169.254.255.255', cidr: '169.254.0.0/16' }, // Link-local
  { start: '0.0.0.0', end: '0.255.255.255', cidr: '0.0.0.0/8' }, // Current network
];

// Reserved IP ranges
const RESERVED_IP_RANGES = [
  { start: '224.0.0.0', end: '239.255.255.255', cidr: '224.0.0.0/4' }, // Multicast
  { start: '240.0.0.0', end: '255.255.255.255', cidr: '240.0.0.0/4' }, // Reserved
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
];

/**
 * Convert IP string to integer for comparison
 */
function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  return (
    (parts[0] << 24) +
    (parts[1] << 16) +
    (parts[2] << 8) +
    parts[3]
  );
}

/**
 * Check if IP is in a given range
 */
function isIpInRange(ip, rangeStart, rangeEnd) {
  const ipInt = ipToInt(ip);
  const startInt = ipToInt(rangeStart);
  const endInt = ipToInt(rangeEnd);
  return ipInt >= startInt && ipInt <= endInt;
}

/**
 * Check if IP is a private IP
 */
function isPrivateIP(ip) {
  return PRIVATE_IP_RANGES.some(range =>
    isIpInRange(ip, range.start, range.end)
  );
}

/**
 * Check if IP is a reserved IP
 */
function isReservedIP(ip) {
  return RESERVED_IP_RANGES.some(range =>
    isIpInRange(ip, range.start, range.end)
  );
}

/**
 * Check if hostname is blocked
 */
function isBlockedHostname(hostname) {
  const lowerHostname = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.includes(lowerHostname);
}

/**
 * Validate URL format and protocol
 */
function validateUrlFormat(urlString) {
  try {
    const url = new URL(urlString);
    
    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return {
        valid: false,
        error: `Protocol ${url.protocol} is not allowed. Only HTTP and HTTPS are permitted.`,
      };
    }
    
    // Check hostname
    if (!url.hostname) {
      return {
        valid: false,
        error: 'Invalid hostname in URL.',
      };
    }
    
    // Check for blocked hostnames
    if (isBlockedHostname(url.hostname)) {
      return {
        valid: false,
        error: 'Hostname is blocked. Scanning localhost is not permitted.',
      };
    }
    
    return {
      valid: true,
      url,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${error.message}`,
    };
  }
}

/**
 * Resolve hostname to IP and validate
 */
async function validateHostname(hostname) {
  try {
    // Resolve hostname to IP
    const { address } = await dns.lookup(hostname, { family: 4 });
    
    // Check if IP is private
    if (isPrivateIP(address)) {
      return {
        valid: false,
        error: `Hostname resolves to private IP address: ${address}. Private IP scanning is not permitted.`,
        ip: address,
      };
    }
    
    // Check if IP is reserved
    if (isReservedIP(address)) {
      return {
        valid: false,
        error: `Hostname resolves to reserved IP address: ${address}. Reserved IP scanning is not permitted.`,
        ip: address,
      };
    }
    
    return {
      valid: true,
      ip: address,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to resolve hostname: ${error.message}`,
    };
  }
}

/**
 * Validate URL for command injection attempts
 */
function validateCommandInjection(urlString) {
  // Check for common command injection patterns
  const injectionPatterns = [
    /[;&|`$()]/, // Shell metacharacters
    /\$\([^)]*\)/, // Command substitution
    /`[^`]*`/, // Backtick command substitution
    /\${[^}]*}/, // Variable expansion
    /;\s*\w+/, // Command chaining
    /\|\s*\w+/, // Pipe
    /&&\s*\w+/, // AND operator
    /\|\|\s*\w+/, // OR operator
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(urlString)) {
      return {
        valid: false,
        error: 'URL contains potentially dangerous characters that may indicate command injection.',
      };
    }
  }
  
  return {
    valid: true,
  };
}

/**
 * Comprehensive URL validation
 */
async function validateTargetUrl(urlString) {
  logger.info(`Validating target URL: ${urlString}`);
  
  // Step 1: Validate URL format
  const urlValidation = validateUrlFormat(urlString);
  if (!urlValidation.valid) {
    logger.warn(`URL format validation failed: ${urlValidation.error}`);
    return urlValidation;
  }
  
  const url = urlValidation.url;
  
  // Step 2: Check for command injection
  const injectionValidation = validateCommandInjection(urlString);
  if (!injectionValidation.valid) {
    logger.warn(`Command injection validation failed: ${injectionValidation.error}`);
    return injectionValidation;
  }
  
  // Step 3: Resolve and validate hostname
  const hostnameValidation = await validateHostname(url.hostname);
  if (!hostnameValidation.valid) {
    logger.warn(`Hostname validation failed: ${hostnameValidation.error}`);
    return hostnameValidation;
  }
  
  logger.info(`Target URL validated successfully: ${urlString} -> ${hostnameValidation.ip}`);
  
  return {
    valid: true,
    url,
    ip: hostnameValidation.ip,
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
  };
}

/**
 * Sanitize command arguments to prevent injection
 */
function sanitizeCommandArg(arg) {
  // Remove dangerous characters
  const sanitized = arg
    .replace(/[;&|`$()]/g, '')
    .replace(/\$\([^)]*\)/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\${[^}]*}/g, '');
  
  return sanitized;
}

/**
 * Validate scan options
 */
function validateScanOptions(options) {
  const maxScanTime = parseInt(process.env.MAX_SCAN_TIME) || 300; // 5 minutes default
  
  if (options.timeout && options.timeout > maxScanTime) {
    return {
      valid: false,
      error: `Scan timeout exceeds maximum allowed time of ${maxScanTime} seconds.`,
    };
  }
  
  if (options.concurrency && options.concurrency > 10) {
    return {
      valid: false,
      error: 'Scan concurrency exceeds maximum allowed value of 10.',
    };
  }
  
  return {
    valid: true,
  };
}

module.exports = {
  validateTargetUrl,
  validateUrlFormat,
  validateHostname,
  validateCommandInjection,
  sanitizeCommandArg,
  validateScanOptions,
  isPrivateIP,
  isReservedIP,
  isBlockedHostname,
  PRIVATE_IP_RANGES,
  RESERVED_IP_RANGES,
  ALLOWED_PROTOCOLS,
};
