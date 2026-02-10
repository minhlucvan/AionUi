#!/usr/bin/env python3
"""
Comprehensive tests for analyzer.py
Tests quality analysis, scoring, issue detection, and suggestions
"""
import sys
import unittest
from pathlib import Path

# Add scripts directory to path
SCRIPT_DIR = Path(__file__).parent.parent / 'scripts'
sys.path.insert(0, str(SCRIPT_DIR))

from analyzer import VisualAnalyzer


class TestVisualAnalyzerBasics(unittest.TestCase):
    """Test basic analyzer functionality"""

    def setUp(self):
        """Create analyzer instance for each test"""
        self.analyzer = VisualAnalyzer()

    def test_analyzer_initialization(self):
        """Test analyzer initializes correctly"""
        self.assertIsNotNone(self.analyzer)
        self.assertEqual(self.analyzer.score, 100)
        self.assertEqual(len(self.analyzer.issues), 0)
        self.assertEqual(len(self.analyzer.warnings), 0)

    def test_empty_diagram(self):
        """Test analyzing empty diagram"""
        metadata = {'elements': []}
        result = self.analyzer.analyze(metadata)

        self.assertEqual(result['score'], 0)
        self.assertEqual(result['grade'], 'F')
        self.assertIn('Empty diagram', result['issues'])

    def test_simple_valid_diagram(self):
        """Test analyzing simple valid diagram"""
        metadata = {
            'elements': [
                {
                    'id': 'rect1',
                    'type': 'rectangle',
                    'x': 100,
                    'y': 100,
                    'width': 200,
                    'height': 100,
                    'fontSize': 18
                },
                {
                    'id': 'text1',
                    'type': 'text',
                    'x': 150,
                    'y': 130,
                    'width': 100,
                    'height': 40,
                    'fontSize': 18
                }
            ]
        }

        result = self.analyzer.analyze(metadata)

        self.assertGreater(result['score'], 70, "Simple valid diagram should score > 70")
        self.assertEqual(result['element_count'], 2)


class TestTextReadability(unittest.TestCase):
    """Test text readability checks"""

    def setUp(self):
        self.analyzer = VisualAnalyzer()

    def test_small_text_detection(self):
        """Test detection of small text (< 12px)"""
        metadata = {
            'elements': [
                {'id': 'text1', 'type': 'text', 'fontSize': 8, 'x': 100, 'y': 100, 'width': 100, 'height': 20},
                {'id': 'text2', 'type': 'text', 'fontSize': 10, 'x': 200, 'y': 100, 'width': 100, 'height': 20}
            ]
        }

        result = self.analyzer.analyze(metadata)

        # Should detect small text issue
        has_small_text_issue = any('Small text' in issue for issue in result['issues'])
        self.assertTrue(has_small_text_issue, "Should detect small text")
        self.assertLess(result['score'], 100, "Score should be penalized for small text")

    def test_readable_text_no_issue(self):
        """Test that readable text (>= 12px) passes"""
        metadata = {
            'elements': [
                {'id': 'text1', 'type': 'text', 'fontSize': 14, 'x': 100, 'y': 100, 'width': 100, 'height': 20},
                {'id': 'text2', 'type': 'text', 'fontSize': 18, 'x': 200, 'y': 100, 'width': 100, 'height': 20}
            ]
        }

        result = self.analyzer.analyze(metadata)

        has_small_text_issue = any('Small text' in issue for issue in result['issues'])
        self.assertFalse(has_small_text_issue, "Should not detect small text issue")

    def test_default_font_size(self):
        """Test handling of missing fontSize (defaults to 20)"""
        metadata = {
            'elements': [
                {'id': 'text1', 'type': 'text', 'x': 100, 'y': 100, 'width': 100, 'height': 20}
            ]
        }

        result = self.analyzer.analyze(metadata)

        has_small_text_issue = any('Small text' in issue for issue in result['issues'])
        self.assertFalse(has_small_text_issue, "Default font size (20) should pass")


class TestOverlapDetection(unittest.TestCase):
    """Test element overlap detection"""

    def setUp(self):
        self.analyzer = VisualAnalyzer()

    def test_overlapping_elements(self):
        """Test detection of overlapping elements"""
        metadata = {
            'elements': [
                {'id': 'rect1', 'type': 'rectangle', 'x': 100, 'y': 100, 'width': 200, 'height': 100},
                {'id': 'rect2', 'type': 'rectangle', 'x': 150, 'y': 120, 'width': 200, 'height': 100}
            ]
        }

        result = self.analyzer.analyze(metadata)

        has_overlap_issue = any('Overlapping' in issue for issue in result['issues'])
        self.assertTrue(has_overlap_issue, "Should detect overlapping elements")

    def test_non_overlapping_elements(self):
        """Test that non-overlapping elements pass"""
        metadata = {
            'elements': [
                {'id': 'rect1', 'type': 'rectangle', 'x': 100, 'y': 100, 'width': 200, 'height': 100},
                {'id': 'rect2', 'type': 'rectangle', 'x': 350, 'y': 100, 'width': 200, 'height': 100}
            ]
        }

        result = self.analyzer.analyze(metadata)

        has_overlap_issue = any('Overlapping' in issue for issue in result['issues'])
        self.assertFalse(has_overlap_issue, "Should not detect overlaps when elements are separated")

    def test_adjacent_elements(self):
        """Test that adjacent (touching) elements don't trigger overlap"""
        metadata = {
            'elements': [
                {'id': 'rect1', 'type': 'rectangle', 'x': 100, 'y': 100, 'width': 200, 'height': 100},
                {'id': 'rect2', 'type': 'rectangle', 'x': 300, 'y': 100, 'width': 200, 'height': 100}
            ]
        }

        result = self.analyzer.analyze(metadata)

        has_overlap_issue = any('Overlapping' in issue for issue in result['issues'])
        self.assertFalse(has_overlap_issue, "Adjacent elements should not be considered overlapping")


class TestArrowConnections(unittest.TestCase):
    """Test arrow connection checks"""

    def setUp(self):
        self.analyzer = VisualAnalyzer()

    def test_disconnected_arrows(self):
        """Test detection of disconnected arrows"""
        metadata = {
            'elements': [
                {'id': 'arrow1', 'type': 'arrow', 'x': 100, 'y': 100},
                {'id': 'arrow2', 'type': 'arrow', 'x': 200, 'y': 200, 'startBinding': {'elementId': 'rect1'}}
            ]
        }

        result = self.analyzer.analyze(metadata)

        has_arrow_issue = any('Disconnected arrows' in issue for issue in result['issues'])
        self.assertTrue(has_arrow_issue, "Should detect disconnected arrows")

    def test_connected_arrows(self):
        """Test that properly connected arrows pass"""
        metadata = {
            'elements': [
                {
                    'id': 'arrow1',
                    'type': 'arrow',
                    'x': 100,
                    'y': 100,
                    'startBinding': {'elementId': 'rect1'},
                    'endBinding': {'elementId': 'rect2'}
                }
            ]
        }

        result = self.analyzer.analyze(metadata)

        has_arrow_issue = any('Disconnected arrows' in issue for issue in result['issues'])
        self.assertFalse(has_arrow_issue, "Properly connected arrows should not trigger issue")

    def test_no_arrows(self):
        """Test diagram without arrows"""
        metadata = {
            'elements': [
                {'id': 'rect1', 'type': 'rectangle', 'x': 100, 'y': 100, 'width': 200, 'height': 100}
            ]
        }

        result = self.analyzer.analyze(metadata)

        has_arrow_issue = any('Disconnected arrows' in issue for issue in result['issues'])
        self.assertFalse(has_arrow_issue, "Diagram without arrows should not have arrow issues")


class TestScoringSystem(unittest.TestCase):
    """Test quality scoring and grading"""

    def setUp(self):
        self.analyzer = VisualAnalyzer()

    def test_grade_calculation(self):
        """Test grade letter calculation from scores"""
        self.assertEqual(self.analyzer._calculate_grade(95), 'A')
        self.assertEqual(self.analyzer._calculate_grade(90), 'A')
        self.assertEqual(self.analyzer._calculate_grade(85), 'B')
        self.assertEqual(self.analyzer._calculate_grade(75), 'C')
        self.assertEqual(self.analyzer._calculate_grade(65), 'D')
        self.assertEqual(self.analyzer._calculate_grade(55), 'F')

    def test_quality_level_calculation(self):
        """Test quality level descriptions"""
        self.assertEqual(self.analyzer._quality_level(95), 'Excellent')
        self.assertEqual(self.analyzer._quality_level(85), 'Good')
        self.assertEqual(self.analyzer._quality_level(75), 'Fair')
        self.assertEqual(self.analyzer._quality_level(65), 'Poor')
        self.assertEqual(self.analyzer._quality_level(55), 'Needs Improvement')

    def test_score_penalty_issues(self):
        """Test that issues penalize score by 10 points"""
        metadata = {
            'elements': [
                # Overlapping elements (1 issue = -10 points)
                {'id': 'rect1', 'type': 'rectangle', 'x': 100, 'y': 100, 'width': 200, 'height': 100},
                {'id': 'rect2', 'type': 'rectangle', 'x': 150, 'y': 120, 'width': 200, 'height': 100}
            ]
        }

        result = self.analyzer.analyze(metadata)

        self.assertLessEqual(result['score'], 90, "Issues should penalize score by 10 points")

    def test_score_penalty_warnings(self):
        """Test that warnings penalize score by 5 points"""
        metadata = {
            'elements': [
                # All same size (visual hierarchy warning = -5 points)
                {'id': 'rect1', 'type': 'rectangle', 'x': 100, 'y': 100, 'width': 200, 'height': 100},
                {'id': 'rect2', 'type': 'rectangle', 'x': 350, 'y': 100, 'width': 200, 'height': 100}
            ]
        }

        result = self.analyzer.analyze(metadata)

        # May have warnings about visual hierarchy
        if len(result['warnings']) > 0:
            self.assertLess(result['score'], 100, "Warnings should penalize score")

    def test_score_minimum_zero(self):
        """Test that score never goes below 0"""
        metadata = {
            'elements': [
                # Multiple issues
                {'id': 'text1', 'type': 'text', 'fontSize': 8, 'x': 100, 'y': 100, 'width': 100, 'height': 20},
                {'id': 'rect1', 'type': 'rectangle', 'x': 100, 'y': 100, 'width': 200, 'height': 100},
                {'id': 'rect2', 'type': 'rectangle', 'x': 150, 'y': 120, 'width': 200, 'height': 100},
                {'id': 'arrow1', 'type': 'arrow', 'x': 100, 'y': 100}
            ]
        }

        result = self.analyzer.analyze(metadata)

        self.assertGreaterEqual(result['score'], 0, "Score should never be negative")


class TestSuggestionGeneration(unittest.TestCase):
    """Test suggestion generation"""

    def setUp(self):
        self.analyzer = VisualAnalyzer()

    def test_suggestions_for_issues(self):
        """Test that suggestions are generated for detected issues"""
        metadata = {
            'elements': [
                {'id': 'text1', 'type': 'text', 'fontSize': 8, 'x': 100, 'y': 100, 'width': 100, 'height': 20},
                {'id': 'arrow1', 'type': 'arrow', 'x': 100, 'y': 100}
            ]
        }

        result = self.analyzer.analyze(metadata)

        self.assertGreater(len(result['suggestions']), 0, "Should provide suggestions")

        # Check for specific suggestions
        suggestions_text = ' '.join(result['suggestions']).lower()
        self.assertIn('font', suggestions_text, "Should suggest fixing font size")

    def test_no_issues_suggestion(self):
        """Test suggestion when no issues are detected"""
        metadata = {
            'elements': [
                {'id': 'rect1', 'type': 'rectangle', 'x': 100, 'y': 100, 'width': 200, 'height': 100},
                {'id': 'text1', 'type': 'text', 'fontSize': 18, 'x': 150, 'y': 130, 'width': 100, 'height': 40}
            ]
        }

        result = self.analyzer.analyze(metadata)

        if len(result['issues']) == 0 and len(result['warnings']) == 0:
            suggestions_text = ' '.join(result['suggestions']).lower()
            self.assertTrue('good' in suggestions_text or 'no major issues' in suggestions_text,
                          "Should confirm diagram looks good when no issues")


class TestComplexScenarios(unittest.TestCase):
    """Test complex real-world scenarios"""

    def setUp(self):
        self.analyzer = VisualAnalyzer()

    def test_3tier_architecture_quality(self):
        """Test quality analysis of 3-tier architecture diagram"""
        metadata = {
            'elements': [
                # Presentation layer
                {'id': 'web', 'type': 'rectangle', 'x': 120, 'y': 110, 'width': 180, 'height': 100},
                {'id': 'mobile', 'type': 'rectangle', 'x': 380, 'y': 110, 'width': 180, 'height': 100},

                # Business layer (150px spacing)
                {'id': 'api', 'type': 'rectangle', 'x': 120, 'y': 440, 'width': 180, 'height': 100},
                {'id': 'auth', 'type': 'rectangle', 'x': 380, 'y': 440, 'width': 180, 'height': 100},

                # Data layer (150px spacing)
                {'id': 'db', 'type': 'rectangle', 'x': 180, 'y': 770, 'width': 180, 'height': 100},

                # Text labels (readable)
                {'id': 'text1', 'type': 'text', 'fontSize': 18, 'x': 160, 'y': 140, 'width': 100, 'height': 40},
                {'id': 'text2', 'type': 'text', 'fontSize': 18, 'x': 420, 'y': 140, 'width': 100, 'height': 40},
                {'id': 'text3', 'type': 'text', 'fontSize': 18, 'x': 160, 'y': 470, 'width': 100, 'height': 40},

                # Connected arrows
                {
                    'id': 'arrow1',
                    'type': 'arrow',
                    'x': 210,
                    'y': 210,
                    'startBinding': {'elementId': 'web'},
                    'endBinding': {'elementId': 'api'}
                },
                {
                    'id': 'arrow2',
                    'type': 'arrow',
                    'x': 210,
                    'y': 540,
                    'startBinding': {'elementId': 'api'},
                    'endBinding': {'elementId': 'db'}
                }
            ]
        }

        result = self.analyzer.analyze(metadata)

        # Should score well (85+)
        self.assertGreaterEqual(result['score'], 80,
                               "Well-structured 3-tier architecture should score 80+")
        self.assertIn(result['grade'], ['A', 'B'],
                     "Should get A or B grade")
        self.assertEqual(result['element_count'], 10)

    def test_poor_quality_diagram(self):
        """Test detection of multiple quality issues"""
        metadata = {
            'elements': [
                # Overlapping rectangles
                {'id': 'rect1', 'type': 'rectangle', 'x': 100, 'y': 100, 'width': 200, 'height': 100},
                {'id': 'rect2', 'type': 'rectangle', 'x': 120, 'y': 110, 'width': 200, 'height': 100},

                # Small text
                {'id': 'text1', 'type': 'text', 'fontSize': 8, 'x': 150, 'y': 130, 'width': 100, 'height': 20},

                # Disconnected arrow
                {'id': 'arrow1', 'type': 'arrow', 'x': 100, 'y': 100}
            ]
        }

        result = self.analyzer.analyze(metadata)

        # Should have multiple issues
        self.assertGreater(len(result['issues']), 1, "Should detect multiple issues")

        # Should score poorly
        self.assertLess(result['score'], 75, "Poor quality diagram should score < 75")

        # Should have suggestions
        self.assertGreater(len(result['suggestions']), 1, "Should provide multiple suggestions")


class TestHelperMethods(unittest.TestCase):
    """Test analyzer helper methods"""

    def setUp(self):
        self.analyzer = VisualAnalyzer()

    def test_elements_overlap_detection(self):
        """Test _elements_overlap helper"""
        e1 = {'x': 100, 'y': 100, 'width': 200, 'height': 100}
        e2_overlap = {'x': 150, 'y': 120, 'width': 200, 'height': 100}
        e2_no_overlap = {'x': 350, 'y': 100, 'width': 200, 'height': 100}

        self.assertTrue(self.analyzer._elements_overlap(e1, e2_overlap))
        self.assertFalse(self.analyzer._elements_overlap(e1, e2_no_overlap))

    def test_calculate_variance(self):
        """Test _calculate_variance helper"""
        values_consistent = [100, 100, 100]
        values_varied = [50, 100, 150, 200]

        var_consistent = self.analyzer._calculate_variance(values_consistent)
        var_varied = self.analyzer._calculate_variance(values_varied)

        self.assertEqual(var_consistent, 0.0, "Consistent values should have 0 variance")
        self.assertGreater(var_varied, 0.0, "Varied values should have > 0 variance")


def run_tests():
    """Run all tests and return results"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestVisualAnalyzerBasics))
    suite.addTests(loader.loadTestsFromTestCase(TestTextReadability))
    suite.addTests(loader.loadTestsFromTestCase(TestOverlapDetection))
    suite.addTests(loader.loadTestsFromTestCase(TestArrowConnections))
    suite.addTests(loader.loadTestsFromTestCase(TestScoringSystem))
    suite.addTests(loader.loadTestsFromTestCase(TestSuggestionGeneration))
    suite.addTests(loader.loadTestsFromTestCase(TestComplexScenarios))
    suite.addTests(loader.loadTestsFromTestCase(TestHelperMethods))

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
