# Excalidraw Diagram Skill

Create professional diagrams directly in AionUi's preview panel using the `excalidraw` CLI tool. Features data-driven patterns with BM25 search, semantic color palettes, real-time preview updates, quality analysis, and seamless workspace integration.

## Quick Start

```bash
# 1. Search for pattern (returns dimensions, spacing, colors)
python3 scripts/search.py "3-tier architecture"

# 2. Initialize Excalidraw
node scripts/excalidraw.js init

# 3. Create diagram using queried data
node scripts/excalidraw.js add-shape --type rectangle --id "api" --x 100 --y 100 --width 200 --height 100 --palette backend
node scripts/excalidraw.js add-text --id "api-label" --text "API Gateway" --x 160 --y 135 --container-id "api"
node scripts/excalidraw.js link-text api api-label

# 4. Analyze quality (NEW!)
node scripts/excalidraw.js analyze
```

Or use a template:

```bash
# View template with copy-paste commands
cat templates/3-tier-architecture.md

# Or execute commands directly from template
```

## Installation

Node.js is required (Python 3.8+ optional for quality analysis):

```bash
node --version     # Verify Node.js is installed
python3 --version  # Optional: For quality analysis only
pip install rank-bm25  # Optional: For pattern search
```

No additional configuration needed - the skill works within AionUi conversations.

### Optional: Create Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias excalidraw='node ~/.claude/skills/excalidraw/scripts/excalidraw.js'
alias excalidraw-search='python3 ~/.claude/skills/excalidraw/scripts/search.py'
```

## Directory Structure

```
excalidraw/
├── SKILL.md                    # 📘 Primary agent guide (READ THIS FIRST!)
├── README.md                   # This file (user overview)
├── excalidraw.md       # Comprehensive reference guide
├── CHANGELOG.md                # Version history
├── STRUCTURE.md                # Directory organization
├── data/                       # 🔍 CSV data files (queryable with search.py)
│   ├── patterns.csv            # Diagram patterns (3-tier, microservices, etc.)
│   ├── components.csv          # Reusable components (API, DB, cache)
│   ├── colors.csv              # Semantic color palettes
│   ├── spacing.csv             # Layout spacing rules
│   └── best-practices.csv      # Design guidelines
├── scripts/                    # 🚀 Node.js & Python tools
│   ├── excalidraw.js           # Main CLI tool (Node.js)
│   ├── diagram-manager.js      # Core diagram state management
│   ├── ipc-bridge-loader.js    # Direct IPC bridge communication
│   ├── analyzer.py             # Quality analysis engine (Python)
│   └── search.py               # BM25 search (Python)
├── templates/                  # Copy-paste ready templates
│   └── 3-tier-architecture.md  # Markdown template
├── tests/                      # 🧪 Test suites
│   ├── test_analyzer.py        # Quality analysis tests (23 tests)
│   ├── test_search.py          # BM25 search tests (26 tests)
│   ├── test_browser_integration.py  # Browser tests (14 tests)
│   ├── test_export.py          # Export tests (5 tests)
│   ├── test_export_simple.sh   # Quick validation
│   └── run_tests.sh            # Master test runner
└── .archive/                   # Development history (not loaded)
```

## Core Commands

### Session Management

```bash
node scripts/excalidraw.js init         # Initialize diagram (opens preview panel)
node scripts/excalidraw.js clear        # Clear the canvas
node scripts/excalidraw.js get          # Get all elements as JSON
```

**Architecture**: The Node.js CLI communicates directly with AionUi's preview panel via Electron IPC (ipcRenderer), enabling real-time diagram updates (~50ms latency).

### Element Creation

```bash
node scripts/excalidraw.js add-shape [options]   # Create rectangle/ellipse/diamond
node scripts/excalidraw.js add-text [options]    # Create text element
node scripts/excalidraw.js add-arrow [options]   # Create arrow/line
node scripts/excalidraw.js add-frame [options]   # Create frame container
```

### Relationships

```bash
node scripts/excalidraw.js link-text <shape-id> <text-id>           # Link text to shape
node scripts/excalidraw.js bind-arrow <arrow-id> <from-id> <to-id>  # Bind arrow to shapes
```

### Visual Feedback

```bash
node scripts/excalidraw.js snapshot             # Capture full snapshot (PNG + metadata)
node scripts/excalidraw.js get-state            # Get metadata (fast, no image)
node scripts/excalidraw.js analyze              # Analyze quality (0-100 score)
```

### Export

```bash
node scripts/excalidraw.js export-excalidraw -o <file>   # Export as .excalidraw (editable)
node scripts/excalidraw.js export-png -o <file>          # Export as PNG image
```

### Utilities

```bash
node scripts/excalidraw.js delete <id>          # Delete element
node scripts/excalidraw.js template <name>      # Run template
node scripts/excalidraw.js help                 # Show all commands
```

## Visual Feedback Workflow

The skill now supports quality analysis, self-correction, and export:

```bash
# 1. Create diagram
node scripts/excalidraw.js init
# ... add elements ...

# 2. Analyze quality
node scripts/excalidraw.js analyze
# Output: Score: 75/100 (Grade: C)
# Issues: Small text, inconsistent spacing

# 3. Fix issues and re-analyze
# ... adjust based on feedback ...
node scripts/excalidraw.js analyze
# Output: Score: 88/100 (Grade: B) - Good quality!

# 4. Export final diagram
node scripts/excalidraw.js export-excalidraw -o diagram.excalidraw
node scripts/excalidraw.js export-png -o diagram.png
```

## Color Palettes

Use semantic palettes with `--palette` flag:

### System Architecture

- **frontend**: Blue (`#a5d8ff` / `#1971c2`) - User-facing components
- **backend**: Green (`#b2f2bb` / `#2f9e44`) - Processing logic
- **database**: Red (`#ffc9c9` / `#c92a2a`) - Persistent storage
- **cache**: Purple (`#d0bfff` / `#6741d9`) - Temporary storage
- **queue**: Orange (`#ffd8a8` / `#e67700`) - Async processing
- **external**: Yellow (`#ffe066` / `#f08c00`) - Third-party services

### Flowchart

- **process**: Teal (`#e3fafc` / `#0c8599`)
- **decision**: Amber (`#fff3bf` / `#f59f00`)
- **start-end**: Green (`#d3f9d8` / `#37b24d`)
- **data**: Blue (`#e7f5ff` / `#1c7ed6`)

## Integration with AionUi

This skill is designed to work seamlessly within AionUi:

### How It Works

1. **IPC Bridge**: Python CLI communicates with AionUi via a Node.js IPC helper (`ipc-helper.js`)
2. **Preview Panel**: Diagrams are rendered in AionUi's ExcalidrawEditor component
3. **Real-time Updates**: Each command immediately updates the preview (~50ms)
4. **Workspace Integration**: Files are automatically saved to conversation workspace
5. **No Browser Required**: Everything happens within AionUi

### Workflow

```
Python CLI (excalidraw.py)
    ↓ JSON-RPC
Node.js Helper (ipc-helper.js)
    ↓ IPC Bridge
AionUi Main Process
    ↓ Event
Preview Panel → ExcalidrawEditor
```

### Benefits

- **Seamless**: No browser switching
- **Fast**: Direct JSON manipulation
- **Offline**: No external dependencies
- **Integrated**: Diagrams saved to conversation workspace
- **Editable**: Preview panel allows manual adjustments

## Documentation

- **📘 SKILL.md**: **Primary agent guide** - Start here!
  - IPC-based workflow
  - Essential commands with examples
  - Common patterns (3-tier, search-driven, quality-driven)
  - Copy-paste ready code
- **excalidraw.md**: Comprehensive reference guide
  - Data-driven workflow with BM25 search
  - Visual feedback system
  - Semantic color system
  - Professional diagram rules
- **CHANGELOG.md**: Version history (1.0 → 3.0)
- **STRUCTURE.md**: Directory organization
- **data/\*.csv**: Queryable pattern database (use `search.py` to query)

## Key Features

### 1. Data-Driven Approach

- **BM25 Search**: Query pattern database instead of reading docs
- **CSV Data Layer**: 90% token reduction vs markdown
- **Auto-Domain Detection**: Automatically finds relevant data
- **Top 3 Results**: Token-optimal output

### 2. Visual Feedback System (NEW!)

- **Quality Scoring**: 0-100 scores with letter grades (A-F)
- **Issue Detection**: Overlaps, alignment, spacing, text size
- **Actionable Suggestions**: Specific fixes for each issue
- **Iterative Improvement**: Create → Analyze → Refine loop

### 3. Why This Approach?

1. **Token Efficient**: Query returns only relevant data
2. **Self-Validating**: Agent can verify its own work
3. **Consistent Results**: Deterministic output quality
4. **Easy Maintenance**: Update CSV, not scattered files
5. **Progressive Disclosure**: Query only what you need

## Example: Create 3-Tier Architecture

```bash
# 1. Search for pattern
python3 scripts/search.py "3-tier architecture"
# Returns: layout=vertical-layers, spacing=150px

# 2. Initialize
node scripts/excalidraw.js init

# 3. Create layers with 150px spacing
node scripts/excalidraw.js add-frame --name "Presentation" --x 50 --y 50 --width 700 --height 180
node scripts/excalidraw.js add-frame --name "Business Logic" --x 50 --y 280 --width 700 --height 180
node scripts/excalidraw.js add-frame --name "Data" --x 50 --y 510 --width 700 --height 180

# 4. Add components with semantic colors
node scripts/excalidraw.js add-shape --type rectangle --id "web" --x 120 --y 110 --width 180 --height 100 --palette frontend
node scripts/excalidraw.js add-text --text "Web App" --x 170 --y 145 --container-id "web"
node scripts/excalidraw.js link-text web web-text

# 5. Analyze quality
node scripts/excalidraw.js analyze
```

## Tips

1. **Query before creating**: Use search.py to get correct spacing, colors, sizes
2. **Use semantic palettes**: `--palette frontend` instead of raw hex colors
3. **Analyze often**: Check quality during creation, not just at the end
4. **Follow suggestions**: The analyzer provides actionable fixes
5. **Aim for 85+ score**: Indicates professional quality

## Troubleshooting

**Command not found?**

- Use `node scripts/excalidraw.js` with full path

**Arrows not connecting?**

- Use `bind-arrow` command after creating arrow and shapes

**Text not appearing in shape?**

- Use `link-text` command after creating both elements

**Low quality score?**

- Run `analyze` to see specific issues and suggestions
- Fix issues and re-analyze until score ≥ 85

## Dependencies

- `agent-browser` CLI tool for browser automation
- Python 3.8+ with `rank-bm25` package
- Access to excalidraw.com

## Getting Help

```bash
node scripts/excalidraw.js help          # Show command summary
node scripts/excalidraw.js --version     # Show CLI version
python3 scripts/search.py "help"            # Test search functionality
```

For complete documentation, see `excalidraw.md`.

## What's New

### v2.1 - Export Capabilities

- ✅ Export as .excalidraw files (editable format)
- ✅ Export as PNG images (static format)
- ✅ Complete workflow: create → analyze → export
- ✅ Integration with templates and visual feedback

### v2.0 - Visual Feedback System

- ✅ Quality analysis with 0-100 scoring
- ✅ Automatic issue detection (6 dimensions)
- ✅ Actionable suggestions
- ✅ Snapshot capture (PNG + metadata)
- ✅ Fast metadata queries
- ✅ Self-correction workflow

### v1.0 - Data-Driven Foundation

- ✅ Python CLI (cross-platform)
- ✅ BM25 search for pattern discovery
- ✅ CSV data layer (token-efficient)
- ✅ Semantic color palettes
- ✅ Queryable pattern database

## License

Part of AionUi project (Apache-2.0)
