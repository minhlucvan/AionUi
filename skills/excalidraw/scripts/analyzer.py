#!/usr/bin/env python3
"""
Visual Analyzer for Excalidraw Diagrams
Analyzes diagram quality and detects common issues
"""
from typing import Dict, List, Any, Tuple
import math


class VisualAnalyzer:
    """Analyzes diagram quality and provides scoring"""

    # Quality thresholds
    MIN_TEXT_SIZE = 12
    MIN_SPACING = 20
    MAX_SPACING_VARIANCE = 0.3  # 30% variance allowed
    MIN_ALIGNMENT_THRESHOLD = 5  # 5px tolerance

    def __init__(self):
        self.issues = []
        self.warnings = []
        self.score = 100

    def analyze(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze diagram metadata and return quality report

        Args:
            metadata: Scene metadata from control-script.js

        Returns:
            Quality report with score and issues
        """
        self.issues = []
        self.warnings = []
        self.score = 100

        elements = metadata.get('elements', [])
        if not elements:
            return {
                'score': 0,
                'grade': 'F',
                'issues': ['Empty diagram'],
                'warnings': [],
                'suggestions': ['Add elements to the diagram']
            }

        # Run all checks
        self._check_text_readability(elements)
        self._check_spacing_consistency(elements)
        self._check_alignment(elements)
        self._check_overlaps(elements)
        self._check_arrows(elements)
        self._check_visual_hierarchy(elements)

        # Calculate final score
        penalty = len(self.issues) * 10 + len(self.warnings) * 5
        self.score = max(0, self.score - penalty)

        grade = self._calculate_grade(self.score)
        suggestions = self._generate_suggestions()

        return {
            'score': self.score,
            'grade': grade,
            'issues': self.issues,
            'warnings': self.warnings,
            'suggestions': suggestions,
            'element_count': len(elements),
            'quality_level': self._quality_level(self.score)
        }

    def _check_text_readability(self, elements: List[Dict]) -> None:
        """Check if text is readable (font size >= 12px)"""
        texts = [e for e in elements if e.get('type') == 'text']

        small_texts = []
        for text in texts:
            font_size = text.get('fontSize', 20)
            if font_size < self.MIN_TEXT_SIZE:
                small_texts.append(text.get('id'))

        if small_texts:
            self.issues.append(f"Small text detected: {len(small_texts)} elements with font size < {self.MIN_TEXT_SIZE}px")

    def _check_spacing_consistency(self, elements: List[Dict]) -> None:
        """Check if spacing between elements is consistent"""
        shapes = [e for e in elements if e.get('type') in ['rectangle', 'ellipse', 'diamond']]

        if len(shapes) < 2:
            return

        # Calculate horizontal and vertical gaps
        h_gaps = []
        v_gaps = []

        for i, shape1 in enumerate(shapes):
            for shape2 in shapes[i+1:]:
                gap = self._calculate_gap(shape1, shape2)
                if gap:
                    if gap['direction'] == 'horizontal':
                        h_gaps.append(gap['distance'])
                    else:
                        v_gaps.append(gap['distance'])

        # Check consistency (variance)
        if h_gaps:
            variance = self._calculate_variance(h_gaps)
            if variance > self.MAX_SPACING_VARIANCE:
                self.warnings.append(f"Inconsistent horizontal spacing (variance: {variance:.1%})")

        if v_gaps:
            variance = self._calculate_variance(v_gaps)
            if variance > self.MAX_SPACING_VARIANCE:
                self.warnings.append(f"Inconsistent vertical spacing (variance: {variance:.1%})")

    def _check_alignment(self, elements: List[Dict]) -> None:
        """Check if elements are properly aligned"""
        shapes = [e for e in elements if e.get('type') in ['rectangle', 'ellipse', 'diamond']]

        if len(shapes) < 2:
            return

        # Check for common alignment patterns
        left_edges = [e.get('x') for e in shapes]
        top_edges = [e.get('y') for e in shapes]
        centers_x = [e.get('x') + e.get('width', 0) / 2 for e in shapes]
        centers_y = [e.get('y') + e.get('height', 0) / 2 for e in shapes]

        # Count alignments
        aligned_count = 0
        aligned_count += self._count_near_values(left_edges, self.MIN_ALIGNMENT_THRESHOLD)
        aligned_count += self._count_near_values(top_edges, self.MIN_ALIGNMENT_THRESHOLD)
        aligned_count += self._count_near_values(centers_x, self.MIN_ALIGNMENT_THRESHOLD)
        aligned_count += self._count_near_values(centers_y, self.MIN_ALIGNMENT_THRESHOLD)

        # If few alignments, suggest alignment
        if aligned_count < len(shapes) * 0.3:
            self.warnings.append("Few aligned elements detected - consider using alignment tools")

    def _check_overlaps(self, elements: List[Dict]) -> None:
        """Check for unintentional overlaps"""
        shapes = [e for e in elements if e.get('type') in ['rectangle', 'ellipse', 'diamond']]

        overlaps = []
        for i, shape1 in enumerate(shapes):
            for shape2 in shapes[i+1:]:
                if self._elements_overlap(shape1, shape2):
                    overlaps.append((shape1.get('id'), shape2.get('id')))

        if overlaps:
            self.issues.append(f"Overlapping elements detected: {len(overlaps)} pairs")

    def _check_arrows(self, elements: List[Dict]) -> None:
        """Check arrow connections"""
        arrows = [e for e in elements if e.get('type') == 'arrow']

        if not arrows:
            return

        disconnected = []
        for arrow in arrows:
            if not arrow.get('startBinding') or not arrow.get('endBinding'):
                disconnected.append(arrow.get('id'))

        if disconnected:
            self.issues.append(f"Disconnected arrows: {len(disconnected)} arrows not properly connected")

    def _check_visual_hierarchy(self, elements: List[Dict]) -> None:
        """Check if visual hierarchy is clear (size variation)"""
        shapes = [e for e in elements if e.get('type') in ['rectangle', 'ellipse', 'diamond']]

        if len(shapes) < 2:
            return

        sizes = [e.get('width', 0) * e.get('height', 0) for e in shapes]
        if sizes:
            max_size = max(sizes)
            min_size = min(sizes)

            # If all shapes are same size, no hierarchy
            if max_size > 0 and min_size / max_size > 0.95:
                self.warnings.append("All elements are similar size - consider using size for visual hierarchy")

    def _calculate_gap(self, e1: Dict, e2: Dict) -> Dict[str, Any] | None:
        """Calculate gap between two elements"""
        x1, y1 = e1.get('x', 0), e1.get('y', 0)
        w1, h1 = e1.get('width', 0), e1.get('height', 0)
        x2, y2 = e2.get('x', 0), e2.get('y', 0)
        w2, h2 = e2.get('width', 0), e2.get('height', 0)

        # Check if horizontally aligned
        if abs(y1 - y2) < min(h1, h2) * 0.5:
            if x1 + w1 < x2:
                return {'direction': 'horizontal', 'distance': x2 - (x1 + w1)}
            elif x2 + w2 < x1:
                return {'direction': 'horizontal', 'distance': x1 - (x2 + w2)}

        # Check if vertically aligned
        if abs(x1 - x2) < min(w1, w2) * 0.5:
            if y1 + h1 < y2:
                return {'direction': 'vertical', 'distance': y2 - (y1 + h1)}
            elif y2 + h2 < y1:
                return {'direction': 'vertical', 'distance': y1 - (y2 + h2)}

        return None

    def _calculate_variance(self, values: List[float]) -> float:
        """Calculate coefficient of variation (std / mean)"""
        if not values or len(values) < 2:
            return 0.0

        mean = sum(values) / len(values)
        if mean == 0:
            return 0.0

        variance = sum((x - mean) ** 2 for x in values) / len(values)
        std = math.sqrt(variance)
        return std / mean

    def _count_near_values(self, values: List[float], threshold: float) -> int:
        """Count how many values are near each other"""
        if len(values) < 2:
            return 0

        near_count = 0
        for i, v1 in enumerate(values):
            for v2 in values[i+1:]:
                if abs(v1 - v2) <= threshold:
                    near_count += 1

        return near_count

    def _elements_overlap(self, e1: Dict, e2: Dict) -> bool:
        """Check if two elements overlap (adjacent/touching elements don't count as overlapping)"""
        x1, y1 = e1.get('x', 0), e1.get('y', 0)
        w1, h1 = e1.get('width', 0), e1.get('height', 0)
        x2, y2 = e2.get('x', 0), e2.get('y', 0)
        w2, h2 = e2.get('width', 0), e2.get('height', 0)

        # Use <= instead of < to allow adjacent elements (touching but not overlapping)
        return not (x1 + w1 <= x2 or x2 + w2 <= x1 or y1 + h1 <= y2 or y2 + h2 <= y1)

    def _calculate_grade(self, score: int) -> str:
        """Convert score to letter grade"""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'

    def _quality_level(self, score: int) -> str:
        """Convert score to quality level"""
        if score >= 90:
            return 'Excellent'
        elif score >= 80:
            return 'Good'
        elif score >= 70:
            return 'Fair'
        elif score >= 60:
            return 'Poor'
        else:
            return 'Needs Improvement'

    def _generate_suggestions(self) -> List[str]:
        """Generate actionable suggestions based on issues"""
        suggestions = []

        # Text readability
        if any('Small text' in issue for issue in self.issues):
            suggestions.append("Increase font size to at least 12px for better readability")

        # Spacing
        if any('spacing' in warning.lower() for warning in self.warnings):
            suggestions.append("Use consistent spacing (e.g., 50px, 100px, 150px) between elements")

        # Alignment
        if any('aligned' in warning.lower() for warning in self.warnings):
            suggestions.append("Align elements to create visual order (left/center/right or top/middle/bottom)")

        # Overlaps
        if any('Overlapping' in issue for issue in self.issues):
            suggestions.append("Separate overlapping elements or increase spacing")

        # Arrows
        if any('Disconnected arrows' in issue for issue in self.issues):
            suggestions.append("Connect all arrows to shapes using bind-arrow command")

        # Visual hierarchy
        if any('visual hierarchy' in warning.lower() for warning in self.warnings):
            suggestions.append("Use different sizes for different importance levels (larger = more important)")

        if not suggestions:
            suggestions.append("Diagram looks good! No major issues detected.")

        return suggestions


def main():
    """Test analyzer with sample data"""
    import json
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 analyzer.py <metadata.json>")
        sys.exit(1)

    with open(sys.argv[1], 'r') as f:
        metadata = json.load(f)

    analyzer = VisualAnalyzer()
    result = analyzer.analyze(metadata)

    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
