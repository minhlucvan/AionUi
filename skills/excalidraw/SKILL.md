---
name: excalidraw
description: Create professional architecture diagrams, flowcharts, and system designs with visual feedback and export capabilities. Use when creating system architecture diagrams, flowcharts, sequence diagrams, or any technical diagram. Supports quality analysis, semantic colors, and exports to .excalidraw and PNG formats.
allowed-tools: Bash(python3:*)
---

# Diagram Creation with Excalidraw

## Core Workflow

Every diagram follows this pattern:

1. **Initialize**: `python3 scripts/excalidraw.py init` (opens Excalidraw in browser)
2. **Create**: Add shapes, text, arrows with semantic colors
3. **Link**: Connect text to shapes, bind arrows to elements
4. **Analyze**: `python3 scripts/excalidraw.py analyze` (get quality score)
5. **Export**: Save as .excalidraw and PNG

```bash
cd skills/excalidraw

python3 scripts/excalidraw.py init
python3 scripts/excalidraw.py add-shape --type rectangle --id "api" --x 100 --y 100 --width 200 --height 100 --palette backend
python3 scripts/excalidraw.py add-text --text "API Gateway" --x 160 --y 135 --container-id "api"
python3 scripts/excalidraw.py link-text api api-text
python3 scripts/excalidraw.py analyze
# Output: Score: 95/100 (Grade: A)

python3 scripts/excalidraw.py export-excalidraw -o diagram.excalidraw
python3 scripts/excalidraw.py export-png -o diagram.png
```

## Essential Commands

```bash
# Session
python3 scripts/excalidraw.py init            # Open Excalidraw in browser
python3 scripts/excalidraw.py clear           # Clear canvas
python3 scripts/excalidraw.py get             # Get all elements as JSON

# Create shapes
python3 scripts/excalidraw.py add-shape --type rectangle --id "box1" --x 100 --y 100 --width 200 --height 100 --palette backend
python3 scripts/excalidraw.py add-shape --type ellipse --id "circle" --x 400 --y 100 --width 150 --height 150 --palette frontend
python3 scripts/excalidraw.py add-shape --type diamond --id "decision" --x 700 --y 100 --width 180 --height 120 --palette external

# Create text
python3 scripts/excalidraw.py add-text --text "API Service" --x 160 --y 135 --container-id "box1"
python3 scripts/excalidraw.py add-text --text "Database" --x 450 --y 160 --size 18

# Create arrows
python3 scripts/excalidraw.py add-arrow --id "flow" --x 300 --y 150 --points "[[0,0],[100,0]]"

# Create frames (containers)
python3 scripts/excalidraw.py add-frame --name "Backend Services" --x 50 --y 50 --width 700 --height 300

# Link elements (establishes relationships)
python3 scripts/excalidraw.py link-text box1 box1-text      # Link text to shape
python3 scripts/excalidraw.py bind-arrow flow box1 circle   # Bind arrow to shapes

# Visual feedback
python3 scripts/excalidraw.py analyze              # Quality analysis (0-100 score)
python3 scripts/excalidraw.py snapshot             # Capture PNG + metadata
python3 scripts/excalidraw.py get-state            # Get metadata (fast)

# Export
python3 scripts/excalidraw.py export-excalidraw -o diagram.excalidraw  # Editable format
python3 scripts/excalidraw.py export-png -o diagram.png                # Image format

# Utilities
python3 scripts/excalidraw.py delete box1          # Delete element by ID
python3 scripts/excalidraw.py help                 # Show all commands
```

## Common Patterns

### 3-Tier Architecture

```bash
cd skills/excalidraw
python3 scripts/excalidraw.py init

# Presentation Layer
python3 scripts/excalidraw.py add-frame --name "Presentation" --x 50 --y 50 --width 700 --height 180
python3 scripts/excalidraw.py add-shape --type rectangle --id "web" --x 120 --y 110 --width 180 --height 100 --palette frontend
python3 scripts/excalidraw.py add-text --text "Web App" --x 170 --y 145 --container-id "web"
python3 scripts/excalidraw.py link-text web web-text

# Business Layer
python3 scripts/excalidraw.py add-frame --name "Business Logic" --x 50 --y 280 --width 700 --height 180
python3 scripts/excalidraw.py add-shape --type rectangle --id "api" --x 120 --y 340 --width 180 --height 100 --palette backend
python3 scripts/excalidraw.py add-text --text "API Gateway" --x 160 --y 375 --container-id "api"
python3 scripts/excalidraw.py link-text api api-text

# Data Layer
python3 scripts/excalidraw.py add-frame --name "Data" --x 50 --y 510 --width 700 --height 180
python3 scripts/excalidraw.py add-shape --type rectangle --id "db" --x 120 --y 570 --width 180 --height 100 --palette database
python3 scripts/excalidraw.py add-text --text "PostgreSQL" --x 165 --y 605 --container-id "db"
python3 scripts/excalidraw.py link-text db db-text

# Connect layers
python3 scripts/excalidraw.py add-arrow --id "arrow1" --x 210 --y 210 --points "[[0,0],[0,130]]"
python3 scripts/excalidraw.py bind-arrow arrow1 web api
python3 scripts/excalidraw.py add-arrow --id "arrow2" --x 210 --y 440 --points "[[0,0],[0,130]]"
python3 scripts/excalidraw.py bind-arrow arrow2 api db

# Analyze and export
python3 scripts/excalidraw.py analyze
python3 scripts/excalidraw.py export-excalidraw -o architecture.excalidraw
python3 scripts/excalidraw.py export-png -o architecture.png
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

# Search for spacing rules
python3 scripts/search.py "spacing between services"
# Output: min_px=80, recommended_px=100, max_px=150

# Use search results to create diagram
python3 scripts/excalidraw.py init
python3 scripts/excalidraw.py add-shape --type rectangle --id "gateway" --x 400 --y 300 --width 180 --height 100 --palette backend
# ... use spacing=100px for other services
```

### Quality-Driven Workflow

```bash
cd skills/excalidraw
python3 scripts/excalidraw.py init

# Create initial diagram
python3 scripts/excalidraw.py add-shape --type rectangle --id "service1" --x 100 --y 100 --width 150 --height 80 --palette backend
python3 scripts/excalidraw.py add-shape --type rectangle --id "service2" --x 350 --y 120 --width 150 --height 80 --palette backend

# Analyze quality
python3 scripts/excalidraw.py analyze
# Output: Score: 72/100 (Grade: C)
# Issues: Inconsistent spacing, small text, no alignment
# Suggestions: Use consistent spacing (100px), increase font size to 18px, align shapes

# Fix issues based on feedback
python3 scripts/excalidraw.py delete service2
python3 scripts/excalidraw.py add-shape --type rectangle --id "service2" --x 300 --y 100 --width 150 --height 80 --palette backend
python3 scripts/excalidraw.py add-text --text "Service A" --x 145 --y 130 --size 18 --container-id "service1"

# Re-analyze
python3 scripts/excalidraw.py analyze
# Output: Score: 88/100 (Grade: B) - Good quality!

# Export when score >= 85
python3 scripts/excalidraw.py export-excalidraw -o final.excalidraw
python3 scripts/excalidraw.py export-png -o final.png
```

### Using Templates

```bash
cd skills/excalidraw

# View template (copy-paste ready commands)
cat templates/3-tier-architecture.md

# Or use template directly
python3 scripts/excalidraw.py template 3-tier-architecture
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
python3 scripts/excalidraw.py add-shape --type rectangle --id "api" --x 100 --y 100 --width 200 --height 100

# Create text with container-id
python3 scripts/excalidraw.py add-text --text "API" --x 160 --y 135 --container-id "api"

# Link text to shape (bidirectional relationship)
python3 scripts/excalidraw.py link-text api api-text

# Create arrow with ID
python3 scripts/excalidraw.py add-arrow --id "flow" --x 300 --y 150 --points "[[0,0],[100,0]]"

# Bind arrow to shapes (bidirectional relationships)
python3 scripts/excalidraw.py bind-arrow flow api database
```

**Without IDs**: Elements are created but cannot be linked or bound.
**Text auto-ID**: When `--container-id` is used, text ID is auto-generated as `<container-id>-text`.

## Layout Guidelines

**Coordinate System**: Origin (0,0) is top-left, X→right, Y→down

**Standard Sizes**:

- Small component: 140×80
- Medium component: 180×100 (recommended)
- Large component: 240×120

**Standard Spacing**:

- Between components: 100px
- Between layers: 150px
- Frame padding: 50px
- Use 50px grid for alignment

## Deep-Dive Documentation

| Reference                      | When to Use                                       |
| ------------------------------ | ------------------------------------------------- |
| [excalidraw.md](excalidraw.md) | Complete guide with patterns and best practices   |
| [CHANGELOG.md](CHANGELOG.md)   | Version history and feature additions (1.0 → 2.1) |
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
5. **Export both formats**: .excalidraw (editable) + PNG (shareable)
6. **Use consistent spacing**: Stick to 100px or 150px grid
7. **Assign IDs strategically**: ID elements you'll reference later

## Common Issues

**"Excalidraw API not found"**
→ Run `init` command first to open browser

**Text not appearing in shape**
→ Use `link-text <shape-id> <text-id>` after creating both elements

**Arrow not connected to shapes**
→ Use `bind-arrow <arrow-id> <from-id> <to-id>` after creating arrow and shapes

**Low quality score (<85)**
→ Run `analyze` to see specific issues, follow suggestions, re-analyze

**Export files not created**
→ Ensure output directory exists, check file permissions

## Export Output Locations

All export commands require `-o` flag with output path:

```bash
# Export to current directory
python3 scripts/excalidraw.py export-excalidraw -o diagram.excalidraw
python3 scripts/excalidraw.py export-png -o diagram.png

# Export to specific directory
python3 scripts/excalidraw.py export-excalidraw -o ~/Documents/diagrams/api.excalidraw
python3 scripts/excalidraw.py export-png -o ~/Documents/diagrams/api.png

# Export with timestamps
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
python3 scripts/excalidraw.py export-excalidraw -o "backup_${TIMESTAMP}.excalidraw"
python3 scripts/excalidraw.py export-png -o "backup_${TIMESTAMP}.png"
```

Files are saved to specified path. Check command output for confirmation and file size.
