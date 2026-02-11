---
name: excalidraw
description: Create professional architecture diagrams, flowcharts, and system designs as .excalidraw JSON files on disk. Use when creating system architecture diagrams, flowcharts, sequence diagrams, or any technical diagram. Supports quality analysis, semantic colors, and exports to .excalidraw format. Every command requires --file to specify the target file.
allowed-tools: Bash(node:*)
---

# Diagram Creation with Excalidraw

## Core Workflow

Every diagram follows this pattern:

1. **Initialize**: `node scripts/excalidraw.js init --file diagram.excalidraw` (creates file on disk)
2. **Create**: Add shapes, text, arrows with semantic colors
3. **Link**: Connect text to shapes, bind arrows to elements
4. **Analyze**: `node scripts/excalidraw.js analyze --file diagram.excalidraw` (get quality score)
5. **Export**: Save as .excalidraw to a different path if needed

```bash
cd skills/excalidraw

node scripts/excalidraw.js init --file diagram.excalidraw
node scripts/excalidraw.js add-shape --file diagram.excalidraw --type rectangle --id "api" --x 100 --y 100 --width 200 --height 100 --palette backend
node scripts/excalidraw.js add-text --file diagram.excalidraw --text "API Gateway" --x 160 --y 135 --container-id "api"
node scripts/excalidraw.js link-text --file diagram.excalidraw api api-text
node scripts/excalidraw.js analyze --file diagram.excalidraw
# Output: Score: 95/100 (Grade: A)

node scripts/excalidraw.js export-excalidraw --file diagram.excalidraw -o output.excalidraw
```

## Essential Commands

Every command requires `--file <path>` to specify the .excalidraw file.

```bash
# Session
node scripts/excalidraw.js init --file diagram.excalidraw            # Create new diagram file
node scripts/excalidraw.js clear --file diagram.excalidraw           # Clear canvas
node scripts/excalidraw.js get --file diagram.excalidraw             # Get all elements as JSON

# Create shapes
node scripts/excalidraw.js add-shape --file diagram.excalidraw --type rectangle --id "box1" --x 100 --y 100 --width 200 --height 100 --palette backend
node scripts/excalidraw.js add-shape --file diagram.excalidraw --type ellipse --id "circle" --x 400 --y 100 --width 150 --height 150 --palette frontend
node scripts/excalidraw.js add-shape --file diagram.excalidraw --type diamond --id "decision" --x 700 --y 100 --width 180 --height 120 --palette external

# Create text
node scripts/excalidraw.js add-text --file diagram.excalidraw --text "API Service" --x 160 --y 135 --container-id "box1"
node scripts/excalidraw.js add-text --file diagram.excalidraw --text "Database" --x 450 --y 160 --size 18

# Create arrows
node scripts/excalidraw.js add-arrow --file diagram.excalidraw --id "flow" --x 300 --y 150 --points "[[0,0],[100,0]]"

# Create frames (containers)
node scripts/excalidraw.js add-frame --file diagram.excalidraw --name "Backend Services" --x 50 --y 50 --width 700 --height 300

# Link elements (establishes relationships)
node scripts/excalidraw.js link-text --file diagram.excalidraw box1 box1-text      # Link text to shape
node scripts/excalidraw.js bind-arrow --file diagram.excalidraw flow box1 circle   # Bind arrow to shapes

# Visual feedback
node scripts/excalidraw.js analyze --file diagram.excalidraw              # Quality analysis (0-100 score)
node scripts/excalidraw.js snapshot --file diagram.excalidraw             # Capture metadata
node scripts/excalidraw.js get-state --file diagram.excalidraw            # Get metadata (fast)

# Export
node scripts/excalidraw.js export-excalidraw --file diagram.excalidraw -o output.excalidraw  # Editable format

# Utilities
node scripts/excalidraw.js delete --file diagram.excalidraw box1          # Delete element by ID
node scripts/excalidraw.js help                                           # Show all commands
```

## Common Patterns

### 3-Tier Architecture

```bash
cd skills/excalidraw
node scripts/excalidraw.js init --file architecture.excalidraw

# Presentation Layer
node scripts/excalidraw.js add-frame --file architecture.excalidraw --name "Presentation" --x 50 --y 50 --width 700 --height 180
node scripts/excalidraw.js add-shape --file architecture.excalidraw --type rectangle --id "web" --x 120 --y 110 --width 180 --height 100 --palette frontend
node scripts/excalidraw.js add-text --file architecture.excalidraw --text "Web App" --x 170 --y 145 --container-id "web"
node scripts/excalidraw.js link-text --file architecture.excalidraw web web-text

# Business Layer
node scripts/excalidraw.js add-frame --file architecture.excalidraw --name "Business Logic" --x 50 --y 280 --width 700 --height 180
node scripts/excalidraw.js add-shape --file architecture.excalidraw --type rectangle --id "api" --x 120 --y 340 --width 180 --height 100 --palette backend
node scripts/excalidraw.js add-text --file architecture.excalidraw --text "API Gateway" --x 160 --y 375 --container-id "api"
node scripts/excalidraw.js link-text --file architecture.excalidraw api api-text

# Data Layer
node scripts/excalidraw.js add-frame --file architecture.excalidraw --name "Data" --x 50 --y 510 --width 700 --height 180
node scripts/excalidraw.js add-shape --file architecture.excalidraw --type rectangle --id "db" --x 120 --y 570 --width 180 --height 100 --palette database
node scripts/excalidraw.js add-text --file architecture.excalidraw --text "PostgreSQL" --x 165 --y 605 --container-id "db"
node scripts/excalidraw.js link-text --file architecture.excalidraw db db-text

# Connect layers
node scripts/excalidraw.js add-arrow --file architecture.excalidraw --id "arrow1" --x 210 --y 210 --points "[[0,0],[0,130]]"
node scripts/excalidraw.js bind-arrow --file architecture.excalidraw arrow1 web api
node scripts/excalidraw.js add-arrow --file architecture.excalidraw --id "arrow2" --x 210 --y 440 --points "[[0,0],[0,130]]"
node scripts/excalidraw.js bind-arrow --file architecture.excalidraw arrow2 api db

# Analyze and export
node scripts/excalidraw.js analyze --file architecture.excalidraw
node scripts/excalidraw.js export-excalidraw --file architecture.excalidraw -o architecture-final.excalidraw
```

### Data-Driven Approach (BM25 Search)

```bash
cd skills/excalidraw

# Search for diagram patterns first
python3 scripts/search.py "microservices architecture"
# Output: layout=radial-hub, spacing=80px, components=[gateway, services, database]

# Search for component specs
python3 scripts/search.py "API gateway component"
# Output: width=180, height=100, palette=backend, semantic_meaning="Processing logic"

# Use search results to create diagram
node scripts/excalidraw.js init --file microservices.excalidraw
node scripts/excalidraw.js add-shape --file microservices.excalidraw --type rectangle --id "gateway" --x 400 --y 300 --width 180 --height 100 --palette backend
# ... use spacing=100px for other services
```

### Quality-Driven Workflow

```bash
cd skills/excalidraw
node scripts/excalidraw.js init --file quality-demo.excalidraw

# Create initial diagram
node scripts/excalidraw.js add-shape --file quality-demo.excalidraw --type rectangle --id "service1" --x 100 --y 100 --width 150 --height 80 --palette backend
node scripts/excalidraw.js add-shape --file quality-demo.excalidraw --type rectangle --id "service2" --x 350 --y 120 --width 150 --height 80 --palette backend

# Analyze quality
node scripts/excalidraw.js analyze --file quality-demo.excalidraw
# Output: Score: 72/100 (Grade: C)

# Fix issues based on feedback
node scripts/excalidraw.js delete --file quality-demo.excalidraw service2
node scripts/excalidraw.js add-shape --file quality-demo.excalidraw --type rectangle --id "service2" --x 300 --y 100 --width 150 --height 80 --palette backend
node scripts/excalidraw.js add-text --file quality-demo.excalidraw --text "Service A" --x 145 --y 130 --size 18 --container-id "service1"

# Re-analyze
node scripts/excalidraw.js analyze --file quality-demo.excalidraw
# Output: Score: 88/100 (Grade: B) - Good quality!

# Export when score >= 85
node scripts/excalidraw.js export-excalidraw --file quality-demo.excalidraw -o final.excalidraw
```

### Using Templates

```bash
cd skills/excalidraw

# View template (copy-paste ready commands)
cat templates/3-tier-architecture.md

# Or use template directly
node scripts/excalidraw.js template 3-tier-architecture
```

## Color Palettes (Semantic)

Use `--palette` flag for consistent, meaningful colors:

```bash
--palette frontend    # Blue - User interfaces (web apps, mobile)
--palette backend     # Green - APIs, services, business logic
--palette database    # Red - Data storage (SQL, NoSQL)
--palette cache       # Purple - Temporary storage (Redis, Memcached)
--palette queue       # Orange - Message queues, async processing
--palette external    # Yellow - Third-party services, APIs
--palette actor       # Gray - External systems, users
--palette neutral     # White - Containers, backgrounds
```

Colors automatically set background and stroke for visual consistency.

## Element Lifecycle (Important)

IDs are required for linking and binding. Always assign IDs when elements will be referenced:

```bash
# Create shape with ID
node scripts/excalidraw.js add-shape --file diagram.excalidraw --type rectangle --id "api" --x 100 --y 100 --width 200 --height 100

# Create text with container-id
node scripts/excalidraw.js add-text --file diagram.excalidraw --text "API" --x 160 --y 135 --container-id "api"

# Link text to shape (bidirectional relationship)
node scripts/excalidraw.js link-text --file diagram.excalidraw api api-text

# Create arrow with ID
node scripts/excalidraw.js add-arrow --file diagram.excalidraw --id "flow" --x 300 --y 150 --points "[[0,0],[100,0]]"

# Bind arrow to shapes (bidirectional relationships)
node scripts/excalidraw.js bind-arrow --file diagram.excalidraw flow api database
```

**Without IDs**: Elements are created but cannot be linked or bound.
**Text auto-ID**: When `--container-id` is used, text ID is auto-generated as `<container-id>-text`.

## Layout Guidelines

**Coordinate System**: Origin (0,0) is top-left, X→right, Y→down

**Standard Sizes**:

- Small component: 140x80
- Medium component: 180x100 (recommended)
- Large component: 240x120

**Standard Spacing**:

- Between components: 100px
- Between layers: 150px
- Frame padding: 50px
- Use 50px grid for alignment

## Deep-Dive Documentation

| Reference                      | When to Use                                       |
| ------------------------------ | ------------------------------------------------- |
| [excalidraw.md](excalidraw.md) | Complete guide with patterns and best practices   |
| [CHANGELOG.md](CHANGELOG.md)   | Version history and feature additions (1.0 → 5.0) |
| [STRUCTURE.md](STRUCTURE.md)   | Directory structure and organization              |

## Ready-to-Use Templates

| Template                                                             | Description                                 |
| -------------------------------------------------------------------- | ------------------------------------------- |
| [templates/3-tier-architecture.md](templates/3-tier-architecture.md) | Layered web architecture (copy-paste ready) |

```bash
cd skills/excalidraw

# View template commands (copy-paste ready)
cat templates/3-tier-architecture.md
```

## Pattern Search (Data-Driven)

Query CSV database for patterns, components, spacing, and best practices:

```bash
cd skills/excalidraw

# Search patterns
python3 scripts/search.py "microservices architecture"
python3 scripts/search.py "flowchart decision"
python3 scripts/search.py "sequence diagram"

# Search components
python3 scripts/search.py "API gateway"
python3 scripts/search.py "SQL database"
python3 scripts/search.py "message queue"

# Search colors
python3 scripts/search.py "frontend color"
python3 scripts/search.py "database palette"

# Search spacing rules
python3 scripts/search.py "spacing between layers"
python3 scripts/search.py "component horizontal spacing"

# Search best practices
python3 scripts/search.py "spacing consistency"
python3 scripts/search.py "color semantic"
```

Returns top 3 results with exact specs (dimensions, colors, spacing).

## Testing

```bash
cd skills/excalidraw

# Quick validation (no browser needed)
bash tests/test_export_simple.sh

# Run all unit tests
bash tests/run_tests.sh

# Individual test suites
python3 tests/test_analyzer.py     # Quality analysis (23 tests)
python3 tests/test_search.py       # BM25 search (26 tests)

# Browser integration tests (requires manual interaction)
python3 tests/test_browser_integration.py
python3 tests/test_export.py
```

## Tips for Effective Diagrams

1. **Search first**: Query patterns/spacing before creating
2. **Use semantic palettes**: `--palette backend` not raw colors
3. **Always link**: Use `link-text` and `bind-arrow` for relationships
4. **Analyze often**: Check quality during creation (aim for 85+ score)
5. **Export**: .excalidraw (editable) for sharing
6. **Use consistent spacing**: Stick to 100px or 150px grid
7. **Assign IDs strategically**: ID elements you'll reference later

## Common Issues

**"--file <path> is required"**
→ Every command requires `--file` to specify the target .excalidraw file

**"File not found"**
→ Run `init --file <path>` first to create a new diagram file

**Text not appearing in shape**
→ Use `link-text --file <path> <shape-id> <text-id>` after creating both elements

**Arrow not connected to shapes**
→ Use `bind-arrow --file <path> <arrow-id> <from-id> <to-id>` after creating arrow and shapes

**Low quality score (<85)**
→ Run `analyze --file <path>` to see specific issues, follow suggestions, re-analyze

## How It Works

The CLI reads and writes `.excalidraw` JSON files directly on disk using Node.js `fs`. Each command:

1. Reads the file from disk
2. Modifies the in-memory diagram
3. Writes the updated JSON back to disk

This means the file is always up-to-date after each command. You can open the `.excalidraw` file in any Excalidraw-compatible viewer (including AionUi's preview panel) to see the result.
