# Directory Structure

Clean, organized structure for the excalidraw skill.

## Current Structure

```
excalidraw/
├── README.md                           # Overview and quick start
├── SKILL.md                            # Skill metadata (agent-facing, primary doc)
├── excalidraw.md               # Comprehensive guide
├── CHANGELOG.md                        # Version history (1.0 → 2.1)
├── STRUCTURE.md                        # This file
│
├── data/                               # CSV data files (20KB)
│   ├── patterns.csv                    # 9 diagram patterns
│   ├── components.csv                  # 17 reusable components
│   ├── colors.csv                      # 8 semantic color palettes
│   ├── spacing.csv                     # Layout spacing rules
│   └── best-practices.csv              # Design guidelines
│
├── scripts/                            # Core Python tools
│   ├── excalidraw.py                   # Main CLI (643 lines)
│   ├── analyzer.py                     # Quality analysis (371 lines)
│   ├── search.py                       # BM25 search (170 lines)
│   └── control-script.js               # Browser control (315 lines)
│
├── templates/                          # Copy-paste ready templates
│   └── 3-tier-architecture.md          # Markdown template
│
├── tests/                              # Test suites
│   ├── test_analyzer.py                # Quality analysis tests (23 tests)
│   ├── test_search.py                  # BM25 search tests (26 tests)
│   ├── test_browser_integration.py     # Browser tests (14 tests)
│   ├── test_export.py                  # Export tests (5 tests)
│   ├── test_export_simple.sh           # Quick validation
│   └── run_tests.sh                    # Master test runner
│
└── .archive/                           # Development history (not loaded)
    ├── EXPORT_FEATURE.md               # Export documentation (now in SKILL.md)
    ├── EXPORT_IMPLEMENTATION_SUMMARY.md # Implementation details
    ├── FIXES_APPLIED.md                # Test fixes log
    └── export-workflow.md              # Workflow example (now in SKILL.md)
```

## File Counts

**Core files**: 4 Python + 1 JavaScript + 5 CSV = 10 files
**Documentation**: 5 markdown files (cleaned up!)
**Templates**: 1 template file
**Tests**: 6 test files
**Total active**: 22 files (~95KB)

## Design Principles

### 1. Separation of Concerns

- **scripts/** - Core functionality only
- **tests/** - All tests isolated
- **data/** - Pure data, no logic
- **templates/** - Usage examples
- **docs/** - Documentation at root

### 2. Agent-Friendly

- **SKILL.md** - Primary entry point for agents
- **excalidraw.md** - Complete reference
- **Copy-paste ready** - Templates show exact commands

### 3. Token Efficient

- **CSV over markdown** - 90% reduction in data size
- **BM25 search** - Query returns top 3 results only
- **Progressive disclosure** - Load only what's needed

### 4. Maintainable

- **Clear structure** - Easy to find files
- **Comprehensive tests** - 68 tests total
- **Version controlled** - CHANGELOG.md tracks changes
- **Archived history** - .archive/ preserves evolution

## Import Paths

All test files use consistent import pattern:

```python
# tests/*.py imports scripts/*.py
SCRIPT_DIR = Path(__file__).parent.parent / 'scripts'
sys.path.insert(0, str(SCRIPT_DIR))

from analyzer import VisualAnalyzer
from search import search_domain
```

## Test Organization

```
tests/
├── run_tests.sh                # Master runner
│
├── test_analyzer.py            # Unit tests
├── test_search.py              # Unit tests
│
├── test_browser_integration.py # Integration tests
├── test_export.py              # Integration tests
│
└── test_export_simple.sh       # Quick validation (no browser)
```

**Run all tests**: `bash tests/run_tests.sh`
**Quick test**: `bash tests/test_export_simple.sh`

## CLI Entry Points

```bash
# Main CLI
python3 scripts/excalidraw.py <command> [options]

# Search tool
python3 scripts/search.py "<query>" [domain]

# Tests
bash tests/run_tests.sh
```

## Data Flow

```
User
  ↓
SKILL.md (entry point)
  ↓
scripts/excalidraw.py (CLI)
  ↓ ← scripts/search.py (BM25 query)
  ↓ ← data/*.csv (patterns, colors, spacing)
  ↓
scripts/control-script.js (browser)
  ↓
Excalidraw Web App
  ↓
scripts/analyzer.py (quality check)
  ↓
Export (.excalidraw / PNG)
```

## Size Breakdown

**Data**: 20KB (5 CSV files)
**Scripts**: 52KB (4 files)
**Tests**: 60KB (6 files)
**Docs**: 45KB (8 markdown files)
**Templates**: 8KB (1 file)
**Total**: ~185KB active (excluding .archive/)

## Version History

### v2.1.0 (2026-02-11)

- Added tests/ directory
- Moved all tests from scripts/ to tests/
- Updated import paths in all test files
- Added CHANGELOG.md
- Added STRUCTURE.md (this file)

### v2.0.0 (2026-02-10)

- Added visual feedback system
- Added analyzer.py
- Added test suites

### v1.0.0 (2026-02-09)

- Initial data-driven foundation
- Python CLI
- BM25 search
- CSV data layer

## Comparison to Other Skills

### ui-ux-pro-max (inspiration)

- Similar CSV approach
- Similar BM25 search
- excalidraw adds: visual feedback, export, browser control

### interface-design

- Component-based (not data-driven)
- excalidraw: More structured, queryable data

### agent-browser

- excalidraw builds on agent-browser
- Adds domain-specific abstraction (diagrams)

## Future Structure Improvements

Potential additions:

1. **plugins/** - Custom diagram types
2. **locales/** - i18n support
3. **presets/** - Pre-configured diagram styles
4. **assets/** - Icons, images for diagrams

## Maintenance

**When adding features**:

1. Add core logic to scripts/
2. Add data to data/\*.csv (if applicable)
3. Add tests to tests/
4. Update SKILL.md
5. Update CHANGELOG.md

**When fixing bugs**:

1. Add failing test to tests/
2. Fix in scripts/
3. Verify test passes
4. Document in FIXES_APPLIED.md

**When refactoring**:

1. Ensure all tests still pass
2. Update documentation if structure changes
3. Update this STRUCTURE.md if directory changes
