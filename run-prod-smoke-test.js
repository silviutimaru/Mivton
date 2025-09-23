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
                
                this.addTest(`Page Loading: ${page}`, response.status === 200 || response.status === 302, {
                    status: response.status,
                    responseTime: response.responseTime,
                    size: response.data ? response.data.length : 0
                });
                
                if (response.status >= 400) {
                    this.addIssue('HIGH', 'PAGE_ERROR', `Page ${page} returned ${response.status}`);
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
            '/css/style.css',
            '/css/main.css',
            '/js/app.js',
            '/js/main.js'
        ];

        for (const asset of assets) {
            try {
                const response = await this.makeRequest(asset);
                
                this.addTest(`Static Asset: ${asset}`, response.status === 200, {
                    status: response.status,
                    responseTime: response.responseTime,
                    contentType: response.headers['content-type']
                });
                
                if (response.status === 404) {
                    this.addIssue('LOW', 'MISSING_ASSET', `Asset not found: ${asset}`);
                }
                
            } catch (error) {
                this.addTest(`Static Asset: ${asset}`, false, { error: error.message });
            }
        }
    }

    async testAPIEndpoints() {
        console.log('🔌 Testing API endpoints...');
        
        const endpoints = [
            { path: '/api/health', expectedStatus: 200 },
            { path: '/api/status', expectedStatus: [200, 404] },
            { path: '/api/auth/login', expectedStatus: [400, 405] }, // Should reject GET
            { path: '/api/auth/register', expectedStatus: [400, 405] }, // Should reject GET
            { path: '/api/friends', expectedStatus: [401, 403] }, // Should require auth
            { path: '/api/friend-requests', expectedStatus: [401, 403] } // Should require auth
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await this.makeRequest(endpoint.path);
                const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
                    ? endpoint.expectedStatus 
                    : [endpoint.expectedStatus];
                
                const isExpected = expectedStatuses.includes(response.status);
                
                this.addTest(`API Endpoint: ${endpoint.path}`, isExpected, {
                    status: response.status,
                    expected: endpoint.expectedStatus,
                    responseTime: response.responseTime
                });
                
                if (!isExpected) {
                    this.addIssue('MEDIUM', 'API_UNEXPECTED_STATUS', 
                        `${endpoint.path} returned ${response.status}, expected ${endpoint.expectedStatus}`);
                }
                
            } catch (error) {
                this.addTest(`API Endpoint: ${endpoint.path}`, false, { error: error.message });
                this.addIssue('MEDIUM', 'API_ERROR', `API endpoint ${endpoint.path} failed: ${error.message}`);
            }
        }
    }

    async testSecurity() {
        console.log('🔒 Testing security headers...');
        
        try {
            const response = await this.makeRequest('/');
            const headers = response.headers;
            
            // Check security headers
            const securityChecks = [
                { header: 'x-frame-options', required: false },
                { header: 'x-content-type-options', required: false },
                { header: 'x-xss-protection', required: false },
                { header: 'strict-transport-security', required: true },
                { header: 'content-security-policy', required: false }
            ];
            
            for (const check of securityChecks) {
                const hasHeader = !!headers[check.header];
                
                this.addTest(`Security Header: ${check.header}`, hasHeader || !check.required, {
                    present: hasHeader,
                    value: headers[check.header] || null,
                    required: check.required
                });
                
                if (check.required && !hasHeader) {
                    this.addIssue('MEDIUM', 'MISSING_SECURITY_HEADER', 
                        `Missing required security header: ${check.header}`);
                }
            }
            
        } catch (error) {
            this.addIssue('MEDIUM', 'SECURITY_CHECK_FAILED', error.message);
        }
    }

    async makeRequest(path, options = {}) {
        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}${path}`;
            const startTime = Date.now();
            
            const req = https.get(url, {
                timeout: 10000,
                ...options
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data,
                        responseTime: Date.now() - startTime
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
            console.log(`✅ ${name}`);
        } else {
            this.results.summary.failed++;
            console.log(`❌ ${name}:`, details);
        }
    }

    addIssue(severity, category, message, details = {}) {
        this.results.issues.push({
            severity,
            category,
            message,
            details,
            timestamp: new Date().toISOString()
        });
        
        const icon = severity === 'CRITICAL' ? '🚨' : severity === 'HIGH' ? '⚠️' : '📝';
        console.log(`${icon} ${severity}: ${message}`);
    }

    async generateReport() {
        console.log('📄 Generating smoke test report...');
        
        const reportContent = this.createReportContent();
        
        // Write to file
        const fs = require('fs');
        const path = require('path');
        
        const reportsDir = '/Users/silviutimaru/Desktop/mivton/test-reports';
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(reportsDir, 'prod_smoke.md'),
            reportContent
        );
        
        console.log('✅ Report saved to test-reports/prod_smoke.md');
    }

    createReportContent() {
        const { summary, tests, issues } = this.results;
        const successRate = Math.round((summary.passed / summary.total) * 100);
        
        return `# Production Smoke Test Report

## Summary
- **Target**: ${this.baseUrl}
- **Timestamp**: ${this.results.timestamp}
- **Total Tests**: ${summary.total}
- **Passed**: ${summary.passed}
- **Failed**: ${summary.failed}
- **Success Rate**: ${successRate}%

## Test Results

${tests.map(test => `
### ${test.passed ? '✅' : '❌'} ${test.name}
- **Status**: ${test.passed ? 'PASSED' : 'FAILED'}
- **Timestamp**: ${test.timestamp}
- **Details**: ${JSON.stringify(test.details, null, 2)}
`).join('')}

## Issues Found

${issues.length > 0 ? issues.map(issue => `
### ${issue.severity}: ${issue.category}
- **Message**: ${issue.message}
- **Timestamp**: ${issue.timestamp}
- **Details**: ${JSON.stringify(issue.details, null, 2)}
`).join('') : 'No issues found during smoke testing.'}

## Recommendations

${this.generateRecommendations()}

## Repro Steps for Issues

${issues.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').map(issue => `
### ${issue.category}
1. Navigate to ${this.baseUrl}
2. ${issue.message}
3. Expected: Normal operation
4. Actual: ${issue.category}
`).join('')}

---
Generated by Production Smoke Test on ${new Date().toISOString()}
`;
    }

    generateRecommendations() {
        const { issues, summary } = this.results;
        const recommendations = [];
        
        if (summary.failed > 0) {
            recommendations.push('- Investigate and fix failed tests before deployment');
        }
        
        const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
        if (criticalIssues.length > 0) {
            recommendations.push('- Address critical issues immediately - site may be down');
        }
        
        const securityIssues = issues.filter(i => i.category.includes('SECURITY'));
        if (securityIssues.length > 0) {
            recommendations.push('- Review and implement missing security headers');
        }
        
        const apiIssues = issues.filter(i => i.category.includes('API'));
        if (apiIssues.length > 0) {
            recommendations.push('- Check API endpoint configurations and error handling');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('- No critical issues found - site appears healthy');
            recommendations.push('- Consider implementing automated monitoring');
            recommendations.push('- Regular smoke tests recommended');
        }
        
        return recommendations.join('\n');
    }
}

// Run smoke test
if (require.main === module) {
    const smokeTest = new ProductionSmokeTest();
    smokeTest.runSmokeTests().catch(console.error);
}

module.exports = { ProductionSmokeTest };
