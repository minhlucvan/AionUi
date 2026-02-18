#!/usr/bin/env node
/**
 * Visual Analyzer for Excalidraw Diagrams
 * Analyzes diagram quality and detects common issues
 */

const MIN_TEXT_SIZE = 12;
const MIN_SPACING = 20;
const MAX_SPACING_VARIANCE = 0.3; // 30% variance allowed
const MIN_ALIGNMENT_THRESHOLD = 5; // 5px tolerance

function analyze(metadata) {
  const issues = [];
  const warnings = [];
  let score = 100;

  const elements = metadata.elements || [];
  if (elements.length === 0) {
    return {
      score: 0,
      grade: 'F',
      issues: ['Empty diagram'],
      warnings: [],
      suggestions: ['Add elements to the diagram'],
    };
  }

  checkTextReadability(elements, issues);
  checkSpacingConsistency(elements, warnings);
  checkAlignment(elements, warnings);
  checkOverlaps(elements, issues);
  checkArrows(elements, issues);
  checkVisualHierarchy(elements, warnings);

  const penalty = issues.length * 10 + warnings.length * 5;
  score = Math.max(0, score - penalty);

  return {
    score,
    grade: calculateGrade(score),
    issues,
    warnings,
    suggestions: generateSuggestions(issues, warnings),
    element_count: elements.length,
    quality_level: qualityLevel(score),
  };
}

function checkTextReadability(elements, issues) {
  const texts = elements.filter((e) => e.type === 'text');
  const smallTexts = texts.filter((t) => (t.fontSize || 20) < MIN_TEXT_SIZE);
  if (smallTexts.length > 0) {
    issues.push(
      `Small text detected: ${smallTexts.length} elements with font size < ${MIN_TEXT_SIZE}px`
    );
  }
}

function checkSpacingConsistency(elements, warnings) {
  const shapes = elements.filter((e) =>
    ['rectangle', 'ellipse', 'diamond'].includes(e.type)
  );
  if (shapes.length < 2) return;

  const hGaps = [];
  const vGaps = [];

  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const gap = calculateGap(shapes[i], shapes[j]);
      if (gap) {
        if (gap.direction === 'horizontal') hGaps.push(gap.distance);
        else vGaps.push(gap.distance);
      }
    }
  }

  if (hGaps.length > 0) {
    const variance = calculateVariance(hGaps);
    if (variance > MAX_SPACING_VARIANCE) {
      warnings.push(
        `Inconsistent horizontal spacing (variance: ${(variance * 100).toFixed(0)}%)`
      );
    }
  }

  if (vGaps.length > 0) {
    const variance = calculateVariance(vGaps);
    if (variance > MAX_SPACING_VARIANCE) {
      warnings.push(
        `Inconsistent vertical spacing (variance: ${(variance * 100).toFixed(0)}%)`
      );
    }
  }
}

function checkAlignment(elements, warnings) {
  const shapes = elements.filter((e) =>
    ['rectangle', 'ellipse', 'diamond'].includes(e.type)
  );
  if (shapes.length < 2) return;

  const leftEdges = shapes.map((e) => e.x || 0);
  const topEdges = shapes.map((e) => e.y || 0);
  const centersX = shapes.map((e) => (e.x || 0) + (e.width || 0) / 2);
  const centersY = shapes.map((e) => (e.y || 0) + (e.height || 0) / 2);

  let alignedCount = 0;
  alignedCount += countNearValues(leftEdges, MIN_ALIGNMENT_THRESHOLD);
  alignedCount += countNearValues(topEdges, MIN_ALIGNMENT_THRESHOLD);
  alignedCount += countNearValues(centersX, MIN_ALIGNMENT_THRESHOLD);
  alignedCount += countNearValues(centersY, MIN_ALIGNMENT_THRESHOLD);

  if (alignedCount < shapes.length * 0.3) {
    warnings.push(
      'Few aligned elements detected - consider using alignment tools'
    );
  }
}

function checkOverlaps(elements, issues) {
  const shapes = elements.filter((e) =>
    ['rectangle', 'ellipse', 'diamond'].includes(e.type)
  );

  let overlapCount = 0;
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      if (elementsOverlap(shapes[i], shapes[j])) {
        overlapCount++;
      }
    }
  }

  if (overlapCount > 0) {
    issues.push(`Overlapping elements detected: ${overlapCount} pairs`);
  }
}

function checkArrows(elements, issues) {
  const arrows = elements.filter((e) => e.type === 'arrow');
  if (arrows.length === 0) return;

  const disconnected = arrows.filter(
    (a) => !a.startBinding || !a.endBinding
  );

  if (disconnected.length > 0) {
    issues.push(
      `Disconnected arrows: ${disconnected.length} arrows not properly connected`
    );
  }
}

function checkVisualHierarchy(elements, warnings) {
  const shapes = elements.filter((e) =>
    ['rectangle', 'ellipse', 'diamond'].includes(e.type)
  );
  if (shapes.length < 2) return;

  const sizes = shapes.map((e) => (e.width || 0) * (e.height || 0));
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);

  if (maxSize > 0 && minSize / maxSize > 0.95) {
    warnings.push(
      'All elements are similar size - consider using size for visual hierarchy'
    );
  }
}

// ============ HELPERS ============

function calculateGap(e1, e2) {
  const x1 = e1.x || 0,
    y1 = e1.y || 0;
  const w1 = e1.width || 0,
    h1 = e1.height || 0;
  const x2 = e2.x || 0,
    y2 = e2.y || 0;
  const w2 = e2.width || 0,
    h2 = e2.height || 0;

  if (Math.abs(y1 - y2) < Math.min(h1, h2) * 0.5) {
    if (x1 + w1 < x2)
      return { direction: 'horizontal', distance: x2 - (x1 + w1) };
    if (x2 + w2 < x1)
      return { direction: 'horizontal', distance: x1 - (x2 + w2) };
  }

  if (Math.abs(x1 - x2) < Math.min(w1, w2) * 0.5) {
    if (y1 + h1 < y2)
      return { direction: 'vertical', distance: y2 - (y1 + h1) };
    if (y2 + h2 < y1)
      return { direction: 'vertical', distance: y1 - (y2 + h2) };
  }

  return null;
}

function calculateVariance(values) {
  if (!values || values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function countNearValues(values, threshold) {
  if (values.length < 2) return 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (Math.abs(values[i] - values[j]) <= threshold) count++;
    }
  }
  return count;
}

function elementsOverlap(e1, e2) {
  const x1 = e1.x || 0,
    y1 = e1.y || 0;
  const w1 = e1.width || 0,
    h1 = e1.height || 0;
  const x2 = e2.x || 0,
    y2 = e2.y || 0;
  const w2 = e2.width || 0,
    h2 = e2.height || 0;

  return !(
    x1 + w1 <= x2 ||
    x2 + w2 <= x1 ||
    y1 + h1 <= y2 ||
    y2 + h2 <= y1
  );
}

function calculateGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function qualityLevel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Poor';
  return 'Needs Improvement';
}

function generateSuggestions(issues, warnings) {
  const suggestions = [];

  if (issues.some((i) => i.includes('Small text')))
    suggestions.push(
      'Increase font size to at least 12px for better readability'
    );
  if (warnings.some((w) => w.toLowerCase().includes('spacing')))
    suggestions.push(
      'Use consistent spacing (e.g., 50px, 100px, 150px) between elements'
    );
  if (warnings.some((w) => w.toLowerCase().includes('aligned')))
    suggestions.push(
      'Align elements to create visual order (left/center/right or top/middle/bottom)'
    );
  if (issues.some((i) => i.includes('Overlapping')))
    suggestions.push('Separate overlapping elements or increase spacing');
  if (issues.some((i) => i.includes('Disconnected arrows')))
    suggestions.push(
      'Connect all arrows to shapes using bind-arrow command'
    );
  if (warnings.some((w) => w.toLowerCase().includes('visual hierarchy')))
    suggestions.push(
      'Use different sizes for different importance levels (larger = more important)'
    );

  if (suggestions.length === 0)
    suggestions.push('Diagram looks good! No major issues detected.');

  return suggestions;
}

// ============ EXPORTS & CLI ============

module.exports = { analyze };

if (require.main === module) {
  const fs = require('fs');

  if (process.argv.includes('--stdin')) {
    let input = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (input += chunk));
    process.stdin.on('end', () => {
      const metadata = JSON.parse(input);
      console.log(JSON.stringify(analyze(metadata), null, 2));
    });
  } else if (process.argv[2]) {
    const metadata = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
    console.log(JSON.stringify(analyze(metadata), null, 2));
  } else {
    console.log('Usage: node analyzer.js <metadata.json> OR --stdin');
    process.exit(1);
  }
}
