// Phase 2 Test Execution Script
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Phase 2 Dashboard/UI Tests');
console.log('====================================');

// Set working directory and environment
process.chdir('/Users/silviutimaru/Desktop/mivton');
process.env.NODE_ENV = 'test';

// Track test results
const results = {
  api: { success: false, output: '', error: '' },
  e2e: { success: false, output: '', error: '' },
  summary: {}
};

// Create test-reports directory if it doesn't exist
if (!fs.existsSync('test-reports')) {
  fs.mkdirSync('test-reports');
}

if (!fs.existsSync('test-reports/assets')) {
  fs.mkdirSync('test-reports/assets');
}

async function runApiTests() {
  console.log('\n📊 Running API Tests...');
  console.log('----------------------');
  
  try {
    const output = execSync('npm run test:api', { 
      encoding: 'utf8',
      timeout: 60000,
      stdio: 'pipe'
    });
    
    results.api.success = true;
    results.api.output = output;
    console.log('✅ API tests completed successfully');
    console.log(output);
    
  } catch (error) {
    results.api.success = false;
    results.api.error = error.message;
    results.api.output = error.stdout || '';
    console.log('❌ API tests failed');
    console.log('STDOUT:', error.stdout);
    console.log('STDERR:', error.stderr);
    console.log('Error:', error.message);
  }
}

async function runE2ETests() {
  console.log('\n🎭 Running E2E Tests...');
  console.log('------------------------');
  
  try {
    const output = execSync('npm run test:e2e:headless', { 
      encoding: 'utf8',
      timeout: 120000,
      stdio: 'pipe'
    });
    
    results.e2e.success = true;
    results.e2e.output = output;
    console.log('✅ E2E tests completed successfully');
    console.log(output);
    
  } catch (error) {
    results.e2e.success = false;
    results.e2e.error = error.message;
    results.e2e.output = error.stdout || '';
    console.log('❌ E2E tests failed');
    console.log('STDOUT:', error.stdout);
    console.log('STDERR:', error.stderr);
    console.log('Error:', error.message);
  }
}

function generateSummaryReport() {
  console.log('\n📋 Generating Summary Report...');
  console.log('-------------------------------');
  
  const timestamp = new Date().toISOString();
  const apiTestsPass = results.api.success;
  const e2eTestsPass = results.e2e.success;
  
  // Parse test results to count passes/failures
  let apiStats = { passed: 0, failed: 0, total: 0 };
  let e2eStats = { passed: 0, failed: 0, total: 0 };
  
  // Try to parse Jest output for API tests
  if (results.api.output) {
    const apiOutput = results.api.output;
    const testMatch = apiOutput.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testMatch) {
      apiStats.passed = parseInt(testMatch[1]);
      apiStats.total = parseInt(testMatch[2]);
      apiStats.failed = apiStats.total - apiStats.passed;
    }
  }
  
  // Try to parse Playwright output for E2E tests
  if (results.e2e.output) {
    const e2eOutput = results.e2e.output;
    const testMatch = e2eOutput.match(/(\d+)\s+passed/);
    const totalMatch = e2eOutput.match(/(\d+)\s+tests? ran/);
    if (testMatch) {
      e2eStats.passed = parseInt(testMatch[1]);
    }
    if (totalMatch) {
      e2eStats.total = parseInt(totalMatch[1]);
      e2eStats.failed = e2eStats.total - e2eStats.passed;
    }
  }
  
  const report = `# Phase 2 Testing Summary

**Date:** ${timestamp}
**Phase:** Dashboard/UI Testing
**Environment:** Test

## Overview

Phase 2 focused on testing dashboard navigation, UI components, profile management, and language persistence functionality.

## Test Results

### API Tests
- **Status:** ${apiTestsPass ? '✅ PASSED' : '❌ FAILED'}
- **Tests Passed:** ${apiStats.passed}
- **Tests Failed:** ${apiStats.failed}
- **Total Tests:** ${apiStats.total}

### E2E Tests  
- **Status:** ${e2eTestsPass ? '✅ PASSED' : '❌ FAILED'}
- **Tests Passed:** ${e2eStats.passed}
- **Tests Failed:** ${e2eStats.failed}
- **Total Tests:** ${e2eStats.total}

## Test Coverage Areas

### ✅ E2E Tests Covered:
- Landing page loading with assets
- Dashboard access and authentication flow
- Sidebar navigation functionality
- Profile panel and language selector
- Responsive design (390-420px viewports)
- UI component interactions
- Language persistence (localStorage/sessionStorage)

### ✅ API Tests Covered:
- Dashboard data endpoints (/api/dashboard/stats)
- User profile API (/api/user-profile)
- Language preferences API
- User search functionality
- Authorization and security
- Error handling and validation

## Issues Found and Fixed

${results.api.success ? '### API Layer\n- All API endpoints responding correctly\n- Authorization working as expected\n- Data validation functioning properly\n' : '### API Layer Issues\n' + results.api.error + '\n'}

${results.e2e.success ? '### UI/Frontend\n- Dashboard navigation working correctly\n- Profile management functional\n- Language selector responsive\n- Mobile viewports rendering properly\n' : '### UI/Frontend Issues\n' + results.e2e.error + '\n'}

## Files Changed

### Test Files Created:
- \`tests/e2e/dashboard-navigation.spec.js\` - Main dashboard E2E tests
- \`tests/e2e/profile-panel.spec.js\` - Profile and language persistence tests  
- \`tests/api/dashboard-endpoints.test.js\` - API integration tests

### Routes Verified:
- \`routes/dashboard.js\` - Dashboard API endpoints
- \`routes/user-profile.js\` - User profile management
- \`routes/user-preferences.js\` - Language and preference handling

## Screenshots

${fs.existsSync('test-reports/playwright-report') ? '- Playwright test report with screenshots available in test-reports/playwright-report/' : '- No screenshots captured (tests may not have run or failed before screenshot capture)'}

## Next Steps

1. **Address any failing tests** identified in this run
2. **Implement missing API endpoints** if 404 errors found
3. **Enhance language persistence** if localStorage tests failed
4. **Improve responsive design** if mobile viewport tests failed
5. **Add additional test coverage** for edge cases

## Command Reference

To run these tests again:
\`\`\`bash
# API tests only
npm run test:api

# E2E tests only  
npm run test:e2e:headless

# All tests
npm run test:all
\`\`\`

---
*Generated by Phase 2 test automation on ${timestamp}*
`;

  // Write summary to file
  fs.writeFileSync('test-reports/summary_phase2.md', report);
  console.log('✅ Summary report generated: test-reports/summary_phase2.md');
  
  return report;
}

async function main() {
  try {
    // Run both test suites
    await runApiTests();
    await runE2ETests();
    
    // Generate summary
    const report = generateSummaryReport();
    
    console.log('\n🎯 Phase 2 Testing Complete!');
    console.log('============================');
    console.log('Results summary:');
    console.log(`- API Tests: ${results.api.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`- E2E Tests: ${results.e2e.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('\nSee test-reports/summary_phase2.md for detailed results');
    
    // Return appropriate exit code
    const overallSuccess = results.api.success && results.e2e.success;
    process.exit(overallSuccess ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
main();
