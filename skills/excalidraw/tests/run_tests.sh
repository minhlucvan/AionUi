#!/bin/bash
# Comprehensive test runner for excalidraw-diagram skill
# Runs all test suites and generates summary

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================="
echo "EXCALIDRAW-DIAGRAM COMPREHENSIVE TEST SUITE"
echo "======================================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

# Run search tests
echo "Running search.py tests..."
echo "-----------------------------------------------------------------------"
if python3 test_search.py; then
    SEARCH_RESULT="PASSED"
    SEARCH_COLOR=$GREEN
else
    SEARCH_RESULT="FAILED"
    SEARCH_COLOR=$RED
fi
echo ""

# Run analyzer tests
echo "Running analyzer.py tests..."
echo "-----------------------------------------------------------------------"
if python3 test_analyzer.py; then
    ANALYZER_RESULT="PASSED"
    ANALYZER_COLOR=$GREEN
else
    ANALYZER_RESULT="FAILED"
    ANALYZER_COLOR=$RED
fi
echo ""

# Print final summary
echo "======================================================================="
echo "FINAL TEST SUMMARY"
echo "======================================================================="
echo ""
printf "search.py tests:    ${SEARCH_COLOR}${SEARCH_RESULT}${NC}\n"
printf "analyzer.py tests:  ${ANALYZER_COLOR}${ANALYZER_RESULT}${NC}\n"
echo ""

# Exit with error if any tests failed
if [ "$SEARCH_RESULT" = "FAILED" ] || [ "$ANALYZER_RESULT" = "FAILED" ]; then
    echo -e "${RED}Some tests failed. Please review output above.${NC}"
    exit 1
else
    echo -e "${GREEN}All test suites passed!${NC}"
    exit 0
fi
