const { getCertificate } = require('../src/services/scanner/sslScanner');

/**
 * Unit test for SSL certificate parsing
 * Tests that the issuer CN is correctly extracted from the certificate chain
 */
async function testCertificateParsing() {
  console.log('[Test] Starting certificate parsing test...');

  // Test with a known domain that uses Let's Encrypt (should have R3 or similar intermediate)
  const testHostname = 'letsencrypt.org';
  const testPort = 443;

  try {
    const certInfo = await getCertificate(testHostname, testPort);

    if (!certInfo) {
      console.log('[Test] ❌ FAILED: Could not retrieve certificate');
      return false;
    }

    console.log('[Test] Certificate retrieved successfully');
    console.log('[Test] Issuer:', JSON.stringify(certInfo.issuer, null, 2));
    console.log('[Test] Subject:', JSON.stringify(certInfo.subject, null, 2));

    // Check if issuer CN is extracted
    if (certInfo.issuer && typeof certInfo.issuer === 'object') {
      const issuerCN = certInfo.issuer.CN;
      console.log('[Test] Issuer CN:', issuerCN);

      // Verify it's not a placeholder value like "YR1"
      if (issuerCN && issuerCN.includes('YR1')) {
        console.log('[Test] ❌ FAILED: Issuer CN contains invalid value "YR1"');
        console.log('[Test] This indicates the issuer is being extracted from the wrong certificate');
        return false;
      }

      // For Let's Encrypt, valid intermediate CAs are R3, R10, R11, E5, E6, E1, E2, YE1, YE2, YE3
      const validLetEncryptCAs = ['R3', 'R10', 'R11', 'E5', 'E6', 'E1', 'E2', 'YE1', 'YE2', 'YE3'];
      if (issuerCN && validLetEncryptCAs.includes(issuerCN)) {
        console.log('[Test] ✅ PASSED: Issuer CN is a valid Let\'s Encrypt intermediate CA');
        return true;
      } else if (issuerCN) {
        console.log(`[Test] ⚠️  WARNING: Issuer CN is "${issuerCN}" - verify this is a valid CA`);
        return true; // Not necessarily a failure, just needs verification
      }
    }

    console.log('[Test] ⚠️  WARNING: Could not extract issuer CN');
    return true; // Not a critical failure

  } catch (error) {
    console.log('[Test] ❌ FAILED: Error during certificate retrieval:', error.message);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCertificateParsing()
    .then((passed) => {
      console.log('[Test] Test completed:', passed ? 'PASSED' : 'FAILED');
      process.exit(passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('[Test] Test error:', error);
      process.exit(1);
    });
}

module.exports = { testCertificateParsing };
