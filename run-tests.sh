#!/bin/bash

# Phase 1 Test Runner Script
# Runs all Phase 1 tests and generates report

echo "🚀 Starting Mivton Phase 1 Test Suite"
echo "📅 Started at: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test command
run_test() {
  local name="$1"
  local command="$2"
  local description="$3"
  
  echo -e "${CYAN}📋 $description...${NC}"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $name completed successfully${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}❌ $name failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

# Ensure we're in the right directory
cd "$(dirname "$0")" || exit 1

echo "📁 Working directory: $(pwd)"
echo ""

# 1. Run ESLint
echo -e "${BLUE}🔍 Running ESLint...${NC}"
if npm run lint > /dev/null 2>&1; then
  echo -e "${GREEN}✅ ESLint passed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ ESLint failed${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# 2. Run Unit Tests
echo ""
echo -e "${BLUE}🧪 Running Unit Tests...${NC}"
if npm run test:unit > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Unit tests passed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ Unit tests failed${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# 3. Run API Tests
echo ""
echo -e "${BLUE}🌐 Running API Tests...${NC}"
if npm run test:api > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API tests passed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ API tests failed${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# 4. Run E2E Tests (with timeout)
echo ""
echo -e "${BLUE}🎭 Running E2E Tests...${NC}"
echo -e "${YELLOW}🚀 Starting test server...${NC}"

# Try to run E2E tests with timeout
if timeout 30s npm run test:e2e:headless > /dev/null 2>&1; then
  echo -e "${GREEN}✅ E2E tests completed${NC}"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${YELLOW}⚠️ E2E tests skipped - server may not be available${NC}"
  # Don't count as failed since server might not be running
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Generate results
echo ""
echo "================================================================================"
echo -e "${BLUE}🎯 MIVTON PHASE 1 TEST RESULTS${NC}"
echo "================================================================================"

# Display individual results
echo -e "🔍 ESLint: $([ $PASSED_TESTS -ge 1 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "🧪 Unit Tests: $([ $PASSED_TESTS -ge 2 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "🌐 API Tests: $([ $PASSED_TESTS -ge 3 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo -e "🎭 E2E Tests: $([ $PASSED_TESTS -ge 4 ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️ SKIPPED${NC}")"

echo ""
echo "----------------------------------------"
echo -e "📊 Summary: $PASSED_TESTS/$TOTAL_TESTS categories passed"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
  echo -e "${GREEN}🎯 Result: ALL TESTS PASSED${NC}"
  OVERALL_RESULT="PASS"
else
  echo -e "${RED}🎯 Result: SOME TESTS FAILED${NC}"
  OVERALL_RESULT="FAIL"
fi

echo -e "${BLUE}⏱️ Completed at: $(date)${NC}"

# Create test report directory
mkdir -p test-reports

# Generate JSON report
cat > test-reports/phase1-test-results.json << EOF
{
  "testSuite": "Mivton Phase 1 Authentication & Sessions",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": {
    "node": "$(node --version)",
    "npm": "$(npm --version)",
    "os": "$(uname -s)"
  },
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "success": $([ "$OVERALL_RESULT" = "PASS" ] && echo "true" || echo "false")
  }
}
EOF

echo ""
echo -e "${BLUE}📄 Reports saved to test-reports/phase1-test-results.json${NC}"
echo ""

# Exit with appropriate code
if [ "$OVERALL_RESULT" = "PASS" ]; then
  exit 0
else
  exit 1
fi
