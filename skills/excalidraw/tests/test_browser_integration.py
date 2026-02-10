#!/usr/bin/env python3
"""
Browser Integration Tests for excalidraw.py
Tests REAL browser interaction via agent-browser and Excalidraw
"""
import sys
import json
import time
import subprocess
from pathlib import Path

# Test configuration
SCRIPT_DIR = Path(__file__).parent.parent / 'scripts'
EXCALIDRAW_CLI = SCRIPT_DIR / 'excalidraw.py'
TEST_TIMEOUT = 30  # seconds


class BrowserTestRunner:
    """Run browser integration tests"""

    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.test_results = []

    def run_command(self, *args, timeout=TEST_TIMEOUT):
        """Run excalidraw CLI command"""
        cmd = ['python3', str(EXCALIDRAW_CLI)] + list(args)
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return {
                'returncode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'success': result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {
                'returncode': -1,
                'stdout': '',
                'stderr': f'Command timed out after {timeout}s',
                'success': False
            }
        except Exception as e:
            return {
                'returncode': -1,
                'stdout': '',
                'stderr': str(e),
                'success': False
            }

    def test(self, name, func):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n{'='*70}")
        print(f"Test {self.tests_run}: {name}")
        print('='*70)

        try:
            func()
            self.tests_passed += 1
            self.test_results.append({'name': name, 'status': 'PASSED'})
            print(f"✅ PASSED: {name}")
            return True
        except AssertionError as e:
            self.tests_failed += 1
            self.test_results.append({'name': name, 'status': 'FAILED', 'error': str(e)})
            print(f"❌ FAILED: {name}")
            print(f"   Error: {e}")
            return False
        except Exception as e:
            self.tests_failed += 1
            self.test_results.append({'name': name, 'status': 'ERROR', 'error': str(e)})
            print(f"❌ ERROR: {name}")
            print(f"   Exception: {e}")
            return False

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*70)
        print("BROWSER INTEGRATION TEST SUMMARY")
        print("="*70)
        print(f"Tests run:    {self.tests_run}")
        print(f"Passed:       {self.tests_passed}")
        print(f"Failed:       {self.tests_failed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print("="*70)

        if self.tests_failed > 0:
            print("\nFailed tests:")
            for result in self.test_results:
                if result['status'] != 'PASSED':
                    print(f"  - {result['name']}: {result.get('error', 'Unknown error')}")

        return self.tests_failed == 0


# Test suite
runner = BrowserTestRunner()


def test_cli_version():
    """Test: CLI version command works"""
    result = runner.run_command('--version')
    assert result['success'], "Version command should succeed"
    assert 'excalidraw CLI' in result['stdout'] or 'version' in result['stdout'].lower(), \
        "Should output version information"
    print(f"✓ Version output: {result['stdout'].strip()}")


def test_cli_help():
    """Test: CLI help command works"""
    result = runner.run_command('help')
    assert result['success'], "Help command should succeed"
    assert 'COMMANDS' in result['stdout'] or 'USAGE' in result['stdout'], \
        "Should output help text"
    assert 'init' in result['stdout'], "Should mention init command"
    assert 'add-shape' in result['stdout'], "Should mention add-shape command"
    print(f"✓ Help output contains expected commands")


def test_browser_init():
    """Test: Initialize Excalidraw in browser"""
    print("Initializing Excalidraw (this will open browser)...")
    result = runner.run_command('init', timeout=60)

    assert result['success'], f"Init should succeed: {result['stderr']}"
    print(f"✓ Browser initialized successfully")
    print(f"  Output: {result['stdout'].strip()}")

    # Wait for initialization
    time.sleep(3)


def test_add_shape():
    """Test: Add a shape element"""
    print("Adding rectangle shape...")
    result = runner.run_command(
        'add-shape',
        '--id', 'test-rect',
        '--type', 'rectangle',
        '--x', '100',
        '--y', '100',
        '--width', '200',
        '--height', '100',
        '--palette', 'backend'
    )

    assert result['success'], f"Add shape should succeed: {result['stderr']}"
    print(f"✓ Shape added successfully")


def test_add_text():
    """Test: Add a text element"""
    print("Adding text element...")
    result = runner.run_command(
        'add-text',
        '--id', 'test-text',
        '--text', 'Test Label',
        '--x', '150',
        '--y', '130',
        '--size', '18'
    )

    assert result['success'], f"Add text should succeed: {result['stderr']}"
    print(f"✓ Text added successfully")


def test_link_text():
    """Test: Link text to shape"""
    print("Linking text to shape...")
    result = runner.run_command(
        'link-text',
        'test-rect',
        'test-text'
    )

    assert result['success'], f"Link text should succeed: {result['stderr']}"
    print(f"✓ Text linked to shape successfully")


def test_add_arrow():
    """Test: Add arrow element"""
    print("Adding arrow...")
    result = runner.run_command(
        'add-arrow',
        '--id', 'test-arrow',
        '--x', '300',
        '--y', '150',
        '--points', '[[0,0],[100,0]]'
    )

    assert result['success'], f"Add arrow should succeed: {result['stderr']}"
    print(f"✓ Arrow added successfully")


def test_get_elements():
    """Test: Get scene elements"""
    print("Getting scene elements...")
    result = runner.run_command('get')

    assert result['success'], f"Get should succeed: {result['stderr']}"

    # Try to parse as JSON
    try:
        elements = json.loads(result['stdout'])
        assert isinstance(elements, list), "Should return array of elements"
        assert len(elements) >= 3, f"Should have at least 3 elements (shape, text, arrow), got {len(elements)}"

        # Check element types
        element_types = [e.get('type') for e in elements]
        assert 'rectangle' in element_types, "Should have rectangle element"
        assert 'text' in element_types, "Should have text element"
        assert 'arrow' in element_types, "Should have arrow element"

        print(f"✓ Retrieved {len(elements)} elements")
        print(f"  Element types: {set(element_types)}")

    except json.JSONDecodeError as e:
        raise AssertionError(f"Failed to parse JSON output: {e}")


def test_get_state():
    """Test: Get scene metadata (visual feedback)"""
    print("Getting scene metadata...")
    result = runner.run_command('get-state')

    assert result['success'], f"Get-state should succeed: {result['stderr']}"
    assert 'Total elements' in result['stdout'] or 'elements' in result['stdout'], \
        "Should output metadata information"

    print(f"✓ Scene metadata retrieved")
    print(f"  Output preview: {result['stdout'][:200]}...")


def test_analyze():
    """Test: Analyze diagram quality"""
    print("Analyzing diagram quality...")
    result = runner.run_command('analyze')

    assert result['success'], f"Analyze should succeed: {result['stderr']}"
    assert 'Score' in result['stdout'] or 'score' in result['stdout'], \
        "Should output quality score"
    assert 'Grade' in result['stdout'] or 'grade' in result['stdout'], \
        "Should output letter grade"

    # Extract score (rough parsing)
    output_lines = result['stdout'].split('\n')
    for line in output_lines:
        if 'Score' in line or 'score' in line:
            print(f"✓ Quality score line: {line.strip()}")
            break


def test_snapshot():
    """Test: Capture snapshot"""
    print("Capturing snapshot...")
    result = runner.run_command('snapshot')

    assert result['success'], f"Snapshot should succeed: {result['stderr']}"
    assert 'Snapshot captured' in result['stdout'] or 'Elements' in result['stdout'], \
        "Should output snapshot information"

    print(f"✓ Snapshot captured")
    print(f"  Output preview: {result['stdout'][:200]}...")


def test_add_frame():
    """Test: Add frame element"""
    print("Adding frame...")
    result = runner.run_command(
        'add-frame',
        '--id', 'test-frame',
        '--name', 'Test Frame',
        '--x', '50',
        '--y', '50',
        '--width', '400',
        '--height', '300'
    )

    assert result['success'], f"Add frame should succeed: {result['stderr']}"
    print(f"✓ Frame added successfully")


def test_clear_canvas():
    """Test: Clear canvas"""
    print("Clearing canvas...")
    result = runner.run_command('clear')

    assert result['success'], f"Clear should succeed: {result['stderr']}"
    print(f"✓ Canvas cleared")

    # Verify canvas is empty
    time.sleep(1)
    result = runner.run_command('get')
    if result['success']:
        try:
            elements = json.loads(result['stdout'])
            assert len(elements) == 0, f"Canvas should be empty, but has {len(elements)} elements"
            print(f"✓ Verified canvas is empty")
        except json.JSONDecodeError:
            print(f"⚠ Could not verify empty canvas (JSON parse failed)")


def test_complex_workflow():
    """Test: Complete diagram creation workflow"""
    print("Testing complete workflow: Create 3-shape diagram with connections...")

    # Clear canvas first
    runner.run_command('clear')
    time.sleep(1)

    # Create shape 1
    result1 = runner.run_command(
        'add-shape', '--id', 'shape1', '--type', 'rectangle',
        '--x', '100', '--y', '100', '--width', '150', '--height', '80',
        '--palette', 'frontend'
    )
    assert result1['success'], "Shape 1 creation failed"

    # Create shape 2
    result2 = runner.run_command(
        'add-shape', '--id', 'shape2', '--type', 'rectangle',
        '--x', '100', '--y', '250', '--width', '150', '--height', '80',
        '--palette', 'backend'
    )
    assert result2['success'], "Shape 2 creation failed"

    # Create shape 3
    result3 = runner.run_command(
        'add-shape', '--id', 'shape3', '--type', 'rectangle',
        '--x', '100', '--y', '400', '--width', '150', '--height', '80',
        '--palette', 'database'
    )
    assert result3['success'], "Shape 3 creation failed"

    # Add texts
    runner.run_command('add-text', '--id', 'text1', '--text', 'Frontend', '--x', '140', '--y', '130', '--container-id', 'shape1')
    runner.run_command('add-text', '--id', 'text2', '--text', 'Backend', '--x', '140', '--y', '280', '--container-id', 'shape2')
    runner.run_command('add-text', '--id', 'text3', '--text', 'Database', '--x', '140', '--y', '430', '--container-id', 'shape3')

    # Link texts
    runner.run_command('link-text', 'shape1', 'text1')
    runner.run_command('link-text', 'shape2', 'text2')
    runner.run_command('link-text', 'shape3', 'text3')

    # Add arrows
    result_arrow1 = runner.run_command(
        'add-arrow', '--id', 'arrow1', '--x', '175', '--y', '180',
        '--points', '[[0,0],[0,70]]'
    )
    assert result_arrow1['success'], "Arrow 1 creation failed"

    result_arrow2 = runner.run_command(
        'add-arrow', '--id', 'arrow2', '--x', '175', '--y', '330',
        '--points', '[[0,0],[0,70]]'
    )
    assert result_arrow2['success'], "Arrow 2 creation failed"

    # Bind arrows
    runner.run_command('bind-arrow', 'arrow1', 'shape1', 'shape2')
    runner.run_command('bind-arrow', 'arrow2', 'shape2', 'shape3')

    # Verify final state
    result_get = runner.run_command('get')
    assert result_get['success'], "Failed to get final elements"

    elements = json.loads(result_get['stdout'])
    assert len(elements) >= 8, f"Should have at least 8 elements, got {len(elements)}"

    # Analyze quality
    result_analyze = runner.run_command('analyze')
    assert result_analyze['success'], "Analysis failed"
    assert 'Score' in result_analyze['stdout'], "Should output quality score"

    print(f"✓ Complete workflow executed successfully")
    print(f"  Created {len(elements)} elements")
    print(f"  Analysis output: {result_analyze['stdout'][:150]}...")


def main():
    """Run all browser integration tests"""
    print("="*70)
    print("EXCALIDRAW BROWSER INTEGRATION TESTS")
    print("="*70)
    print("\nThese tests will:")
    print("  1. Open Excalidraw in a browser window")
    print("  2. Test actual CLI commands via agent-browser")
    print("  3. Verify visual feedback features work")
    print("\nNOTE: Browser window will open automatically.")
    print("="*70)

    input("\nPress ENTER to start tests (browser will open)... ")

    # Run tests in order
    runner.test("CLI Version", test_cli_version)
    runner.test("CLI Help", test_cli_help)
    runner.test("Browser Initialization", test_browser_init)
    runner.test("Add Shape", test_add_shape)
    runner.test("Add Text", test_add_text)
    runner.test("Link Text to Shape", test_link_text)
    runner.test("Add Arrow", test_add_arrow)
    runner.test("Get Elements", test_get_elements)
    runner.test("Get State (Metadata)", test_get_state)
    runner.test("Analyze Quality", test_analyze)
    runner.test("Capture Snapshot", test_snapshot)
    runner.test("Add Frame", test_add_frame)
    runner.test("Clear Canvas", test_clear_canvas)
    runner.test("Complex Workflow", test_complex_workflow)

    # Print summary
    success = runner.print_summary()

    print("\n" + "="*70)
    if success:
        print("✅ All browser integration tests PASSED!")
    else:
        print("❌ Some browser integration tests FAILED")
    print("="*70)

    return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
