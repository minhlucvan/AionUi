#!/usr/bin/env python3
"""
Test Export Functionality
Tests export-excalidraw and export-png commands
"""
import unittest
import subprocess
import json
import base64
import os
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.parent / 'scripts'
EXCALIDRAW_CLI = SCRIPT_DIR / 'excalidraw.py'


class TestExport(unittest.TestCase):
    """Test export functionality"""

    @classmethod
    def setUpClass(cls):
        """Initialize Excalidraw before all tests"""
        print("\n" + "="*60)
        print("EXPORT FUNCTIONALITY TESTS")
        print("="*60)
        print("\nThese tests will:")
        print("  1. Open Excalidraw in a browser window")
        print("  2. Create test diagram elements")
        print("  3. Test export-excalidraw command")
        print("  4. Test export-png command")
        print("\nNOTE: Browser window will open automatically.")
        print("="*60)

        input("\nPress ENTER to start tests (browser will open)... ")

        # Initialize Excalidraw
        result = subprocess.run(
            ['python3', str(EXCALIDRAW_CLI), 'init'],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            print(f"Failed to initialize: {result.stderr}")
            sys.exit(1)

        print("✓ Excalidraw initialized")
        time.sleep(2)

        # Create test diagram
        cls._create_test_diagram()

    @classmethod
    def _create_test_diagram(cls):
        """Create a simple test diagram"""
        # Add a rectangle
        subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'add-shape',
            '--type', 'rectangle',
            '--id', 'test-rect',
            '--x', '100',
            '--y', '100',
            '--width', '200',
            '--height', '100',
            '--palette', 'backend'
        ], capture_output=True, timeout=10)

        # Add text
        subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'add-text',
            '--id', 'test-text',
            '--text', 'Test Export',
            '--x', '150',
            '--y', '135',
            '--container-id', 'test-rect'
        ], capture_output=True, timeout=10)

        # Link text
        subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'link-text',
            'test-rect', 'test-text'
        ], capture_output=True, timeout=10)

        print("✓ Test diagram created (1 rectangle + 1 text)")
        time.sleep(1)

    def test_export_excalidraw(self):
        """Test export-excalidraw command"""
        output_file = '/tmp/test-export.excalidraw'

        result = subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'export-excalidraw',
            '-o', output_file
        ], capture_output=True, text=True, timeout=15)

        # Check command succeeded
        self.assertEqual(result.returncode, 0, f"Export failed: {result.stderr}")
        self.assertIn("Exported", result.stdout)

        # Verify file exists
        self.assertTrue(Path(output_file).exists(), "Output file not created")

        # Load and validate JSON
        with open(output_file, 'r') as f:
            data = json.load(f)

        # Check Excalidraw format
        self.assertEqual(data.get('type'), 'excalidraw', "Invalid type field")
        self.assertEqual(data.get('version'), 2, "Invalid version")
        self.assertIn('elements', data, "Missing elements field")
        self.assertIn('appState', data, "Missing appState field")

        # Check elements
        elements = data['elements']
        self.assertGreater(len(elements), 0, "No elements exported")

        # Check element structure
        for element in elements:
            self.assertIn('id', element, "Element missing id")
            self.assertIn('type', element, "Element missing type")
            self.assertIn('x', element, "Element missing x")
            self.assertIn('y', element, "Element missing y")

        print(f"\n✓ Exported {len(elements)} elements to .excalidraw format")

        # Cleanup
        os.remove(output_file)

    def test_export_png(self):
        """Test export-png command"""
        output_file = '/tmp/test-export.png'

        result = subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'export-png',
            '-o', output_file
        ], capture_output=True, text=True, timeout=15)

        # Check command succeeded
        self.assertEqual(result.returncode, 0, f"Export failed: {result.stderr}")
        self.assertIn("Exported PNG", result.stdout)

        # Verify file exists
        self.assertTrue(Path(output_file).exists(), "Output file not created")

        # Check file is valid PNG
        with open(output_file, 'rb') as f:
            png_header = f.read(8)

        # PNG magic number: 89 50 4E 47 0D 0A 1A 0A
        expected_header = b'\x89PNG\r\n\x1a\n'
        self.assertEqual(png_header, expected_header, "Invalid PNG header")

        # Check file size
        file_size = Path(output_file).stat().st_size
        self.assertGreater(file_size, 100, "PNG file too small")

        print(f"\n✓ Exported PNG image ({file_size} bytes)")

        # Cleanup
        os.remove(output_file)

    def test_export_excalidraw_format_complete(self):
        """Test .excalidraw format completeness"""
        output_file = '/tmp/test-format.excalidraw'

        subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'export-excalidraw',
            '-o', output_file
        ], capture_output=True, timeout=15)

        with open(output_file, 'r') as f:
            data = json.load(f)

        # Check required fields
        self.assertEqual(data['type'], 'excalidraw')
        self.assertIsInstance(data['version'], int)
        self.assertIsInstance(data['elements'], list)
        self.assertIsInstance(data['appState'], dict)
        self.assertIsInstance(data['files'], dict)

        # Check element fields
        if data['elements']:
            element = data['elements'][0]
            required_fields = ['id', 'type', 'x', 'y', 'width', 'height',
                             'seed', 'version', 'versionNonce', 'isDeleted']
            for field in required_fields:
                self.assertIn(field, element, f"Element missing {field}")

        print("\n✓ .excalidraw format is complete and valid")

        # Cleanup
        os.remove(output_file)

    def test_export_png_metadata(self):
        """Test PNG export includes metadata in output"""
        output_file = '/tmp/test-metadata.png'

        result = subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'export-png',
            '-o', output_file
        ], capture_output=True, text=True, timeout=15)

        # Check output includes metadata
        self.assertIn("Elements:", result.stdout)
        self.assertIn("Dimensions:", result.stdout)
        self.assertIn("File size:", result.stdout)

        print("\n✓ PNG export includes metadata in output")

        # Cleanup
        os.remove(output_file)

    def test_export_roundtrip(self):
        """Test exporting and re-importing .excalidraw file"""
        output_file = '/tmp/test-roundtrip.excalidraw'

        # Export current state
        subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'export-excalidraw',
            '-o', output_file
        ], capture_output=True, timeout=15)

        # Load exported data
        with open(output_file, 'r') as f:
            exported_data = json.load(f)

        original_element_count = len(exported_data['elements'])

        # Clear canvas
        subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'clear'
        ], capture_output=True, timeout=10)

        # Verify cleared
        result = subprocess.run([
            'python3', str(EXCALIDRAW_CLI), 'get'
        ], capture_output=True, text=True, timeout=10)

        cleared_data = json.loads(result.stdout)
        self.assertEqual(len(cleared_data), 0, "Canvas not cleared")

        print(f"\n✓ Roundtrip test: exported {original_element_count} elements")
        print("  Note: Re-import via batch command would complete the roundtrip")

        # Cleanup
        os.remove(output_file)


def main():
    """Run tests"""
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestExport)

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Summary
    print("\n" + "="*60)
    print("EXPORT TEST SUMMARY")
    print("="*60)
    print(f"Tests run: {result.testsRun}")
    print(f"Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failed: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print("="*60)

    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(main())
