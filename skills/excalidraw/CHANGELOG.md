# Changelog

All notable changes to the excalidraw skill.

## [2.1.0] - 2026-02-11

### Added - Export Feature

**Commands**:

- `export-excalidraw -o <file>` - Export diagram as .excalidraw JSON (editable)
- `export-png -o <file>` - Export diagram as PNG image (static)

**Browser Functions** (control-script.js):

- `exportExcalidraw()` - Returns Excalidraw v2 JSON format
- `exportPNG()` - Returns base64-encoded PNG data
- Event handlers for `exportExcalidraw` and `exportPNG` actions

**CLI Functions** (excalidraw.py):

- `cmd_export_excalidraw()` - Saves JSON to file, shows metadata
- `cmd_export_png()` - Decodes base64, saves binary PNG

**Documentation**:

- `EXPORT_FEATURE.md` - Complete export documentation
- `EXPORT_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `examples/export-workflow.md` - Step-by-step usage example
- Updated `SKILL.md` - Reflects Python CLI, includes export commands
- Updated `README.md` - Added v2.1 section, export commands
- Updated `excalidraw.md` - Added export to workflows

**Testing**:

- `test_export.py` - Comprehensive integration tests (5 test cases)
- `test_export_simple.sh` - Quick syntax validation

**Benefits**:

- Save diagrams in editable format (.excalidraw)
- Export static images for documentation (PNG)
- Version control with git
- Complete workflow: create → analyze → export

### Changed

**SKILL.md**:

- Completely rewritten for simplicity and agent-friendliness
- Removed bash CLI references (now Python-only)
- Added export commands
- Simplified to 229 lines (was 303 lines)
- Focus on essential commands and workflow
- Added "Tips for Agents" section
- Added "Common Issues" troubleshooting

**README.md**:

- Added export commands to command list
- Updated Visual Feedback Workflow to include export
- Added v2.1 changelog section

---

## [2.0.0] - 2026-02-10

### Added - Visual Feedback System

**Commands**:

- `snapshot` - Capture full canvas (PNG + metadata)
- `get-state` - Get metadata (fast, no image)
- `analyze` - Quality analysis with 0-100 score

**Browser Functions** (control-script.js):

- `captureSnapshot()` - Captures canvas as PNG + element data
- `getSceneMetadata()` - Returns element counts, bounding box, issues
- `detectQuickIssues()` - Fast issue detection
- `calculateSceneBoundingBox()` - Computes scene bounds
- `elementsOverlap()` - Overlap detection

**Analysis Engine** (analyzer.py):

- `VisualAnalyzer` class with 6-dimension quality checks
- Text readability check (font size ≥12px)
- Spacing consistency check (variance ≤30%)
- Alignment detection (5px tolerance)
- Overlap detection (adjacent elements OK)
- Arrow connection validation
- Visual hierarchy analysis (size variation)
- 0-100 scoring with letter grades (A-F)
- Actionable suggestions

**CLI Commands**:

- `cmd_snapshot()` - Captures and saves snapshot
- `cmd_get_state()` - Gets and displays metadata
- `cmd_analyze()` - Runs quality analysis, shows report

**Testing**:

- `test_analyzer.py` - 23 tests for quality analysis (100% passing)
- `test_browser_integration.py` - 14 browser automation tests (93% passing)
- `test_search.py` - 26 tests for BM25 search (65% passing - CSV data gaps)
- `run_tests.sh` - Master test runner
- `FIXES_APPLIED.md` - Documents test fixes and improvements

**Fixes**:

- Fixed `execute_event()` to capture browser results (Promise-based async)
- Fixed overlap detection to allow adjacent elements (< → ≤)
- Fixed agent-browser command (execute → eval)

### Changed

**excalidraw.py**:

- Added `execute_event()` async result waiting (10s timeout)
- Changed `run_agent_browser('execute')` to `run_agent_browser('eval')`
- Added visual feedback command handlers

**control-script.js**:

- Split from excalidraw.py (was inline, now external file)
- Added visual feedback functions (260 lines)

---

## [1.0.0] - 2026-02-09

### Added - Data-Driven Foundation

**Python CLI**:

- `excalidraw.py` - Complete CLI in Python (643 lines)
- Cross-platform compatibility
- Color palette system (8 palettes)
- Command parsing with argparse

**Search System**:

- `search.py` - BM25 search implementation (170 lines)
- Auto-domain detection
- Top 3 results (token-optimal)
- Queries CSV data files

**Data Layer** (CSV files, 20KB total):

- `patterns.csv` - 9 diagram patterns
- `components.csv` - 17 reusable components
- `colors.csv` - 8 semantic color palettes
- `spacing.csv` - Layout spacing rules
- `best-practices.csv` - Design guidelines

**Templates**:

- `3-tier-architecture.md` - Markdown template (copy-paste ready)
- Converted from bash to markdown format
- Includes pattern info, commands, customization tips

**Documentation**:

- `excalidraw.md` - Comprehensive guide (176 lines)
- `SKILL.md` - Skill metadata and quick reference
- `README.md` - Overview and quick start

**Browser Integration**:

- `control-script.js` - Browser control layer
- CustomEvent-based communication
- Element creation and manipulation
- Relationship management (link-text, bind-arrow)

### Removed

**Bash CLI**:

- Removed `bin/excalidraw` (bash version)
- Converted to Python for cross-platform support

**Scattered References**:

- Removed `references/` directory (68KB)
- Moved data to CSV files (90% token reduction)

**Bash Templates**:

- Removed `templates/*.sh` (16KB)
- Converted to markdown format

**Examples**:

- Removed `examples/` directory (8KB)
- Not essential for agents

**Planning Docs**:

- Archived to `.archive/` directory (64KB)
- Development history preserved

### Changed

**Architecture**:

- Bash → Python CLI
- Scattered markdown → CSV data
- Manual lookup → BM25 search
- Static templates → Dynamic queries

**Token Efficiency**:

- 90% reduction in reference data (CSV vs markdown)
- Query returns only top 3 results
- Progressive disclosure (load only what's needed)

**Workflow**:

- Query-first approach (search before create)
- Data-driven decisions (spacing, colors, layout)
- Semantic palettes (no raw hex codes)

---

## Format

- **[X.Y.Z]** - Version number (semver)
- **YYYY-MM-DD** - Release date
- **Added** - New features
- **Changed** - Changes to existing functionality
- **Removed** - Removed features
- **Fixed** - Bug fixes

## Version History

- **2.1.0** (2026-02-11) - Export capabilities (.excalidraw + PNG)
- **2.0.0** (2026-02-10) - Visual feedback system (analyze, snapshot, quality scoring)
- **1.0.0** (2026-02-09) - Data-driven foundation (Python CLI, BM25 search, CSV data)
