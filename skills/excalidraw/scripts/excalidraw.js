#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Excalidraw CLI (Node.js version)
 *
 * Programmatic diagram creation tool that reads/writes .excalidraw
 * JSON files directly on disk via Node.js fs.
 *
 * Version: 5.0.0 (Direct JSON File I/O)
 */

const { DiagramManager } = require('./diagram-manager');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const VERSION = '5.0.0';

/**
 * Create a DiagramManager from --file flag, load diagram from disk
 * @param {object} options - parsed CLI options (must contain `file`)
 * @param {boolean} initNew - if true, run init() to create file if missing
 * @returns {Promise<DiagramManager>}
 */
async function ensureManager(options, initNew = false) {
  const filePath = options.file || options.f;
  if (!filePath) {
    console.error('Error: --file <path> is required');
    console.error('Example: node excalidraw.js init --file diagram.excalidraw');
    process.exit(1);
  }

  const mgr = new DiagramManager(filePath);

  if (initNew) {
    await mgr.init();
  } else {
    // Load existing file (must exist)
    try {
      await fs.access(path.resolve(filePath));
    } catch {
      console.error(`Error: File not found: ${path.resolve(filePath)}`);
      console.error("Run 'init --file <path>' first to create a new diagram.");
      process.exit(1);
    }
    await mgr.init();
  }

  return mgr;
}

/**
 * Parse command-line arguments into options object
 */
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];

      // Handle flags
      if (value === undefined || value.startsWith('--')) {
        options[key] = true;
      } else {
        // Try to parse as number if it looks like one
        if (/^-?\d+$/.test(value)) {
          options[key] = parseInt(value, 10);
        } else if (/^-?\d+\.\d+$/.test(value)) {
          options[key] = parseFloat(value);
        } else {
          options[key] = value;
        }
        i++; // Skip next arg since we consumed it
      }
    } else if (args[i].startsWith('-') && args[i].length === 2) {
      // Short flag
      const key = args[i].substring(1);
      const value = args[i + 1];

      if (value === undefined || value.startsWith('-')) {
        options[key] = true;
      } else {
        options[key] = value;
        i++;
      }
    }
  }
  return options;
}

/**
 * Commands
 */

async function cmdInit(options) {
  const mgr = await ensureManager(options, true);
  console.log(`✓ Initialized diagram`);
  console.log(`  File: ${mgr.filePath}`);
}

async function cmdClear(options) {
  const mgr = await ensureManager(options);
  await mgr.clear();
  console.log('✓ Cleared canvas');
}

async function cmdGet(options) {
  const mgr = await ensureManager(options);
  console.log(mgr.getContent());
}

async function cmdAddShape(options) {
  const mgr = await ensureManager(options);

  if (!options.type || !options.x || !options.y || !options.width || !options.height) {
    console.error('Error: add-shape requires --type, --x, --y, --width, --height');
    process.exit(1);
  }

  const elementId = await mgr.addShape({
    id: options.id,
    type: options.type,
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    palette: options.palette,
    stroke: options.stroke,
    fill: options.bg,
  });

  console.log(`✓ Added ${options.type} with ID: ${elementId}`);
}

async function cmdAddText(options) {
  const mgr = await ensureManager(options);

  if (!options.text || options.x === undefined || options.y === undefined) {
    console.error('Error: add-text requires --text, --x, --y');
    process.exit(1);
  }

  const elementId = await mgr.addText({
    id: options.id,
    text: options.text,
    x: options.x,
    y: options.y,
    size: options.size || 20,
    containerId: options['container-id'],
  });

  console.log(`✓ Added text with ID: ${elementId}`);
}

async function cmdAddArrow(options) {
  const mgr = await ensureManager(options);

  if (options.x === undefined || options.y === undefined) {
    console.error('Error: add-arrow requires --x, --y');
    process.exit(1);
  }

  // Parse points if provided
  let points = [
    [0, 0],
    [120, 0],
  ];
  if (options.points) {
    try {
      points = JSON.parse(options.points);
    } catch (err) {
      console.error('Error: --points must be valid JSON array');
      process.exit(1);
    }
  }

  const elementId = await mgr.addArrow({
    id: options.id,
    x: options.x,
    y: options.y,
    points,
    stroke: options.stroke || '#000000',
    startBinding: options['start-binding'],
    endBinding: options['end-binding'],
  });

  console.log(`✓ Added arrow with ID: ${elementId}`);
}

async function cmdAddFrame(options) {
  const mgr = await ensureManager(options);

  if (!options.x || !options.y || !options.width || !options.height) {
    console.error('Error: add-frame requires --x, --y, --width, --height');
    process.exit(1);
  }

  const elementId = await mgr.addFrame({
    id: options.id,
    name: options.name || 'Frame',
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
  });

  console.log(`✓ Added frame with ID: ${elementId}`);
}

async function cmdLinkText(options, shapeId, textId) {
  const mgr = await ensureManager(options);

  if (!shapeId || !textId) {
    console.error('Error: link-text requires <shape-id> <text-id>');
    process.exit(1);
  }

  try {
    await mgr.linkText(shapeId, textId);
    console.log(`✓ Linked text '${textId}' to shape '${shapeId}'`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdBindArrow(options, arrowId, fromId, toId) {
  const mgr = await ensureManager(options);

  if (!arrowId || !fromId || !toId) {
    console.error('Error: bind-arrow requires <arrow-id> <from-id> <to-id>');
    process.exit(1);
  }

  try {
    await mgr.bindArrow(arrowId, fromId, toId);
    console.log(`✓ Bound arrow '${arrowId}' from '${fromId}' to '${toId}'`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdDelete(options, elementId) {
  const mgr = await ensureManager(options);

  if (!elementId) {
    console.error('Error: delete requires <element-id>');
    process.exit(1);
  }

  try {
    await mgr.deleteElement(elementId);
    console.log(`✓ Deleted element '${elementId}'`);
  } catch (err) {
    console.error(`Warning: ${err.message}`);
  }
}

async function cmdSnapshot(options) {
  const mgr = await ensureManager(options);
  console.log('Capturing snapshot...');

  const metadata = mgr.getMetadata();
  const snapshot = {
    timestamp: Date.now(),
    elements: mgr.currentDiagram.elements,
    dimensions: { width: 0, height: 0 },
    viewport: { zoom: 1, scrollX: 0, scrollY: 0 },
    metadata,
  };

  if (options.output || options.o) {
    const outputFile = options.output || options.o;
    await fs.writeFile(outputFile, JSON.stringify(snapshot, null, 2));
    console.log(`Snapshot saved to ${outputFile}`);
  } else {
    console.log('\nSnapshot captured');
    console.log(`Elements: ${snapshot.elements.length}`);
  }
}

async function cmdGetState(options) {
  const mgr = await ensureManager(options);
  console.log('Getting scene metadata...');

  const metadata = mgr.getMetadata();

  console.log('\nScene Metadata:');
  console.log(`  Total elements: ${metadata.elementCount}`);

  if (Object.keys(metadata.elementsByType).length > 0) {
    console.log('  Elements by type:');
    for (const [type, count] of Object.entries(metadata.elementsByType)) {
      console.log(`    ${type}: ${count}`);
    }
  }

  if (options.output || options.o) {
    const outputFile = options.output || options.o;
    await fs.writeFile(outputFile, JSON.stringify(metadata, null, 2));
    console.log(`\nMetadata saved to ${outputFile}`);
  }
}

async function cmdAnalyze(options) {
  const mgr = await ensureManager(options);
  console.log('Analyzing diagram quality...');

  // Call Python analyzer as subprocess
  const analyzerPath = path.join(__dirname, 'analyzer.py');
  const diagramJson = JSON.stringify({
    elements: mgr.currentDiagram.elements,
  });

  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [analyzerPath, '--stdin'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        console.error(`Analyzer failed: ${stderr}`);
        process.exit(1);
      }

      try {
        const report = JSON.parse(stdout);

        // Display report
        console.log('\n' + '='.repeat(60));
        console.log('DIAGRAM QUALITY REPORT');
        console.log('='.repeat(60));
        console.log(`\nOverall Score: ${report.score}/100 (Grade: ${report.grade})`);
        console.log(`Quality Level: ${report.quality_level}`);
        console.log(`Elements Analyzed: ${report.element_count}`);

        if (report.issues && report.issues.length > 0) {
          console.log(`\n❌ Issues (${report.issues.length}):`);
          for (const issue of report.issues) {
            console.log(`  • ${issue}`);
          }
        }

        if (report.warnings && report.warnings.length > 0) {
          console.log(`\n⚠️  Warnings (${report.warnings.length}):`);
          for (const warning of report.warnings) {
            console.log(`  • ${warning}`);
          }
        }

        if (report.suggestions && report.suggestions.length > 0) {
          console.log('\n💡 Suggestions:');
          for (const suggestion of report.suggestions) {
            console.log(`  • ${suggestion}`);
          }
        }

        console.log('\n' + '='.repeat(60) + '\n');

        if (options.output || options.o) {
          const outputFile = options.output || options.o;
          await fs.writeFile(outputFile, JSON.stringify(report, null, 2));
          console.log(`Report saved to ${outputFile}`);
        }

        resolve();
      } catch (err) {
        console.error(`Failed to parse analyzer output: ${err.message}`);
        process.exit(1);
      }
    });

    // Send diagram JSON to analyzer stdin
    proc.stdin.write(diagramJson);
    proc.stdin.end();
  });
}

async function cmdExportExcalidraw(options) {
  const mgr = await ensureManager(options);

  const outputFile = options.output || options.o;
  if (!outputFile) {
    console.error('Error: export-excalidraw requires --output or -o');
    process.exit(1);
  }

  const savePath = await mgr.save(outputFile);
  const elementCount = mgr.currentDiagram.elements.length;
  const content = mgr.getContent();

  console.log(`✓ Exported ${elementCount} elements to ${savePath}`);
  console.log(`  Format: Excalidraw JSON v${mgr.currentDiagram.version}`);
  console.log(`  File size: ${content.length} bytes`);
}

async function cmdExportPng(options) {
  await ensureManager(options);

  const outputFile = options.output || options.o;
  if (!outputFile) {
    console.error('Error: export-png requires --output or -o');
    process.exit(1);
  }

  console.error('Error: PNG export not yet implemented in Node.js version');
  console.error('Please use export-excalidraw and open the file in Excalidraw web to export PNG');
  process.exit(1);
}

function cmdVersion() {
  console.log(`excalidraw CLI v${VERSION} (Direct JSON File I/O)`);
}

function cmdHelp() {
  const help = `
Excalidraw CLI - Programmatic diagram creation tool (Node.js version)

USAGE:
  node excalidraw.js <command> --file <path> [options]

  Every command requires --file <path> to specify the .excalidraw file.

COMMANDS:
  Session Management:
    init --file <path>        Create new or load existing .excalidraw file
    clear --file <path>       Clear the canvas
    get --file <path>         Get all elements as JSON

  Element Creation:
    add-shape --file <path> [options]
      --type <type>           Shape type (required)
      --x <x>                 X position (required)
      --y <y>                 Y position (required)
      --width <w>             Width (required)
      --height <h>            Height (required)
      --id <id>               Element ID (optional)
      --palette <name>        Color palette (frontend/backend/database/etc.)
      --bg <color>            Background color (hex)
      --stroke <color>        Stroke color (hex)

    add-text --file <path> [options]
      --text <text>           Text content (required)
      --x <x>                 X position (required)
      --y <y>                 Y position (required)
      --id <id>               Element ID (optional)
      --size <size>           Font size (default: 20)
      --container-id <id>     Container element ID

    add-arrow --file <path> [options]
      --x <x>                 X position (required)
      --y <y>                 Y position (required)
      --id <id>               Element ID (optional)
      --points <json>         Points array as JSON (default: [[0,0],[120,0]])
      --stroke <color>        Stroke color (default: #000000)
      --start-binding <id>    Start binding element ID
      --end-binding <id>      End binding element ID

    add-frame --file <path> [options]
      --x <x>                 X position (required)
      --y <y>                 Y position (required)
      --width <w>             Width (required)
      --height <h>            Height (required)
      --id <id>               Element ID (optional)
      --name <name>           Frame name (default: "Frame")

  Relationships:
    link-text --file <path> <shape> <text>
                              Link text to shape (bidirectional)
    bind-arrow --file <path> <arrow> <from> <to>
                              Bind arrow to shapes (bidirectional)

  Visual Feedback:
    snapshot --file <path> [-o <file>]
                              Capture full canvas snapshot (metadata)
    get-state --file <path> [-o <file>]
                              Get scene metadata
    analyze --file <path> [-o <file>]
                              Analyze diagram quality and get scored report

  Export:
    export-excalidraw --file <path> -o <file>
                              Export scene as .excalidraw file (JSON format)
    export-png --file <path> -o <file>
                              Export scene as PNG image (not yet implemented)

  Utilities:
    delete --file <path> <element-id>
                              Delete an element

  Info:
    version                   Show version
    help                      Show this help

EXAMPLES:
  # Create a new diagram
  node excalidraw.js init --file diagram.excalidraw

  # Add shape with text
  node excalidraw.js add-shape --file diagram.excalidraw --type rectangle --id "api" --x 100 --y 100 --width 200 --height 100 --palette backend
  node excalidraw.js add-text --file diagram.excalidraw --text "API Service" --x 160 --y 135 --container-id "api"
  node excalidraw.js link-text --file diagram.excalidraw api api-text

  # Connect shapes with arrow
  node excalidraw.js add-arrow --file diagram.excalidraw --id "flow" --x 280 --y 150 --points "[[0,0],[120,0]]"
  node excalidraw.js bind-arrow --file diagram.excalidraw flow api database

  # Analyze quality
  node excalidraw.js analyze --file diagram.excalidraw

  # Export
  node excalidraw.js export-excalidraw --file diagram.excalidraw -o output.excalidraw

For more information, see the documentation in skills/excalidraw/
`;
  console.log(help);
}

/**
 * Extract positional args (non-flag args after the command)
 */
function extractPositionalArgs(args) {
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      i++; // skip value
    } else if (args[i].startsWith('-') && args[i].length === 2) {
      i++; // skip value
    } else {
      positional.push(args[i]);
    }
  }
  return positional;
}

/**
 * Main command dispatcher
 */
async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      cmdHelp();
      return;
    }

    const command = args[0];
    const cmdArgs = args.slice(1);
    const options = parseArgs(cmdArgs);
    const positional = extractPositionalArgs(cmdArgs);

    switch (command) {
      case 'init':
        await cmdInit(options);
        break;
      case 'clear':
        await cmdClear(options);
        break;
      case 'get':
        await cmdGet(options);
        break;
      case 'add-shape':
        await cmdAddShape(options);
        break;
      case 'add-text':
        await cmdAddText(options);
        break;
      case 'add-arrow':
        await cmdAddArrow(options);
        break;
      case 'add-frame':
        await cmdAddFrame(options);
        break;
      case 'link-text':
        await cmdLinkText(options, positional[0], positional[1]);
        break;
      case 'bind-arrow':
        await cmdBindArrow(options, positional[0], positional[1], positional[2]);
        break;
      case 'delete':
        await cmdDelete(options, positional[0]);
        break;
      case 'snapshot':
        await cmdSnapshot(options);
        break;
      case 'get-state':
        await cmdGetState(options);
        break;
      case 'analyze':
        await cmdAnalyze(options);
        break;
      case 'export-excalidraw':
        await cmdExportExcalidraw(options);
        break;
      case 'export-png':
        await cmdExportPng(options);
        break;
      case 'version':
      case '--version':
      case '-v':
        cmdVersion();
        break;
      case 'help':
      case '--help':
      case '-h':
        cmdHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'node excalidraw.js help' for usage");
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
