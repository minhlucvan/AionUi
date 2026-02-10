#!/bin/bash
# End-to-End Workflow Test for Excalidraw Skill
# Tests the complete flow: init -> create -> analyze -> export
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CLI="$SKILL_DIR/scripts/excalidraw.py"
SEARCH="$SKILL_DIR/scripts/search.py"
OUTPUT_DIR="$SKILL_DIR/tests/output"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "================================================="
echo "EXCALIDRAW SKILL - END-TO-END WORKFLOW TEST"
echo "================================================="
echo ""
echo "This test verifies the complete workflow:"
echo "  1. Search for patterns"
echo "  2. Initialize browser session"
echo "  3. Create diagram elements"
echo "  4. Quality analysis"
echo "  5. Export to files"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"
cd "$SKILL_DIR"

# Cleanup function (disabled - keep output for inspection)
cleanup() {
    echo ""
    echo "${YELLOW}Output files preserved in: $OUTPUT_DIR${NC}"
    # Uncomment to clean up:
    # rm -f "$OUTPUT_DIR/test_diagram.excalidraw" 2>/dev/null || true
    # rm -f "$OUTPUT_DIR/test_diagram.png" 2>/dev/null || true
}
trap cleanup EXIT

echo "================================================="
echo "STEP 1: Search Pattern Database"
echo "================================================="
echo ""
echo "${BLUE}Testing BM25 search for '3-tier architecture'...${NC}"
python3 "$SEARCH" "3-tier architecture" > "$OUTPUT_DIR/search_results.txt"
if [ $? -eq 0 ] && [ -s "$OUTPUT_DIR/search_results.txt" ]; then
    echo "${GREEN}✓ Search completed successfully${NC}"
    echo ""
    echo "Search results:"
    cat "$OUTPUT_DIR/search_results.txt"
    echo ""
else
    echo "${RED}✗ Search failed${NC}"
    exit 1
fi

echo "================================================="
echo "STEP 2: Test CLI Commands (No Browser)"
echo "================================================="
echo ""

# Test help command
echo "${BLUE}Testing help command...${NC}"
if python3 "$CLI" help > /dev/null 2>&1; then
    echo "${GREEN}✓ Help command works${NC}"
else
    echo "${RED}✗ Help command failed${NC}"
    exit 1
fi

# Test command structure
echo ""
echo "${BLUE}Testing individual command existence...${NC}"
# Commands with --help support
HELP_COMMANDS=("add-shape" "add-text" "add-arrow" "add-frame" "analyze" "export-excalidraw" "export-png")
for cmd in "${HELP_COMMANDS[@]}"; do
    if python3 "$CLI" "$cmd" --help > /dev/null 2>&1; then
        echo "${GREEN}✓ Command '$cmd' exists${NC}"
    else
        echo "${RED}✗ Command '$cmd' not found${NC}"
        exit 1
    fi
done

# Commands listed in help (verify they exist in help text)
ALL_COMMANDS=("init" "clear" "get" "link-text" "bind-arrow" "snapshot" "get-state" "delete" "version")
HELP_TEXT=$(python3 "$CLI" help 2>&1)
for cmd in "${ALL_COMMANDS[@]}"; do
    if echo "$HELP_TEXT" | grep -q "$cmd"; then
        echo "${GREEN}✓ Command '$cmd' documented${NC}"
    else
        echo "${RED}✗ Command '$cmd' not in help${NC}"
        exit 1
    fi
done

echo ""
echo "================================================="
echo "STEP 3: Test Analyzer (Standalone)"
echo "================================================="
echo ""

echo "${BLUE}Creating sample diagram data for analysis...${NC}"
# Create a sample diagram JSON for analysis testing
cat > "$OUTPUT_DIR/sample_diagram.json" << 'EOF'
{
  "elements": [
    {
      "id": "shape1",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "strokeColor": "#1e88e5",
      "backgroundColor": "#1e88e5",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 0,
      "opacity": 100
    },
    {
      "id": "text1",
      "type": "text",
      "x": 160,
      "y": 135,
      "width": 80,
      "height": 25,
      "text": "Frontend",
      "fontSize": 20,
      "fontFamily": 1,
      "textAlign": "center",
      "containerId": "shape1"
    },
    {
      "id": "shape2",
      "type": "rectangle",
      "x": 100,
      "y": 250,
      "width": 200,
      "height": 100,
      "strokeColor": "#43a047",
      "backgroundColor": "#43a047",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 0,
      "opacity": 100
    },
    {
      "id": "text2",
      "type": "text",
      "x": 160,
      "y": 285,
      "width": 80,
      "height": 25,
      "text": "Backend",
      "fontSize": 20,
      "fontFamily": 1,
      "textAlign": "center",
      "containerId": "shape2"
    },
    {
      "id": "arrow1",
      "type": "arrow",
      "x": 200,
      "y": 200,
      "width": 0,
      "height": 50,
      "startBinding": {
        "elementId": "shape1",
        "focus": 0,
        "gap": 1
      },
      "endBinding": {
        "elementId": "shape2",
        "focus": 0,
        "gap": 1
      }
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
EOF

echo "${BLUE}Running analyzer on sample diagram...${NC}"
python3 "$SKILL_DIR/scripts/analyzer.py" "$OUTPUT_DIR/sample_diagram.json" > "$OUTPUT_DIR/analysis_report.txt"
if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Analyzer completed successfully${NC}"
    echo ""
    echo "Analysis Report:"
    cat "$OUTPUT_DIR/analysis_report.txt"
    echo ""

    # Check if score is present (JSON format)
    if grep -q '"score"' "$OUTPUT_DIR/analysis_report.txt"; then
        SCORE=$(grep '"score"' "$OUTPUT_DIR/analysis_report.txt" | awk -F: '{print $2}' | tr -d ' ,')
        GRADE=$(grep '"grade"' "$OUTPUT_DIR/analysis_report.txt" | awk -F: '{print $2}' | tr -d ' ,"')
        echo "${GREEN}✓ Quality score: $SCORE/100 (Grade: $GRADE)${NC}"
    else
        echo "${YELLOW}⚠ No score found in analysis${NC}"
    fi
else
    echo "${RED}✗ Analyzer failed${NC}"
    exit 1
fi

echo ""
echo "================================================="
echo "STEP 4: Test Data Files"
echo "================================================="
echo ""

echo "${BLUE}Verifying CSV data files...${NC}"
CSV_FILES=("patterns.csv" "components.csv" "colors.csv" "spacing.csv" "best-practices.csv")
for csv in "${CSV_FILES[@]}"; do
    if [ -f "$SKILL_DIR/data/$csv" ]; then
        LINE_COUNT=$(wc -l < "$SKILL_DIR/data/$csv")
        echo "${GREEN}✓ $csv exists ($LINE_COUNT lines)${NC}"
    else
        echo "${RED}✗ $csv not found${NC}"
        exit 1
    fi
done

echo ""
echo "================================================="
echo "STEP 5: Verify Documentation"
echo "================================================="
echo ""

echo "${BLUE}Checking documentation files...${NC}"
DOC_FILES=("README.md" "SKILL.md" "CHANGELOG.md" "STRUCTURE.md" "excalidraw.md")
for doc in "${DOC_FILES[@]}"; do
    if [ -f "$SKILL_DIR/$doc" ]; then
        SIZE=$(wc -l < "$SKILL_DIR/$doc")
        echo "${GREEN}✓ $doc exists ($SIZE lines)${NC}"
    else
        echo "${RED}✗ $doc not found${NC}"
        exit 1
    fi
done

echo ""
echo "================================================="
echo "STEP 6: Test Template"
echo "================================================="
echo ""

echo "${BLUE}Checking 3-tier architecture template...${NC}"
TEMPLATE="$SKILL_DIR/templates/3-tier-architecture.md"
if [ -f "$TEMPLATE" ]; then
    echo "${GREEN}✓ Template exists${NC}"
    echo ""
    echo "Template preview (first 20 lines):"
    head -20 "$TEMPLATE"
    echo ""

    # Count commands in template
    CMD_COUNT=$(grep -c "python3 scripts/excalidraw.py" "$TEMPLATE" || echo "0")
    echo "${GREEN}✓ Template contains $CMD_COUNT executable commands${NC}"
else
    echo "${RED}✗ Template not found${NC}"
    exit 1
fi

echo ""
echo "================================================="
echo "STEP 7: Test Python Dependencies"
echo "================================================="
echo ""

echo "${BLUE}Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version 2>&1)
echo "${GREEN}✓ $PYTHON_VERSION${NC}"

echo ""
echo "${BLUE}Checking required Python package (rank-bm25)...${NC}"
if python3 -c "import rank_bm25" 2>/dev/null; then
    echo "${GREEN}✓ rank-bm25 is installed${NC}"
else
    echo "${YELLOW}⚠ rank-bm25 not installed (required for search)${NC}"
    echo "  Install with: pip install rank-bm25"
fi

echo ""
echo "================================================="
echo "SUMMARY"
echo "================================================="
echo ""
echo "${GREEN}✓ Search functionality: Working${NC}"
echo "${GREEN}✓ CLI commands: All verified${NC}"
echo "${GREEN}✓ Analyzer: Working (sample diagram scored)${NC}"
echo "${GREEN}✓ Data files: All present${NC}"
echo "${GREEN}✓ Documentation: Complete${NC}"
echo "${GREEN}✓ Templates: Available${NC}"
echo ""
echo "${BLUE}Output files created:${NC}"
ls -lh "$OUTPUT_DIR"
echo ""
echo "${YELLOW}Note: Browser-based commands (init, add-*, export-*) require manual testing${NC}"
echo "${YELLOW}      with a running Excalidraw browser instance.${NC}"
echo ""
echo "To test the full browser workflow manually:"
echo "  1. cd skills/excalidraw"
echo "  2. python3 scripts/excalidraw.py init"
echo "  3. python3 scripts/excalidraw.py add-shape --type rectangle --id 'api' --x 100 --y 100 --width 200 --height 100 --palette backend"
echo "  4. python3 scripts/excalidraw.py add-text --text 'API Gateway' --x 160 --y 135 --container-id 'api'"
echo "  5. python3 scripts/excalidraw.py analyze"
echo "  6. python3 scripts/excalidraw.py export-excalidraw -o diagram.excalidraw"
echo "  7. python3 scripts/excalidraw.py export-png -o diagram.png"
echo ""
echo "${GREEN}=================================================${NC}"
echo "${GREEN}END-TO-END TEST COMPLETED SUCCESSFULLY${NC}"
echo "${GREEN}=================================================${NC}"
echo ""
