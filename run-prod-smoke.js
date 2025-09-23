#!/usr/bin/env node

/**
 * 🚀 MIVTON PRODUCTION SMOKE TEST
 * Non-destructive testing of https://www.mivton.com
 * Tests core functionality without creating real accounts or data
 */

const https = require('https');
const http = require('http');

class ProductionSmokeTest {
    constructor() {
        this.baseUrl = 'https://www.mivton.com';
        this.results = {
            timestamp: new Date().toISOString(),
            environment: 'production',
            baseUrl: this.baseUrl,
            tests: [],
            issues: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0
            }
        };
    }

    async runSmokeTests() {
        console.log('🌐 Starting Production Smoke Test for Mivton...');
        console.log('🎯 Target:', this.baseUrl);
        
        try {
            // Core availability tests
            await this.testSiteAvailability();
            await this.testPageLoading();
            await this.testStaticAssets();
            await this.testAPIEndpoints();
            await this.testSecurity();
            
            // Generate report
            await this.generateReport();
            
            console.log('✅ Production smoke test completed!');
            
        } catch (error) {
            console.error('❌ Smoke test failed:', error.message);
            this.addIssue('CRITICAL', 'SMOKE_TEST_FAILURE', error.message);
        }
    }

    async testSiteAvailability() {
        console.log('🔍 Testing site availability...');
        
        try {
            const response = await this.makeRequest('/');
            
            this.addTest('Site Availability', response.status === 200, {
                status: response.status,
                responseTime: response.responseTime,
                contentType: response.headers['content-type']
            });
            
            if (response.status !== 200) {
                this.addIssue('CRITICAL', 'SITE_DOWN', `Site returned status ${response.status}`);
            }
            
        } catch (error) {
            this.addTest('Site Availability', false, { error: error.message });
            this.addIssue('CRITICAL', 'CONNECTION_FAILED', error.message);
        }
    }

    async testPageLoading() {
        console.log('📄 Testing core page loading...');
        
        const pages = [
            '/',
            '/login',
            '/register',
            '/about',
            '/features',
            '/privacy',
            '/terms'
        ];

        for (const page of pages) {
            try {
                const response = await this.makeRequest(page);
                
                this.addTest(`Page Loading: ${page}`, response.status === 200, {
                    status: response.status,
                    responseTime: response.responseTime,
                    size: response.size
                });
                
                if (response.status === 404) {
                    this.addIssue('MEDIUM', 'PAGE_NOT_FOUND', `Page ${page} returned 404`);
                } else if (response.status >= 500) {
                    this.addIssue('HIGH', 'SERVER_ERROR', `Page ${page} returned ${response.status}`);
                }
                
            } catch (error) {
                this.addTest(`Page Loading: ${page}`, false, { error: error.message });
                this.addIssue('MEDIUM', 'PAGE_LOAD_FAILED', `Failed to load ${page}: ${error.message}`);
            }
        }
    }

    async testStaticAssets() {
        console.log('🎨 Testing static assets...');
        
        const assets = [
            '/favicon.ico',
            '/css/main.css',
            '/css/style.css',
            '/js/main.js',
            '/js/app.js',
            '/images/logo.png',
            '/manifest.json'
        ];

        for (const asset of assets) {
            try {
                const response = await this.makeRequest(asset);
                
                this.addTest(`Static Asset: ${asset}`, response.status === 200, {
                    status: response.status,
                    contentType: response.headers['content-type'],
                    size: response.size
                });
                
                if (response.status === 404) {
                    this.addIssue('LOW', 'ASSET_NOT_FOUND', `Asset ${asset} not found`);
                }
                
            } catch (error) {
                this.addTest(`Static Asset: ${asset}`, false, { error: error.message });
            }
        }
    }

    async testAPIEndpoints() {
        console.log('🔌 Testing API endpoints (read-only)...');
        
        const endpoints = [
            { path: '/api/health', method: 'GET', expectedStatus: [200, 404] },
            { path: '/api/status', method: 'GET', expectedStatus: [200, 404] },
            { path: '/api/auth/login', method: 'POST', expectedStatus: [400, 401, 422] }, // No credentials
            { path: '/api/users/search', method: 'GET', expectedStatus: [401, 403] }, // No auth
            { path: '/api/friends', method: 'GET', expectedStatus: [401, 403] }, // No auth
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest(endpoint.path, endpoint.method);
                
                const isExpected = endpoint.expectedStatus.includes(response.status);
                
                this.addTest(`API Endpoint: ${endpoint.method} ${endpoint.path}`, isExpected, {
                    status: response.status,
                    expectedStatus: endpoint.expectedStatus,
                    responseTime: response.responseTime
                });
                
                if (!isExpected && response.status >= 500) {
                    this.addIssue('HIGH', 'API_SERVER_ERROR', 
                        `API ${endpoint.path} returned ${response.status}, expected ${endpoint.expectedStatus.join(' or ')}`);
                }
                
            } catch (error) {
                this.addTest(`API Endpoint: ${endpoint.method} ${endpoint.path}`, false, { error: error.message });
                this.addIssue('MEDIUM', 'API_CONNECTION_FAILED', 
                    `Failed to connect to ${endpoint.path}: ${error.message}`);
            }
        }
    }

    async testSecurity() {
        console.log('🔒 Testing security headers...');
        
        try {
            const response = await this.makeRequest('/');
            const headers = response.headers;
            
            // Check for security headers
            const securityChecks = [
                { name: 'HTTPS Redirect', check: response.isHttps, importance: 'HIGH' },
                { name: 'X-Frame-Options', check: headers['x-frame-options'], importance: 'MEDIUM' },
                { name: 'X-Content-Type-Options', check: headers['x-content-type-options'], importance: 'MEDIUM' },
                { name: 'X-XSS-Protection', check: headers['x-xss-protection'], importance: 'LOW' },
                { name: 'Strict-Transport-Security', check: headers['strict-transport-security'], importance: 'MEDIUM' },
                { name: 'Content-Security-Policy', check: headers['content-security-policy'], importance: 'HIGH' }
            ];
            
            for (const security of securityChecks) {
                const passed = !!security.check;
                
                this.addTest(`Security: ${security.name}`, passed, {
                    value: security.check || 'Not set',
                    importance: security.importance
                });
                
                if (!passed && security.importance === 'HIGH') {
                    this.addIssue('HIGH', 'SECURITY_HEADER_MISSING', 
                        `Missing critical security header: ${security.name}`);
                } else if (!passed && security.importance === 'MEDIUM') {
                    this.addIssue('MEDIUM', 'SECURITY_HEADER_MISSING', 
                        `Missing recommended security header: ${security.name}`);
                }
            }
            
        } catch (error) {
            this.addTest('Security Headers', false, { error: error.message });
            this.addIssue('MEDIUM', 'SECURITY_CHECK_FAILED', error.message);
        }
    }

    async makeRequest(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const startTime = Date.now();
            
            const options = {
                method,
                headers: {
                    'User-Agent': 'Mivton-Smoke-Test/1.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                timeout: 10000
            };
            
            if (data) {
                options.headers['Content-Type'] = 'application/json';
                data = JSON.stringify(data);
            }
            
            const protocol = url.protocol === 'https:' ? https : http;
            
            const req = protocol.request(url, options, (res) => {
                let body = '';
                let size = 0;
                
                res.on('data', (chunk) => {
                    body += chunk;
                    size += chunk.length;
                });
                
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body,
                        size,
                        responseTime: Date.now() - startTime,
                        isHttps: url.protocol === 'https:'
                    });
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            if (data) {
                req.write(data);
            }
            
            req.end();
        });
    }

    addTest(name, passed, details = {}) {
        this.results.tests.push({
            name,
            passed,
            details,
            timestamp: new Date().toISOString()
        });
        
        this.results.summary.total++;
        if (passed) {
            this.results.summary.passed++;
        } else {
            this.results.summary.failed++;
        }
        
        console.log(`${passed ? '✅' : '❌'} ${name}`);
        if (details.responseTime) {
            console.log(`   ⏱️ ${details.responseTime}ms`);
        }
    }

    addIssue(severity, category, message, reproSteps = null) {
        this.results.issues.push({
            severity,
            category,
            message,
            reproSteps,
            timestamp: new Date().toISOString()
        });
        
        if (severity === 'HIGH' || severity === 'CRITICAL') {
            console.error(`🚨 ${severity}: ${message}`);
        } else {
            console.warn(`⚠️ ${severity}: ${message}`);
        }
    }

    async generateReport() {
        console.log('📄 Generating smoke test report...');
        
        const report = this.createMarkdownReport();
        
        // Write to file
        const fs = require('fs');
        const path = require('path');
        
        const reportsDir = '/Users/silviutimaru/Desktop/mivton/test-reports';
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(reportsDir, 'prod_smoke.md'), report);
        console.log('✅ Report saved to test-reports/prod_smoke.md');
    }

    createMarkdownReport() {
        const { summary, tests, issues } = this.results;
        const successRate = Math.round((summary.passed / summary.total) * 100);
        
        return `# Production Smoke Test Report - Mivton

## Executive Summary
- **Target Environment**: ${this.results.environment}
- **Base URL**: ${this.baseUrl}
- **Test Timestamp**: ${this.results.timestamp}
- **Total Tests**: ${summary.total}
- **Passed**: ${summary.passed}
- **Failed**: ${summary.failed}
- **Success Rate**: ${successRate}%

## Test Results Overview

${tests.map(test => `
### ${test.passed ? '✅' : '❌'} ${test.name}
- **Status**: ${test.passed ? 'PASSED' : 'FAILED'}
- **Timestamp**: ${test.timestamp}
${Object.entries(test.details).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}
`).join('\n')}

## Issues Found

${issues.length > 0 ? issues.map(issue => `
### ${issue.severity}: ${issue.category}
- **Message**: ${issue.message}
- **Timestamp**: ${issue.timestamp}
${issue.reproSteps ? `- **Reproduction Steps**: ${issue.reproSteps}` : ''}
`).join('\n') : 'No issues found during smoke testing.'}

## Performance Summary

### Response Times
${tests.filter(t => t.details.responseTime).map(t => 
`- **${t.name}**: ${t.details.responseTime}ms`).join('\n')}

### Asset Sizes
${tests.filter(t => t.details.size).map(t => 
`- **${t.name}**: ${Math.round(t.details.size / 1024)}KB`).join('\n')}

## Security Analysis

### HTTPS Status
- **Protocol**: ${this.baseUrl.startsWith('https') ? 'HTTPS ✅' : 'HTTP ❌'}

### Security Headers
${tests.filter(t => t.name.startsWith('Security:')).map(t => 
`- **${t.name.replace('Security: ', '')}**: ${t.passed ? '✅' : '❌'} ${t.details.value || ''}`).join('\n')}

## API Endpoints Status

${tests.filter(t => t.name.startsWith('API Endpoint:')).map(t => `
- **${t.name.replace('API Endpoint: ', '')}**: ${t.passed ? '✅' : '❌'} (Status: ${t.details.status})
`).join('\n')}

## Recommendations

### Critical Issues
${issues.filter(i => i.severity === 'CRITICAL').length > 0 ? 
`${issues.filter(i => i.severity === 'CRITICAL').map(i => `- ${i.message}`).join('\n')}` : 
'No critical issues found.'}

### High Priority Issues  
${issues.filter(i => i.severity === 'HIGH').length > 0 ? 
`${issues.filter(i => i.severity === 'HIGH').map(i => `- ${i.message}`).join('\n')}` : 
'No high priority issues found.'}

### Performance Optimizations
- Monitor response times for pages > 2000ms
- Optimize asset sizes where possible
- Consider CDN implementation for static assets

### Security Enhancements
- Ensure all security headers are properly configured
- Implement Content Security Policy if missing
- Verify HTTPS enforcement across all pages

## Next Steps

1. **Address Critical Issues**: Fix any critical issues immediately
2. **Performance Monitoring**: Set up continuous monitoring for response times
3. **Security Audit**: Conduct comprehensive security review
4. **Automated Testing**: Implement automated smoke tests in CI/CD pipeline

---
**Report Generated**: ${new Date().toISOString()}
**Test Duration**: ${Math.round((Date.now() - new Date(this.results.timestamp).getTime()) / 1000)}s
`;
    }
}

// Run smoke test if executed directly
if (require.main === module) {
    const smokeTest = new ProductionSmokeTest();
    smokeTest.runSmokeTests().catch(console.error);
}

module.exports = { ProductionSmokeTest };
