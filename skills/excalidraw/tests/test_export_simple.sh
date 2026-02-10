#!/bin/bash
# Simple export test (no browser interaction needed)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
CLI="$SKILL_DIR/scripts/excalidraw.py"

echo "================================================="
echo "EXPORT FUNCTIONALITY - SIMPLE TEST"
echo "================================================="
echo ""
echo "This test verifies export command syntax works."
echo "Note: Browser interaction tests require manual run."
echo ""

# Test 1: Check export-excalidraw help
echo "1. Testing export-excalidraw command syntax..."
python3 "$CLI" export-excalidraw --help > /dev/null 2>&1 && echo "   ✓ export-excalidraw command exists" || echo "   ✗ export-excalidraw command not found"

# Test 2: Check export-png help
echo "2. Testing export-png command syntax..."
python3 "$CLI" export-png --help > /dev/null 2>&1 && echo "   ✓ export-png command exists" || echo "   ✗ export-png command not found"

# Test 3: Check help includes export commands
echo "3. Testing help documentation..."
if python3 "$CLI" help | grep -q "export-excalidraw"; then
    echo "   ✓ export-excalidraw documented in help"
else
    echo "   ✗ export-excalidraw not in help"
fi

if python3 "$CLI" help | grep -q "export-png"; then
    echo "   ✓ export-png documented in help"
else
    echo "   ✗ export-png not in help"
fi

# Test 4: Verify control-script has export functions
echo "4. Testing control-script functions..."
if grep -q "exportExcalidraw" "$SKILL_DIR/scripts/control-script.js"; then
    echo "   ✓ exportExcalidraw function exists"
else
    echo "   ✗ exportExcalidraw function missing"
fi

if grep -q "exportPNG" "$SKILL_DIR/scripts/control-script.js"; then
    echo "   ✓ exportPNG function exists"
else
    echo "   ✗ exportPNG function missing"
fi

echo ""
echo "================================================="
echo "BASIC TESTS COMPLETE"
echo "================================================="
echo ""
echo "To test actual export with browser:"
echo "  1. python3 excalidraw.py init"
echo "  2. Create some elements"
echo "  3. python3 excalidraw.py export-excalidraw -o test.excalidraw"
echo "  4. python3 excalidraw.py export-png -o test.png"
echo ""
