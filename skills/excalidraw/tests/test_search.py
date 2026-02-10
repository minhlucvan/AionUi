#!/usr/bin/env python3
"""
Comprehensive tests for search.py
Tests BM25 search functionality, auto-domain detection, and CSV data queries
"""
import sys
import unittest
from pathlib import Path
from io import StringIO

# Add scripts directory to path
SCRIPT_DIR = Path(__file__).parent.parent / 'scripts'
sys.path.insert(0, str(SCRIPT_DIR))

from search import search_domain, auto_detect_domain, CSV_CONFIG


class TestSearchFunctionality(unittest.TestCase):
    """Test search.py core functionality"""

    def test_search_domain_pattern(self):
        """Test searching pattern domain"""
        results = search_domain("3-tier architecture", "pattern", max_results=3)

        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0, "Should return at least one result")
        self.assertLessEqual(len(results), 3, "Should respect max_results limit")

        # Check first result has expected fields
        first = results[0]
        self.assertIn('name', first)
        self.assertIn('type', first)
        self.assertIn('description', first)

    def test_search_domain_component(self):
        """Test searching component domain"""
        results = search_domain("API gateway", "component", max_results=3)

        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0, "Should find API gateway component")

        first = results[0]
        self.assertIn('name', first)
        self.assertIn('color_palette', first)
        self.assertIn('width', first)
        self.assertIn('height', first)

    def test_search_domain_color(self):
        """Test searching color domain"""
        results = search_domain("frontend blue", "color", max_results=3)

        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0, "Should find frontend color")

        first = results[0]
        self.assertIn('palette', first)
        self.assertIn('bg_color', first)
        self.assertIn('stroke_color', first)

    def test_search_domain_spacing(self):
        """Test searching spacing domain"""
        results = search_domain("horizontal", "spacing", max_results=3)

        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0, "Should find spacing rules")

        first = results[0]
        self.assertIn('context', first)
        self.assertIn('recommended_px', first)

    def test_search_domain_rule(self):
        """Test searching rule domain"""
        results = search_domain("spacing", "rule", max_results=3)

        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0, "Should find best practice rules")

        first = results[0]
        self.assertIn('rule', first)
        self.assertIn('reason', first)

    def test_max_results_limit(self):
        """Test that max_results is respected"""
        results_1 = search_domain("architecture", "pattern", max_results=1)
        results_3 = search_domain("architecture", "pattern", max_results=3)
        results_5 = search_domain("architecture", "pattern", max_results=5)

        self.assertEqual(len(results_1), 1)
        self.assertLessEqual(len(results_3), 3)
        self.assertLessEqual(len(results_5), 5)
        self.assertGreater(len(results_5), len(results_1))

    def test_auto_detect_domain_pattern(self):
        """Test auto-detection of pattern domain"""
        self.assertEqual(auto_detect_domain("3-tier architecture"), "pattern")
        self.assertEqual(auto_detect_domain("microservices diagram"), "pattern")
        self.assertEqual(auto_detect_domain("flowchart pattern"), "pattern")

    def test_auto_detect_domain_component(self):
        """Test auto-detection of component domain"""
        self.assertEqual(auto_detect_domain("API gateway component"), "component")
        self.assertEqual(auto_detect_domain("database service"), "component")
        self.assertEqual(auto_detect_domain("cache component"), "component")

    def test_auto_detect_domain_color(self):
        """Test auto-detection of color domain"""
        self.assertEqual(auto_detect_domain("frontend color"), "color")
        self.assertEqual(auto_detect_domain("semantic palette"), "color")

    def test_auto_detect_domain_rule(self):
        """Test auto-detection of rule domain"""
        self.assertEqual(auto_detect_domain("spacing rule"), "rule")
        self.assertEqual(auto_detect_domain("best practice"), "rule")
        self.assertEqual(auto_detect_domain("design guideline"), "rule")

    def test_auto_detect_default(self):
        """Test auto-detection defaults to pattern"""
        self.assertEqual(auto_detect_domain("some random query"), "pattern")

    def test_case_insensitive_search(self):
        """Test that search is case-insensitive"""
        results_lower = search_domain("api gateway", "component", max_results=1)
        results_upper = search_domain("API GATEWAY", "component", max_results=1)
        results_mixed = search_domain("Api GateWay", "component", max_results=1)

        self.assertGreater(len(results_lower), 0)
        self.assertGreater(len(results_upper), 0)
        self.assertGreater(len(results_mixed), 0)

    def test_partial_match_search(self):
        """Test that partial matches work"""
        results = search_domain("micro", "pattern", max_results=3)

        # Should find microservices pattern
        self.assertGreater(len(results), 0)
        found_microservices = any('microservices' in r.get('name', '').lower() for r in results)
        self.assertTrue(found_microservices, "Should find microservices with partial match 'micro'")

    def test_csv_config_completeness(self):
        """Test that CSV_CONFIG has all required domains"""
        required_domains = ["pattern", "component", "color", "spacing", "rule"]

        for domain in required_domains:
            self.assertIn(domain, CSV_CONFIG, f"CSV_CONFIG should have {domain} domain")

            config = CSV_CONFIG[domain]
            self.assertIn('file', config)
            self.assertIn('search_cols', config)
            self.assertIn('output_cols', config)

            # Check that file exists
            file_path = Path(__file__).parent.parent / "data" / config["file"]
            self.assertTrue(file_path.exists(), f"CSV file {config['file']} should exist")

    def test_bm25_relevance_ranking(self):
        """Test that BM25 ranks relevant results higher"""
        results = search_domain("3-tier layered architecture", "pattern", max_results=3)

        # First result should be most relevant
        self.assertGreater(len(results), 0)
        first_result = results[0]

        # Should contain "tier" in name or description
        first_text = (first_result.get('name', '') + ' ' + first_result.get('description', '')).lower()
        self.assertTrue('tier' in first_text or '3-tier' in first_text or 'layered' in first_text,
                       "Most relevant result should match query terms")

    def test_empty_query(self):
        """Test handling of empty query"""
        results = search_domain("", "pattern", max_results=3)

        # Should still return results (all items with equal score)
        self.assertIsInstance(results, list)

    def test_nonexistent_domain(self):
        """Test handling of nonexistent domain"""
        with self.assertRaises(Exception):
            search_domain("test", "nonexistent_domain")

    def test_output_columns_exist(self):
        """Test that output columns actually exist in CSV data"""
        for domain, config in CSV_CONFIG.items():
            results = search_domain("test", domain, max_results=1)

            if len(results) > 0:
                result = results[0]
                for col in config['output_cols']:
                    self.assertIn(col, result,
                                f"Output column '{col}' should exist in {domain} results")


class TestSearchDataQuality(unittest.TestCase):
    """Test the quality and completeness of CSV data"""

    def test_patterns_data_completeness(self):
        """Test that patterns.csv has complete data"""
        results = search_domain("architecture", "pattern", max_results=10)

        self.assertGreater(len(results), 3, "Should have multiple architecture patterns")

        for result in results:
            self.assertTrue(result.get('name'), "Pattern should have name")
            self.assertTrue(result.get('type'), "Pattern should have type")
            self.assertTrue(result.get('description'), "Pattern should have description")
            self.assertTrue(result.get('layout_pattern'), "Pattern should have layout_pattern")

    def test_components_data_completeness(self):
        """Test that components.csv has complete data"""
        results = search_domain("service", "component", max_results=10)

        self.assertGreater(len(results), 3, "Should have multiple service components")

        for result in results:
            self.assertTrue(result.get('name'), "Component should have name")
            self.assertTrue(result.get('color_palette'), "Component should have color_palette")
            self.assertTrue(result.get('width'), "Component should have width")
            self.assertTrue(result.get('height'), "Component should have height")

    def test_colors_data_completeness(self):
        """Test that colors.csv has complete data"""
        results = search_domain("frontend", "color", max_results=10)

        self.assertGreater(len(results), 0, "Should have color definitions")

        for result in results:
            self.assertTrue(result.get('palette'), "Color should have palette name")
            self.assertTrue(result.get('bg_color'), "Color should have bg_color")
            self.assertTrue(result.get('stroke_color'), "Color should have stroke_color")

            # Check color format
            bg = result.get('bg_color', '')
            stroke = result.get('stroke_color', '')
            self.assertTrue(bg.startswith('#'), f"bg_color should be hex: {bg}")
            self.assertTrue(stroke.startswith('#'), f"stroke_color should be hex: {stroke}")

    def test_spacing_data_completeness(self):
        """Test that spacing.csv has complete data"""
        results = search_domain("component", "spacing", max_results=10)

        self.assertGreater(len(results), 0, "Should have spacing rules")

        for result in results:
            self.assertTrue(result.get('context'), "Spacing should have context")
            recommended = result.get('recommended_px', '')
            self.assertTrue(recommended, "Spacing should have recommended_px")

    def test_rules_data_completeness(self):
        """Test that best-practices.csv has complete data"""
        results = search_domain("spacing", "rule", max_results=10)

        self.assertGreater(len(results), 0, "Should have best practice rules")

        for result in results:
            self.assertTrue(result.get('rule'), "Rule should have rule text")
            self.assertTrue(result.get('reason'), "Rule should have reason")


class TestSearchIntegration(unittest.TestCase):
    """Integration tests for search workflow"""

    def test_workflow_architecture_pattern(self):
        """Test complete workflow: find pattern → find components → find colors"""
        # Step 1: Find architecture pattern
        patterns = search_domain("3-tier architecture", "pattern", max_results=1)
        self.assertGreater(len(patterns), 0, "Should find 3-tier pattern")

        pattern = patterns[0]
        self.assertIn('layout_pattern', pattern)
        self.assertIn('spacing', pattern)

        # Step 2: Find components based on pattern
        components = search_domain("frontend", "component", max_results=3)
        self.assertGreater(len(components), 0, "Should find frontend components")

        # Step 3: Find colors for components
        colors = search_domain("frontend", "color", max_results=1)
        self.assertGreater(len(colors), 0, "Should find frontend colors")

        color = colors[0]
        self.assertIn('bg_color', color)
        self.assertIn('stroke_color', color)

    def test_workflow_microservices_pattern(self):
        """Test workflow for microservices pattern"""
        # Find microservices pattern
        patterns = search_domain("microservices", "pattern", max_results=1)
        self.assertGreater(len(patterns), 0, "Should find microservices pattern")

        pattern = patterns[0]
        self.assertIn('layout_pattern', pattern)

        # Find backend components (typical for microservices)
        components = search_domain("service", "component", max_results=5)
        self.assertGreater(len(components), 0, "Should find service components")

        # Find backend colors
        colors = search_domain("backend", "color", max_results=1)
        self.assertGreater(len(colors), 0, "Should find backend colors")

    def test_cross_domain_consistency(self):
        """Test that data is consistent across domains"""
        # Get frontend color palette name
        colors = search_domain("frontend", "color", max_results=1)
        self.assertGreater(len(colors), 0)
        palette_name = colors[0].get('palette')

        # Find components that use this palette
        components = search_domain("frontend", "component", max_results=5)
        self.assertGreater(len(components), 0)

        # At least one component should reference the palette
        has_matching_palette = any(
            c.get('color_palette') == palette_name for c in components
        )
        self.assertTrue(has_matching_palette,
                       f"Components should reference color palette '{palette_name}'")


def run_tests():
    """Run all tests and return results"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestSearchFunctionality))
    suite.addTests(loader.loadTestsFromTestCase(TestSearchDataQuality))
    suite.addTests(loader.loadTestsFromTestCase(TestSearchIntegration))

    # Run tests with verbose output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print("="*70)

    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
