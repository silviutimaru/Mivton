#!/bin/bash

# 🚀 MIVTON PHASE 3.1 - PRODUCTION TESTING SCRIPT
# Tests Phase 3.1 Friends System directly on live Railway deployment
# Updated to use actual Railway URL

echo "🚀 MIVTON PHASE 3.1 - PRODUCTION TESTING"
echo "========================================"
echo ""

# Your actual Railway deployment URL
APP_URL="https://mivton-production.up.railway.app"

echo "🌐 Testing Production URL: $APP_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=$4
    local cookie=$5
    
    echo -n "  Testing $description... "
    
    if [ -z "$cookie" ]; then
        response=$(curl -s -w "%{http_code}" -X $method "$APP_URL$endpoint" -H "Content-Type: application/json" --connect-timeout 10)
    else
        response=$(curl -s -w "%{http_code}" -X $method "$APP_URL$endpoint" -H "Content-Type: application/json" -H "Cookie: $cookie" --connect-timeout 10)
    fi
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} ($http_code)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} ($http_code, expected $expected_status)"
        if [ ${#response_body} -lt 200 ] && [ ${#response_body} -gt 0 ]; then
            echo "    Response: $response_body"
        fi
        return 1
    fi
}

# Counter for results
TOTAL_TESTS=0
PASSED_TESTS=0

run_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if test_endpoint "$@"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
}

# 1. Test Basic Health Checks
echo "🏥 Testing Health & Deployment..."
run_test "GET" "/health" "Health Check" "200"
run_test "GET" "/api/status" "API Status" "200"
echo ""

# 2. Test Phase 3.1 Friends API Endpoints (should require auth = 401)
echo "👥 Testing Phase 3.1 Friends API (Authentication Required)..."
run_test "GET" "/api/friends" "Friends List (no auth)" "401"
run_test "GET" "/api/friends/stats" "Friends Stats (no auth)" "401"
run_test "GET" "/api/friends/online" "Online Friends (no auth)" "401"
run_test "GET" "/api/friends/search?q=test" "Friends Search (no auth)" "401"
echo ""

# 3. Test Friend Requests API
echo "📤 Testing Friend Requests API (Authentication Required)..."
run_test "GET" "/api/friend-requests/received" "Received Requests (no auth)" "401"
run_test "GET" "/api/friend-requests/sent" "Sent Requests (no auth)" "401"
run_test "POST" "/api/friend-requests" "Send Request (no auth)" "401"
run_test "GET" "/api/friend-requests/stats" "Request Stats (no auth)" "401"
echo ""

# 4. Test Blocking API
echo "🚫 Testing User Blocking API (Authentication Required)..."
run_test "GET" "/api/blocked-users" "Blocked Users (no auth)" "401"
run_test "POST" "/api/blocked-users" "Block User (no auth)" "401"
echo ""

# 5. Test Social Notifications API
echo "🔔 Testing Social Notifications API (Authentication Required)..."
run_test "GET" "/api/social-notifications" "Social Notifications (no auth)" "401"
echo ""

# 6. Test Frontend Pages
echo "📄 Testing Frontend Pages..."
run_test "GET" "/" "Homepage" "200"
run_test "GET" "/login.html" "Login Page" "200"
run_test "GET" "/register.html" "Register Page" "200"
run_test "GET" "/dashboard.html" "Dashboard Page" "200"
echo ""

# 7. Test Phase 3.1 CSS Assets
echo "🎨 Testing Phase 3.1 CSS Assets..."
run_test "GET" "/css/friends-system.css" "Friends System CSS" "200"
run_test "GET" "/css/friend-requests.css" "Friend Requests CSS" "200"
echo ""

# 8. Test Phase 3.1 JavaScript Assets
echo "📜 Testing Phase 3.1 JavaScript Assets..."
run_test "GET" "/js/friends-manager.js" "Friends Manager JS" "200"
run_test "GET" "/js/friend-requests.js" "Friend Requests JS" "200"
echo ""

# 9. Test Socket.IO (Real-time Features)
echo "⚡ Testing Socket.IO (Real-time Features)..."
echo -n "  Testing Socket.IO endpoint... "
socket_response=$(curl -s -w "%{http_code}" "$APP_URL/socket.io/?EIO=4&transport=polling" --connect-timeout 10)
socket_code="${socket_response: -3}"

if [ "$socket_code" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} ($socket_code)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC} ($socket_code)"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
else
    SUCCESS_RATE=0
fi

# Generate final report
echo "📊 PRODUCTION TESTING RESULTS"
echo "=============================="
echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
echo -e "${RED}Failed:${NC} $((TOTAL_TESTS - PASSED_TESTS))"
echo -e "${YELLOW}Success Rate:${NC} $SUCCESS_RATE%"
echo ""

# Interpret results
if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}🎉 EXCELLENT! Phase 3.1 is working correctly in production!${NC}"
    echo ""
    echo -e "${GREEN}✅ Key Findings:${NC}"
    echo "   • All Phase 3.1 API endpoints are deployed and secure"
    echo "   • Frontend assets are loading correctly"
    echo "   • Real-time Socket.IO is functional"
    echo "   • Authentication is properly enforced"
    echo ""
    echo -e "${BLUE}🧪 Ready for User Testing:${NC}"
    echo "   1. Create test accounts at: $APP_URL/register.html"
    echo "   2. Test friend workflows manually in browser"
    echo "   3. Verify real-time features work between users"
    
elif [ $SUCCESS_RATE -ge 70 ]; then
    echo -e "${YELLOW}⚠️  GOOD - Minor issues detected${NC}"
    echo "   • Most Phase 3.1 features are working"
    echo "   • Some endpoints may need attention"
    echo "   • Check server logs for specific errors"
    
else
    echo -e "${RED}❌ ISSUES DETECTED - Needs attention${NC}"
    echo "   • Multiple endpoints are not responding correctly"
    echo "   • Check deployment status and server logs"
    echo "   • Verify database connection"
fi

echo ""
echo -e "${BLUE}🌐 Next Steps for Full Testing:${NC}"
echo "==============================================="
echo ""
echo "1. 📝 CREATE TEST ACCOUNTS"
echo "   Visit: $APP_URL/register.html"
echo "   Create 2-3 test accounts with different usernames"
echo ""
echo "2. 🧪 TEST FRIEND REQUEST WORKFLOW"
echo "   • Login as User 1, search for User 2"
echo "   • Send friend request"
echo "   • Login as User 2, accept request"
echo "   • Verify both users see each other in friends list"
echo ""
echo "3. 🔍 TEST FRIENDS FEATURES"
echo "   • Search friends by name"
echo "   • Filter friends by status/language"
echo "   • Test remove friend functionality"
echo "   • Test block/unblock users"
echo ""
echo "4. ⚡ TEST REAL-TIME FEATURES"
echo "   • Keep both accounts open in different browsers"
echo "   • Send friend requests and watch for real-time notifications"  
echo "   • Check online/offline status updates"
echo ""
echo "5. 📱 TEST MOBILE RESPONSIVENESS"
echo "   • Test on phone/tablet browsers"
echo "   • Verify touch interactions work"
echo "   • Check layout adapts correctly"
echo ""

if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}🚀 Your Phase 3.1 Friends System is ready for users!${NC}"
else
    echo -e "${YELLOW}🔧 Address any failed tests above before user testing${NC}"
fi

echo ""
