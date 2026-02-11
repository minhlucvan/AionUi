#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * SVG Embed — Attach SVG files as image elements in Excalidraw diagrams
 *
 * Usage:
 *   node svg-embed.js --svg icon.svg --excalidraw diagram.excalidraw \
 *     --id "server-icon" --x 100 --y 100 [--width 64] [--height 64]
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Parse command-line arguments into options object
 */
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];

      if (value === undefined || value.startsWith('--')) {
        options[key] = true;
      } else {
        if (/^-?\d+$/.test(value)) {
          options[key] = parseInt(value, 10);
        } else if (/^-?\d+\.\d+$/.test(value)) {
          options[key] = parseFloat(value);
        } else {
          options[key] = value;
        }
        i++;
      }
    }
  }
  return options;
}

/**
 * Generate a random seed for excalidraw elements
 */
function randomSeed() {
  return Math.floor(Math.random() * 2_000_000_000);
}

/**
 * Embed an SVG file into an excalidraw diagram as an image element
 */
async function embed(options) {
  const { svg, excalidraw, x, y } = options;
  const width = options.width || 64;
  const height = options.height || 64;

  // Validate required params
  if (!svg) {
    console.error('Error: --svg <path> is required');
    process.exit(1);
  }
  if (!excalidraw) {
    console.error('Error: --excalidraw <path> is required');
    process.exit(1);
  }
  if (x === undefined || y === undefined) {
    console.error('Error: --x and --y are required');
    process.exit(1);
  }

  // Read SVG file
  const svgPath = path.resolve(svg);
  let svgContent;
  try {
    svgContent = await fs.readFile(svgPath, 'utf-8');
  } catch {
    console.error(`Error: Cannot read SVG file: ${svgPath}`);
    process.exit(1);
  }

  // Convert SVG to base64 data URL
  const svgBase64 = Buffer.from(svgContent).toString('base64');
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  // Generate SHA-1 fileId from SVG content (content-addressable)
  const fileId = crypto.createHash('sha1').update(svgContent).digest('hex');

  // Generate element ID
  const elementId = options.id || `img-${fileId.substring(0, 8)}`;

  // Read excalidraw file
  const excalidrawPath = path.resolve(excalidraw);
  let diagram;
  try {
    const content = await fs.readFile(excalidrawPath, 'utf-8');
    diagram = JSON.parse(content);
  } catch {
    console.error(`Error: Cannot read excalidraw file: ${excalidrawPath}`);
    console.error('Make sure the file exists and is valid JSON.');
    process.exit(1);
  }

  // Ensure files object exists
  if (!diagram.files) {
    diagram.files = {};
  }

  // Add file entry
  diagram.files[fileId] = {
    mimeType: 'image/svg+xml',
    id: fileId,
    dataURL: dataUrl,
    created: Date.now(),
    lastRetrieved: Date.now(),
  };

  // Create image element
  const imageElement = {
    id: elementId,
    type: 'image',
    x: x,
    y: y,
    width: width,
    height: height,
    angle: 0,
    strokeColor: 'transparent',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: `a${(diagram.elements.length + 1).toString()}`,
    roundness: null,
    seed: randomSeed(),
    version: 1,
    versionNonce: randomSeed(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    status: 'saved',
    fileId: fileId,
    scale: [1, 1],
  };

  // Add element to diagram
  diagram.elements.push(imageElement);

  // Write updated diagram back to disk
  await fs.writeFile(excalidrawPath, JSON.stringify(diagram, null, 2));

  console.log(`✓ Embedded SVG as image element`);
  console.log(`  Element ID: ${elementId}`);
  console.log(`  File ID: ${fileId}`);
  console.log(`  Position: (${x}, ${y}) Size: ${width}x${height}`);
  console.log(`  Diagram: ${excalidrawPath}`);
}

function printHelp() {
  console.log(`
SVG Embed — Attach SVG files as image elements in Excalidraw diagrams

USAGE:
  node svg-embed.js --svg <path> --excalidraw <path> --x <x> --y <y> [options]

OPTIONS:
  --svg <path>          Path to .svg file (required)
  --excalidraw <path>   Path to .excalidraw file (required)
  --id <id>             Element ID (default: img-{hash8})
  --x <x>               X position (required)
  --y <y>               Y position (required)
  --width <w>           Display width (default: 64)
  --height <h>          Display height (default: 64)
  --help                Show this help

EXAMPLES:
  node svg-embed.js --svg icon.svg --excalidraw diagram.excalidraw --x 100 --y 100
  node svg-embed.js --svg db.svg --excalidraw arch.excalidraw --id "db-1" --x 400 --y 200 --width 96 --height 96
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const options = parseArgs(args);
  await embed(options);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
