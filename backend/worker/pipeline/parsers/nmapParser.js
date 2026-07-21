const xml2js = require('xml2js');
const { scanLogger } = require('../../../src/utils/logger');

/**
 * Nmap XML Parser
 * Parses Nmap XML output into structured JSON
 */

/**
 * Parse Nmap XML output
 */
function parseNmapXml(xmlString) {
  if (!xmlString || !xmlString.trim()) {
    return null;
  }

  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
    });

    const result = parser.parseStringPromise(xmlString);
    return result.then(data => extractNmapData(data));
  } catch (error) {
    scanLogger.error('[NmapParser] Failed to parse XML:', error);
    return null;
  }
}

/**
 * Extract relevant data from parsed Nmap XML
 */
function extractNmapData(data) {
  if (!data || !data.nmaprun) {
    return null;
  }

  const nmaprun = data.nmaprun;
  const host = nmaprun.host;

  if (!host || !host.ports) {
    return {
      hostname: nmaprun.host?.hostname?.[0]?.name || null,
      ip: nmaprun.host?.address?.[0]?.addr || null,
      ports: [],
      state: 'down',
    };
  }

  const ports = [];
  const portElements = Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port];

  for (const portElement of portElements) {
    if (!portElement) continue;

    const port = {
      port: parseInt(portElement.portid),
      protocol: portElement.protocol,
      state: portElement.state?.state || 'unknown',
      service: portElement.service?.name || null,
      version: portElement.service?.version || null,
      product: portElement.service?.product || null,
      extrainfo: portElement.service?.extrainfo || null,
    };

    ports.push(port);
  }

  return {
    hostname: host.hostname?.[0]?.name || null,
    ip: host.address?.[0]?.addr || null,
    ports: ports,
    state: host.status?.state || 'unknown',
    os: host.os?.osmatch?.[0]?.name || null,
    uptime: host.uptime?.seconds || null,
  };
}

/**
 * Parse Nmap XML synchronously (fallback)
 */
function parseNmapXmlSync(xmlString) {
  if (!xmlString || !xmlString.trim()) {
    return null;
  }

  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      async: false,
    });

    const result = parser.parseString(xmlString);
    return extractNmapData(result);
  } catch (error) {
    scanLogger.error('[NmapParser] Failed to parse XML sync:', error);
    return null;
  }
}

module.exports = {
  parseNmapXml,
  parseNmapXmlSync,
};
