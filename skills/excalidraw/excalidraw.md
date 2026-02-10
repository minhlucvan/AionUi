# Excalidraw Diagram Creation Skill

## Core Capabilities

Create professional diagrams using the `excalidraw` CLI tool:

- Architecture diagrams (3-tier, microservices, client-server)
- Flowcharts (linear, branching, decision trees)
- Sequence diagrams (request-response, message flow)
- Data-driven pattern search (BM25 algorithm)

## Prerequisites

Python 3.8+ is required for both the CLI tool and search functionality:

```bash
python3 --version  # Should show 3.8+
pip install rank-bm25  # Install search dependency
```

## Design Workflow

### Basic Workflow

1. **Identify diagram type** - Use pattern search: `python3 scripts/search.py "3-tier architecture"`
2. **Initialize Excalidraw** - Run: `python3 scripts/excalidraw.py init`
3. **Choose color palette** - Query: `python3 scripts/search.py "frontend color"`
4. **Select components** - Query: `python3 scripts/search.py "API component"`
5. **Apply spacing rules** - Query: `python3 scripts/search.py "spacing between layers"`
6. **Create elements** - Use CLI: `python3 scripts/excalidraw.py add-shape --palette backend ...`
7. **Link relationships** - Use: `python3 scripts/excalidraw.py link-text shape-id text-id`
8. **Verify quality** - Check against checklist below

### Visual Feedback Workflow (Recommended)

For higher quality diagrams, use the visual feedback loop:

1. **Create initial diagram** - Follow basic workflow steps 1-7
2. **Analyze quality** - Run: `python3 scripts/excalidraw.py analyze`
   - Get scored report (0-100)
   - Review issues and warnings
   - Read suggestions
3. **Iterate and improve** - Fix issues based on feedback
4. **Re-analyze** - Run analyze again until score ≥ 85
5. **Export final diagram** - Save in multiple formats:
   ```bash
   python3 scripts/excalidraw.py export-excalidraw -o diagram.excalidraw
   python3 scripts/excalidraw.py export-png -o diagram.png
   ```

**Benefits**:

- Objective quality scores
- Automatic issue detection (overlaps, alignment, spacing)
- Actionable suggestions
- Consistent professional results
- Multiple export formats (editable + image)

## Available Search Domains

| Domain    | Description                    | Example Query                |
| --------- | ------------------------------ | ---------------------------- |
| pattern   | Diagram patterns and templates | "microservices architecture" |
| component | Reusable component types       | "API gateway component"      |
| color     | Semantic color system          | "database color palette"     |
| spacing   | Layout spacing rules           | "spacing between layers"     |
| rule      | Best practices and guidelines  | "spacing between components" |

Auto-detection available - just search without specifying domain.

## Professional Diagram Rules

**Before finalizing, verify these are followed:**

✓ Colors indicate function (blue=frontend, green=backend, red=database)
✓ Consistent spacing throughout (use 50px grid)
✓ No crossing arrows (rearrange layout if needed)
✓ Text size ≥ 12px (18-20px for component names)
✓ Larger shapes for more important elements
✓ Labels are concise (2-3 words max)
✓ Arrows are labeled (HTTP, SQL, etc.)
✓ Layout follows reading flow (left-to-right or top-to-bottom)

## Pre-Delivery Checklist

- [ ] All text readable at 100% zoom
- [ ] Color palette used semantically (not arbitrarily)
- [ ] Spacing consistent (verified with spacing rules)
- [ ] Visual hierarchy clear (size indicates importance)
- [ ] Connections labeled and unambiguous
- [ ] No elements overlapping unintentionally
- [ ] Layout pattern matches diagram type

## Example Workflow

**Goal**: Create a 3-tier architecture diagram

### Option 1: Use Template (Recommended)

```bash
# View complete template with all commands
cat templates/3-tier-architecture.md

# Copy commands from template and execute
# Template includes: layers, components, connections, and customization tips
```

### Option 2: Build from Scratch

```bash
# 1. Search for pattern
python3 scripts/search.py "3-tier architecture"
# Output: name=3-Tier Architecture, layout=vertical-layers, spacing=150px

# 2. Initialize
python3 scripts/excalidraw.py init

# 3. Query components and colors
python3 scripts/search.py "frontend component"
# Output: palette=frontend, width=180, height=100

# 4. Create layers
python3 scripts/excalidraw.py add-frame --name "Presentation" --x 50 --y 50 --width 700 --height 180
python3 scripts/excalidraw.py add-frame --name "Business Logic" --x 50 --y 380 --width 700 --height 180
python3 scripts/excalidraw.py add-frame --name "Data" --x 50 --y 710 --width 700 --height 180

# 5. Add components (using queried data)
python3 scripts/excalidraw.py add-shape --type rectangle --palette frontend --x 120 --y 110 --width 180 --height 100 --id "web"
python3 scripts/excalidraw.py add-text --text "Web App" --x 170 --y 145 --container-id "web"
python3 scripts/excalidraw.py link-text web web-text

# 6. Connect layers (150px spacing from pattern)
python3 scripts/excalidraw.py add-arrow --id arrow1 --x 210 --y 210 --points "[[0,0],[0,230]]"
python3 scripts/excalidraw.py bind-arrow arrow1 web api-gateway

# 7. Analyze quality
python3 scripts/excalidraw.py analyze
```

## Tips for Better Results

1. **Query before creating**: Use search to find correct spacing, colors, sizes
2. **Use semantic palettes**: `--palette frontend` instead of `--bg "#a5d8ff"`
3. **Reference patterns**: Copy structure from search results
4. **Follow spacing rules**: Query "spacing" to get exact pixel values
5. **Verify rules**: Check against Professional Diagram Rules section
6. **Iterate**: Create, review, adjust based on checklist

## CLI Quick Reference

```bash
# Session
python3 scripts/excalidraw.py init                  # Initialize session
python3 scripts/excalidraw.py clear                 # Clear canvas

# Elements
python3 scripts/excalidraw.py add-shape --palette <name> --x <n> --y <n> --width <n> --height <n>
python3 scripts/excalidraw.py add-text --text "<text>" --x <n> --y <n> --container-id <id>
python3 scripts/excalidraw.py add-arrow --x <n> --y <n> --points "[[0,0],[100,0]]"

# Relationships
python3 scripts/excalidraw.py link-text <shape-id> <text-id>
python3 scripts/excalidraw.py bind-arrow <arrow-id> <from-id> <to-id>

# Visual Feedback
python3 scripts/excalidraw.py snapshot              # Capture snapshot (PNG + metadata)
python3 scripts/excalidraw.py get-state             # Get metadata (fast, no image)
python3 scripts/excalidraw.py analyze               # Analyze quality (0-100 score)

# Export
python3 scripts/excalidraw.py export-excalidraw -o <file>  # Export as .excalidraw (editable)
python3 scripts/excalidraw.py export-png -o <file>         # Export as PNG image

# Search
python3 scripts/search.py "<query>" [domain]
```

## Data Files Reference

All data stored in CSV format for token efficiency:

- `data/patterns.csv` - Diagram patterns (arch, flow, sequence)
- `data/components.csv` - Reusable components (API, DB, cache)
- `data/colors.csv` - Semantic color palettes
- `data/spacing.csv` - Layout spacing rules
- `data/best-practices.csv` - Design guidelines

Query these with search.py instead of reading files directly.

## Semantic Color System

The color palettes have specific meanings:

- **Frontend Blue** (`frontend`) - User-facing components (web, mobile, desktop apps)
- **Backend Green** (`backend`) - Processing logic (APIs, services, business logic)
- **Database Red** (`database`) - Persistent storage (SQL, NoSQL, warehouses)
- **Cache Purple** (`cache`) - Temporary storage (Redis, Memcached, CDN)
- **Queue Orange** (`queue`) - Async processing (message queues, event bus)
- **External Yellow** (`external`) - Third-party services (APIs, SaaS)
- **Actor Gray** (`actor`) - External entities (users, systems)
- **Neutral White** (`neutral`) - Containers and backgrounds

## Common Patterns

### 3-Tier Architecture

- **Layout**: Vertical layers
- **Spacing**: 150px between layers
- **Components**: Frontend (top) → Backend (middle) → Database (bottom)
- **Use**: Traditional web applications

### Microservices

- **Layout**: Radial hub (gateway center, services around)
- **Spacing**: 80px between services
- **Components**: API Gateway + multiple Backend services
- **Use**: Distributed systems

### Linear Flowchart

- **Layout**: Vertical flow
- **Spacing**: 100px between steps
- **Components**: Start → Process → Process → End
- **Use**: Simple workflows

### Sequence Diagram

- **Layout**: Horizontal timeline
- **Spacing**: 240px between participants
- **Components**: Actors at top, messages flowing between
- **Use**: API calls, auth flows

## Troubleshooting

**Search returns no results**:

- Try broader keywords ("API" instead of "REST API Gateway")
- Check domain is correct or let auto-detect handle it
- Verify CSV files exist in `data/` directory

**Colors look wrong**:

- Use semantic palettes (`--palette frontend`) not raw hex
- Query color domain to verify palette names
- Check color-semantic rule in best practices

**Layout looks messy**:

- Query spacing rules and apply consistently
- Align to 50px grid (all coordinates divisible by 50)
- Use frames to group related components
- Minimize arrow crossings by rearranging

**Text too small**:

- Minimum 12px for body text
- 18-20px for component names
- Query typography rules for guidance

## Advanced Usage

### Batch Component Creation

```bash
# Query once, use multiple times
python3 scripts/search.py "backend component" --json > components.json

# Parse and create multiple components
# (use jq or similar to extract dimensions)
```

### Template Customization

Templates in `templates/` use search.py to query data dynamically.
Copy and modify for custom diagram types.

### Data Extension

Add rows to CSV files to expand pattern library:

- New diagram patterns → `patterns.csv`
- Custom components → `components.csv`
- Brand colors → `colors.csv` (keep semantic meaning)
- Project spacing → `spacing.csv`
- Team rules → `best-practices.csv`

Search will automatically include new entries.

## Performance Notes

- **CSV queries** - Fast, typically <50ms
- **BM25 search** - Returns top 3 results only (token-optimal)
- **Auto-domain detection** - Minimal overhead
- **Token usage** - 90% reduction vs reading full reference docs

## Integration Examples

### With Templates

```bash
# Run architecture template (uses search internally)
python3 templates/architecture-diagram.py

# Or use bash template (legacy)
bash templates/architecture-diagram.sh
```

### Direct CLI Usage

```bash
# Traditional approach (manual values)
python3 scripts/excalidraw.py add-shape --bg "#a5d8ff" --stroke "#1971c2" --width 180 --height 100

# Data-driven approach (query first)
python3 scripts/search.py "frontend component"
# → Use returned values for --palette, --width, --height
```

### JSON Output Mode

```bash
# Get structured data for scripting
python3 scripts/search.py "microservices" pattern --json

# Output:
# {
#   "query": "microservices",
#   "domain": "pattern",
#   "results": [
#     {
#       "name": "Microservices Pattern",
#       "layout_pattern": "radial-hub",
#       "spacing": "80px-between-services",
#       ...
#     }
#   ]
# }
```

## Localization

This guide is available in multiple languages:

- English: `excalidraw.md`
- Chinese: `excalidraw.zh-CN.md` (if available)

CSV data files are language-neutral (technical terms).

## Support

For issues or questions:

1. Check Prerequisites section (Python, rank-bm25 installed)
2. Verify CSV files exist in `data/` directory
3. Test search: `python3 scripts/search.py "test"`
4. Check CLI tool: `excalidraw --version`

## Credits

Inspired by ui-ux-pro-max skill patterns:

- CSV-based data structure
- BM25 search algorithm
- Token-efficient design
- Single comprehensive guide approach
