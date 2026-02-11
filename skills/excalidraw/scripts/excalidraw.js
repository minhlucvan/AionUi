#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Excalidraw CLI (Node.js version)
 *
 * Programmatic diagram creation tool that communicates directly with
 * AionUi's preview panel via IPC bridge.
 *
 * Version: 4.0.0 (Node.js + Direct IPC)
 */

const { DiagramManager } = require('./diagram-manager');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const VERSION = '4.0.0';

// Global diagram manager instance
let manager = null;

/**
 * Ensure diagram manager is initialized
 */
function ensureManager() {
  const conversationId = process.env.CONVERSATION_ID;
  if (!conversationId) {
    console.error('Error: CONVERSATION_ID environment variable not set');
    console.error('This skill must be run within an AionUi conversation context');
    process.exit(1);
  }

  if (!manager) {
    manager = new DiagramManager(conversationId);
  }

  return manager;
}

/**
 * Check if diagram is loaded
 */
function ensureDiagramLoaded() {
  if (!manager || !manager.currentDiagram) {
    console.error("Error: No diagram loaded. Run 'init' first.");
    process.exit(1);
  }
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
  const mgr = ensureManager();
  const filePath = await mgr.init(options.file || options.f);
  console.log(`✓ Initialized diagram`);
  console.log(`  File: ${filePath}`);
  console.log(`  Workspace: ${mgr.workspace}`);
  console.log(`  Preview panel opened in edit mode`);
}

async function cmdClear() {
  ensureDiagramLoaded();
  await manager.clear();
  console.log('✓ Cleared canvas');
}

async function cmdGet() {
  ensureDiagramLoaded();
  console.log(manager.getContent());
}

async function cmdAddShape(options) {
  ensureDiagramLoaded();

  if (!options.type || !options.x || !options.y || !options.width || !options.height) {
    console.error('Error: add-shape requires --type, --x, --y, --width, --height');
    process.exit(1);
  }

  const elementId = await manager.addShape({
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
  ensureDiagramLoaded();

  if (!options.text || options.x === undefined || options.y === undefined) {
    console.error('Error: add-text requires --text, --x, --y');
    process.exit(1);
  }

  const elementId = await manager.addText({
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
  ensureDiagramLoaded();

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

  const elementId = await manager.addArrow({
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
  ensureDiagramLoaded();

  if (!options.x || !options.y || !options.width || !options.height) {
    console.error('Error: add-frame requires --x, --y, --width, --height');
    process.exit(1);
  }

  const elementId = await manager.addFrame({
    id: options.id,
    name: options.name || 'Frame',
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
  });

  console.log(`✓ Added frame with ID: ${elementId}`);
}

async function cmdLinkText(shapeId, textId) {
  ensureDiagramLoaded();

  if (!shapeId || !textId) {
    console.error('Error: link-text requires <shape-id> <text-id>');
    process.exit(1);
  }

  try {
    await manager.linkText(shapeId, textId);
    console.log(`✓ Linked text '${textId}' to shape '${shapeId}'`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdBindArrow(arrowId, fromId, toId) {
  ensureDiagramLoaded();

  if (!arrowId || !fromId || !toId) {
    console.error('Error: bind-arrow requires <arrow-id> <from-id> <to-id>');
    process.exit(1);
  }

  try {
    await manager.bindArrow(arrowId, fromId, toId);
    console.log(`✓ Bound arrow '${arrowId}' from '${fromId}' to '${toId}'`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function cmdDelete(elementId) {
  ensureDiagramLoaded();

  if (!elementId) {
    console.error('Error: delete requires <element-id>');
    process.exit(1);
  }

  try {
    await manager.deleteElement(elementId);
    console.log(`✓ Deleted element '${elementId}'`);
  } catch (err) {
    console.error(`Warning: ${err.message}`);
  }
}

async function cmdSnapshot(options) {
  ensureDiagramLoaded();
  console.log('Capturing snapshot...');

  const metadata = manager.getMetadata();
  const snapshot = {
    timestamp: Date.now(),
    elements: manager.currentDiagram.elements,
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
  ensureDiagramLoaded();
  console.log('Getting scene metadata...');

  const metadata = manager.getMetadata();

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
  ensureDiagramLoaded();
  console.log('Analyzing diagram quality...');

  // Call Python analyzer as subprocess
  const analyzerPath = path.join(__dirname, 'analyzer.py');
  const diagramJson = JSON.stringify({
    elements: manager.currentDiagram.elements,
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
  ensureDiagramLoaded();

  const outputFile = options.output || options.o;
  if (!outputFile) {
    console.error('Error: export-excalidraw requires --output or -o');
    process.exit(1);
  }

  const savePath = await manager.save(outputFile);
  const elementCount = manager.currentDiagram.elements.length;
  const content = manager.getContent();

  console.log(`✓ Exported ${elementCount} elements to ${savePath}`);
  console.log(`  Format: Excalidraw JSON v${manager.currentDiagram.version}`);
  console.log(`  File size: ${content.length} bytes`);
}

async function cmdExportPng(options) {
  ensureDiagramLoaded();

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
  console.log(`excalidraw CLI v${VERSION} (Node.js + Direct IPC)`);
}

function cmdHelp() {
  const help = `
Excalidraw CLI - Programmatic diagram creation tool (Node.js version)

USAGE:
  node excalidraw.js <command> [options]

COMMANDS:
  Session Management:
    init [--file <path>]      Initialize Excalidraw session (opens preview panel)
    clear                     Clear the canvas
    get                       Get all elements as JSON

  Element Creation:
    add-shape [options]       Create a shape (rectangle/ellipse/diamond)
      --type <type>           Shape type (required)
      --x <x>                 X position (required)
      --y <y>                 Y position (required)
      --width <w>             Width (required)
      --height <h>            Height (required)
      --id <id>               Element ID (optional)
      --palette <name>        Color palette (frontend/backend/database/etc.)
      --bg <color>            Background color (hex)
      --stroke <color>        Stroke color (hex)

    add-text [options]        Create a text element
      --text <text>           Text content (required)
      --x <x>                 X position (required)
      --y <y>                 Y position (required)
      --id <id>               Element ID (optional)
      --size <size>           Font size (default: 20)
      --container-id <id>     Container element ID

    add-arrow [options]       Create an arrow/line
      --x <x>                 X position (required)
      --y <y>                 Y position (required)
      --id <id>               Element ID (optional)
      --points <json>         Points array as JSON (default: [[0,0],[120,0]])
      --stroke <color>        Stroke color (default: #000000)
      --start-binding <id>    Start binding element ID
      --end-binding <id>      End binding element ID

    add-frame [options]       Create a frame container
      --x <x>                 X position (required)
      --y <y>                 Y position (required)
      --width <w>             Width (required)
      --height <h>            Height (required)
      --id <id>               Element ID (optional)
      --name <name>           Frame name (default: "Frame")

  Relationships:
    link-text <shape> <text>  Link text to shape (bidirectional)
    bind-arrow <arrow> <from> <to>
                              Bind arrow to shapes (bidirectional)

  Visual Feedback:
    snapshot [-o <file>]      Capture full canvas snapshot (image + metadata)
    get-state [-o <file>]     Get scene metadata (fast, no image)
    analyze [-o <file>]       Analyze diagram quality and get scored report

  Export:
    export-excalidraw -o <file>
                              Export scene as .excalidraw file (JSON format)
    export-png -o <file>      Export scene as PNG image (not yet implemented)

  Utilities:
    delete <element-id>       Delete an element

  Info:
    version                   Show version
    help                      Show this help

EXAMPLES:
  # Initialize session (opens preview panel in AionUi)
  node excalidraw.js init

  # Create shape with text
  node excalidraw.js add-shape --type rectangle --id "api" --x 100 --y 100 --width 200 --height 100 --palette backend
  node excalidraw.js add-text --id "api-label" --text "API Service" --x 160 --y 135 --container-id "api"
  node excalidraw.js link-text api api-label

  # Connect shapes with arrow
  node excalidraw.js add-arrow --id "flow" --x 280 --y 150 --points "[[0,0],[120,0]]"
  node excalidraw.js bind-arrow flow api database

  # Analyze quality
  node excalidraw.js analyze

  # Export
  node excalidraw.js export-excalidraw -o diagram.excalidraw

For more information, see the documentation in skills/excalidraw/
`;
  console.log(help);
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

    // Simple commands
    switch (command) {
      case 'init':
        await cmdInit(parseArgs(cmdArgs));
        break;
      case 'clear':
        await cmdClear();
        break;
      case 'get':
        await cmdGet();
        break;
      case 'add-shape':
        await cmdAddShape(parseArgs(cmdArgs));
        break;
      case 'add-text':
        await cmdAddText(parseArgs(cmdArgs));
        break;
      case 'add-arrow':
        await cmdAddArrow(parseArgs(cmdArgs));
        break;
      case 'add-frame':
        await cmdAddFrame(parseArgs(cmdArgs));
        break;
      case 'link-text':
        await cmdLinkText(cmdArgs[0], cmdArgs[1]);
        break;
      case 'bind-arrow':
        await cmdBindArrow(cmdArgs[0], cmdArgs[1], cmdArgs[2]);
        break;
      case 'delete':
        await cmdDelete(cmdArgs[0]);
        break;
      case 'snapshot':
        await cmdSnapshot(parseArgs(cmdArgs));
        break;
      case 'get-state':
        await cmdGetState(parseArgs(cmdArgs));
        break;
      case 'analyze':
        await cmdAnalyze(parseArgs(cmdArgs));
        break;
      case 'export-excalidraw':
        await cmdExportExcalidraw(parseArgs(cmdArgs));
        break;
      case 'export-png':
        await cmdExportPng(parseArgs(cmdArgs));
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
