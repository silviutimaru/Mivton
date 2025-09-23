#!/usr/bin/env node

/**
 * Test Setup Verification Script
 * Checks that all test files and configuration are properly set up
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  const color = exists ? 'green' : 'red';
  log(`${status} ${description}`, color);
  return exists;
}

function checkDirectory(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  const status = exists ? '✅' : '❌';
  const color = exists ? 'green' : 'red';
  log(`${status} ${description}`, color);
  return exists;
}

function main() {
  log('🔍 Mivton Phase 1 Test Setup Verification', 'cyan');
  log('=' .repeat(50), 'blue');

  let allGood = true;

  // Check test directories
  log('\n📁 Test Directory Structure:', 'yellow');
  allGood &= checkDirectory('tests', 'tests/ directory');
  allGood &= checkDirectory('tests/unit', 'tests/unit/ directory');
  allGood &= checkDirectory('tests/api', 'tests/api/ directory');
  allGood &= checkDirectory('tests/e2e', 'tests/e2e/ directory');
  allGood &= checkDirectory('test-reports', 'test-reports/ directory');

  // Check configuration files
  log('\n⚙️ Configuration Files:', 'yellow');
  allGood &= checkFile('package.json', 'package.json with test scripts');
  allGood &= checkFile('playwright.config.js', 'Playwright configuration');
  allGood &= checkFile('.eslintrc.js', 'ESLint configuration');
  allGood &= checkFile('.env.test', 'Test environment configuration');
  allGood &= checkFile('tests/setup.js', 'Jest setup file');

  // Check unit test files
  log('\n🧪 Unit Test Files:', 'yellow');
  allGood &= checkFile('tests/unit/password-security.test.js', 'Password security tests');
  allGood &= checkFile('tests/unit/validation-middleware.test.js', 'Validation middleware tests');
  allGood &= checkFile('tests/unit/auth-middleware.test.js', 'Auth middleware tests');
  allGood &= checkFile('tests/unit/database-connection.test.js', 'Database connection tests');
  allGood &= checkFile('tests/unit/setup-verification.test.js', 'Setup verification tests');

  // Check API test files
  log('\n🌐 API Test Files:', 'yellow');
  allGood &= checkFile('tests/api/auth-routes.test.js', 'Authentication routes tests');
  allGood &= checkFile('tests/api/session-management.test.js', 'Session management tests');

  // Check E2E test files
  log('\n🎭 E2E Test Files:', 'yellow');
  allGood &= checkFile('tests/e2e/auth-flow.spec.js', 'Authentication flow E2E tests');

  // Check database test files
  log('\n🗄️ Database Test Files:', 'yellow');
  allGood &= checkFile('database/seed_test.sql', 'Test database seed file');
  allGood &= checkFile('database/teardown_test.sql', 'Test database teardown file');

  // Check test runners
  log('\n🏃 Test Runner Scripts:', 'yellow');
  allGood &= checkFile('run-phase1-tests.js', 'Advanced test runner (Node.js)');
  allGood &= checkFile('run-tests.sh', 'Simple test runner (Bash)');

  // Check package.json test scripts
  log('\n📋 Package.json Test Scripts:', 'yellow');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
      'lint',
      'test:unit', 
      'test:api',
      'test:e2e:headless',
      'test:all'
    ];

    requiredScripts.forEach(script => {
      const exists = scripts[script] !== undefined;
      const status = exists ? '✅' : '❌';
      const color = exists ? 'green' : 'red';
      log(`${status} npm run ${script}`, color);
      allGood &= exists;
    });

    // Check Jest configuration
    const hasJestConfig = packageJson.jest !== undefined;
    const status = hasJestConfig ? '✅' : '❌';
    const color = hasJestConfig ? 'green' : 'red';
    log(`${status} Jest configuration in package.json`, color);
    allGood &= hasJestConfig;

  } catch (error) {
    log('❌ Could not read package.json', 'red');
    allGood = false;
  }

  // Check dev dependencies
  log('\n📦 Development Dependencies:', 'yellow');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const devDeps = packageJson.devDependencies || {};
    
    const requiredDeps = [
      'jest',
      'supertest',
      '@types/jest',
      'eslint',
      'playwright'
    ];

    requiredDeps.forEach(dep => {
      const exists = devDeps[dep] !== undefined;
      const status = exists ? '✅' : '❌';
      const color = exists ? 'green' : 'red';
      log(`${status} ${dep}`, color);
      allGood &= exists;
    });

  } catch (error) {
    log('❌ Could not check dev dependencies', 'red');
    allGood = false;
  }

  // Final summary
  log('\n' + '='.repeat(50), 'blue');
  if (allGood) {
    log('🎉 All test infrastructure is properly set up!', 'green');
    log('✅ Ready to run Phase 1 tests', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Ensure local PostgreSQL test database exists', 'blue');
    log('2. Run: npm run test:all', 'blue');
  } else {
    log('❌ Some test infrastructure is missing!', 'red');
    log('⚠️ Please review the missing items above', 'yellow');
  }

  log('\n📄 Report saved to: test-reports/summary_phase1.md', 'blue');
  return allGood;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = main;
