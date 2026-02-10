# Excalidraw Diagram Skill

Create professional diagrams using data-driven patterns with BM25 search and the `excalidraw` CLI tool. Features semantic color palettes, queryable pattern database, visual feedback system, and token-efficient CSV data layer.

## Quick Start

```bash
# 1. Search for pattern (returns dimensions, spacing, colors)
python3 scripts/search.py "3-tier architecture"

# 2. Initialize Excalidraw
python3 scripts/excalidraw.py init

# 3. Create diagram using queried data
python3 scripts/excalidraw.py add-shape --type rectangle --id "api" --x 100 --y 100 --width 200 --height 100 --palette backend
python3 scripts/excalidraw.py add-text --id "api-label" --text "API Gateway" --x 160 --y 135 --container-id "api"
python3 scripts/excalidraw.py link-text api api-label

# 4. Analyze quality (NEW!)
python3 scripts/excalidraw.py analyze
```

Or use a template:

```bash
# View template with copy-paste commands
cat templates/3-tier-architecture.md

# Or execute commands directly from template
```

## Installation

Python 3.8+ is required:

```bash
python3 --version  # Verify Python 3.8+
pip install rank-bm25  # Install search dependency
```

No PATH configuration needed - just call scripts directly.

### Optional: Create Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias excalidraw='python3 ~/.claude/skills/excalidraw/scripts/excalidraw.py'
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
├── scripts/                    # 🐍 Python tools
│   ├── excalidraw.py           # Main CLI tool
│   ├── analyzer.py             # Quality analysis engine
│   ├── search.py               # BM25 search (query CSV data)
│   └── control-script.js       # Browser control layer
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
python3 scripts/excalidraw.py init         # Initialize Excalidraw (required first step)
python3 scripts/excalidraw.py clear        # Clear the canvas
python3 scripts/excalidraw.py get          # Get all elements as JSON
```

### Element Creation

```bash
python3 scripts/excalidraw.py add-shape [options]   # Create rectangle/ellipse/diamond
python3 scripts/excalidraw.py add-text [options]    # Create text element
python3 scripts/excalidraw.py add-arrow [options]   # Create arrow/line
python3 scripts/excalidraw.py add-frame [options]   # Create frame container
```

### Relationships

```bash
python3 scripts/excalidraw.py link-text <shape-id> <text-id>           # Link text to shape
python3 scripts/excalidraw.py bind-arrow <arrow-id> <from-id> <to-id>  # Bind arrow to shapes
```

### Visual Feedback

```bash
python3 scripts/excalidraw.py snapshot             # Capture full snapshot (PNG + metadata)
python3 scripts/excalidraw.py get-state            # Get metadata (fast, no image)
python3 scripts/excalidraw.py analyze              # Analyze quality (0-100 score)
```

### Export

```bash
python3 scripts/excalidraw.py export-excalidraw -o <file>   # Export as .excalidraw (editable)
python3 scripts/excalidraw.py export-png -o <file>          # Export as PNG image
```

### Utilities

```bash
python3 scripts/excalidraw.py delete <id>          # Delete element
python3 scripts/excalidraw.py template <name>      # Run template
python3 scripts/excalidraw.py help                 # Show all commands
```

## Visual Feedback Workflow

The skill now supports quality analysis, self-correction, and export:

```bash
# 1. Create diagram
python3 scripts/excalidraw.py init
# ... add elements ...

# 2. Analyze quality
python3 scripts/excalidraw.py analyze
# Output: Score: 75/100 (Grade: C)
# Issues: Small text, inconsistent spacing

# 3. Fix issues and re-analyze
# ... adjust based on feedback ...
python3 scripts/excalidraw.py analyze
# Output: Score: 88/100 (Grade: B) - Good quality!

# 4. Export final diagram
python3 scripts/excalidraw.py export-excalidraw -o diagram.excalidraw
python3 scripts/excalidraw.py export-png -o diagram.png
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

## Documentation

- **📘 SKILL.md**: **Primary agent guide** - Start here!
  - Agent-browser style workflow
  - Essential commands with examples
  - Common patterns (3-tier, search-driven, quality-driven)
  - Copy-paste ready code
- **excalidraw.md**: Comprehensive reference guide
  - Data-driven workflow with BM25 search
  - Visual feedback system
  - Semantic color system
  - Professional diagram rules
- **CHANGELOG.md**: Version history (1.0 → 2.1)
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
python3 scripts/excalidraw.py init

# 3. Create layers with 150px spacing
python3 scripts/excalidraw.py add-frame --name "Presentation" --x 50 --y 50 --width 700 --height 180
python3 scripts/excalidraw.py add-frame --name "Business Logic" --x 50 --y 280 --width 700 --height 180
python3 scripts/excalidraw.py add-frame --name "Data" --x 50 --y 510 --width 700 --height 180

# 4. Add components with semantic colors
python3 scripts/excalidraw.py add-shape --type rectangle --id "web" --x 120 --y 110 --width 180 --height 100 --palette frontend
python3 scripts/excalidraw.py add-text --text "Web App" --x 170 --y 145 --container-id "web"
python3 scripts/excalidraw.py link-text web web-text

# 5. Analyze quality
python3 scripts/excalidraw.py analyze
```

## Tips

1. **Query before creating**: Use search.py to get correct spacing, colors, sizes
2. **Use semantic palettes**: `--palette frontend` instead of raw hex colors
3. **Analyze often**: Check quality during creation, not just at the end
4. **Follow suggestions**: The analyzer provides actionable fixes
5. **Aim for 85+ score**: Indicates professional quality

## Troubleshooting

**Command not found?**

- Use `python3 scripts/excalidraw.py` with full path

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
python3 scripts/excalidraw.py help          # Show command summary
python3 scripts/excalidraw.py --version     # Show CLI version
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
