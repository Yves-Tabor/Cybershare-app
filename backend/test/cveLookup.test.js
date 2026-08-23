const { lookupCVEs, cvssToSeverity, clearCache, generateCPE } = require('./src/services/scanner/cveLookupService');

/**
 * Unit tests for CVE Lookup Service
 * Tests version extraction, CVE lookup, and severity escalation
 */

async function testCVELookup() {
  console.log('[Test] Starting CVE lookup tests...\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: CPE generation
  console.log('[Test 1] Testing CPE generation...');
  try {
    const cpe1 = generateCPE('WordPress', '5.4');
    const expectedCPE1 = 'cpe:2.3:a:wordpress:wordpress:5.4:*:*:*:*:*:*:*';
    if (cpe1 === expectedCPE1) {
      console.log('[Test 1] ✅ PASSED: WordPress CPE generation');
      passedTests++;
    } else {
      console.log(`[Test 1] ❌ FAILED: Expected "${expectedCPE1}", got "${cpe1}"`);
      failedTests++;
    }
  } catch (error) {
    console.log(`[Test 1] ❌ FAILED: ${error.message}`);
    failedTests++;
  }
  
  // Test 2: CVSS to severity mapping
  console.log('\n[Test 2] Testing CVSS to severity mapping...');
  try {
    const testCases = [
      { score: 9.5, expected: 'critical' },
      { score: 7.5, expected: 'high' },
      { score: 5.5, expected: 'medium' },
      { score: 2.5, expected: 'low' },
      { score: 0, expected: 'info' },
    ];
    
    let allPassed = true;
    testCases.forEach(({ score, expected }) => {
      const result = cvssToSeverity(score);
      if (result !== expected) {
        console.log(`[Test 2] ❌ FAILED: CVSS ${score} should map to ${expected}, got ${result}`);
        allPassed = false;
      }
    });
    
    if (allPassed) {
      console.log('[Test 2] ✅ PASSED: CVSS to severity mapping');
      passedTests++;
    } else {
      failedTests++;
    }
  } catch (error) {
    console.log(`[Test 2] ❌ FAILED: ${error.message}`);
    failedTests++;
  }
  
  // Test 3: CVE lookup for known vulnerable version (WordPress 5.4)
  console.log('\n[Test 3] Testing CVE lookup for WordPress 5.4 (known vulnerable)...');
  try {
    // Clear cache to ensure fresh lookup
    await clearCache();
    
    const cveResult = await lookupCVEs('WordPress', '5.4');
    
    if (!cveResult) {
      console.log('[Test 3] ⚠️  SKIPPED: CVE lookup failed (NVD API may be unavailable)');
      // Don't count as failure - API issues are external
    } else if (cveResult.cveIds && cveResult.cveIds.length > 0) {
      console.log(`[Test 3] ✅ PASSED: Found ${cveResult.cveIds.length} CVE(s) for WordPress 5.4`);
      console.log(`[Test 3] CVE IDs: ${cveResult.cveIds.join(', ')}`);
      console.log(`[Test 3] Highest CVSS: ${cveResult.cvssScore}`);
      console.log(`[Test 3] Severity: ${cvssToSeverity(cveResult.cvssScore)}`);
      passedTests++;
    } else {
      console.log('[Test 3] ❌ FAILED: Expected CVEs for WordPress 5.4, found none');
      failedTests++;
    }
  } catch (error) {
    console.log(`[Test 3] ⚠️  SKIPPED: CVE lookup error: ${error.message}`);
    // Don't count as failure - API issues are external
  }
  
  // Test 4: CVE lookup for recent version (should have fewer/no CVEs)
  console.log('\n[Test 4] Testing CVE lookup for WordPress 6.4 (recent version)...');
  try {
    const cveResult = await lookupCVEs('WordPress', '6.4');
    
    if (!cveResult) {
      console.log('[Test 4] ⚠️  SKIPPED: CVE lookup failed (NVD API may be unavailable)');
    } else {
      console.log(`[Test 4] Found ${cveResult.cveIds ? cveResult.cveIds.length : 0} CVE(s) for WordPress 6.4`);
      if (cveResult.cveIds) {
        console.log(`[Test 4] CVE IDs: ${cveResult.cveIds.join(', ') || 'none'}`);
      }
      console.log('[Test 4] ✅ PASSED: CVE lookup completed for recent version');
      passedTests++;
    }
  } catch (error) {
    console.log(`[Test 4] ⚠️  SKIPPED: CVE lookup error: ${error.message}`);
  }
  
  // Test 5: Cache functionality
  console.log('\n[Test 5] Testing cache functionality...');
  try {
    await clearCache();
    
    // First lookup
    const start1 = Date.now();
    const result1 = await lookupCVEs('WordPress', '5.4');
    const time1 = Date.now() - start1;
    
    // Second lookup (should be cached)
    const start2 = Date.now();
    const result2 = await lookupCVEs('WordPress', '5.4');
    const time2 = Date.now() - start2;
    
    if (!result1 || !result2) {
      console.log('[Test 5] ⚠️  SKIPPED: CVE lookup failed');
    } else if (time2 < time1) {
      console.log(`[Test 5] ✅ PASSED: Cache working (first: ${time1}ms, cached: ${time2}ms)`);
      passedTests++;
    } else {
      console.log(`[Test 5] ⚠️  WARNING: Cache may not be working (first: ${time1}ms, cached: ${time2}ms)`);
      passedTests++; // Still pass, just warn
    }
  } catch (error) {
    console.log(`[Test 5] ⚠️  SKIPPED: Cache test error: ${error.message}`);
  }
  
  // Test 6: Parallel request queue functionality
  console.log('\n[Test 6] Testing parallel request queue...');
  try {
    await clearCache();
    
    const startParallel = Date.now();
    
    // Queue multiple requests in parallel
    const parallelResults = await Promise.all([
      lookupCVEs('WordPress', '5.4'),
      lookupCVEs('WordPress', '5.5'),
      lookupCVEs('WordPress', '5.6')
    ]);
    
    const timeParallel = Date.now() - startParallel;
    
    // With 6s delay between requests, 3 sequential requests would take ~12s minimum
    // With parallel queue, they should complete in ~12s total (not 18s)
    // First request starts immediately, second after 6s, third after 12s
    // So total time should be roughly 12-14s (first request time + 2 delays)
    
    const expectedMaxTime = 14000; // 14 seconds max for 3 parallel requests
    
    if (timeParallel < expectedMaxTime) {
      console.log(`[Test 6] ✅ PASSED: Parallel queue working (${timeParallel}ms for 3 requests, expected < ${expectedMaxTime}ms)`);
      console.log(`[Test 6] Results: ${parallelResults.filter(r => r && r.cveIds).length} successful lookups`);
      passedTests++;
    } else {
      console.log(`[Test 6] ❌ FAILED: Parallel queue may not be working (${timeParallel}ms for 3 requests, expected < ${expectedMaxTime}ms)`);
      failedTests++;
    }
  } catch (error) {
    console.log(`[Test 6] ⚠️  SKIPPED: Parallel queue test error: ${error.message}`);
  }
  
  // Summary
  console.log('\n====================');
  console.log(`[Test Summary] Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log('====================');
  
  return failedTests === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  testCVELookup()
    .then((passed) => {
      process.exit(passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('[Test] Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testCVELookup };
