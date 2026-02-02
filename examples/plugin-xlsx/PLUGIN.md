# aionui-plugin-xlsx

AionUi plugin for Excel spreadsheet creation, editing, and analysis. This is a migration of the built-in `xlsx` skill into a standalone, installable plugin package, demonstrating that existing skills can be extracted from the monorepo and distributed independently.

## What This Plugin Provides

### 1. System Prompt

Tells the agent about its Excel capabilities: formula verification, formatting standards, and the requirement to run recalculation after creating or modifying spreadsheets with formulas.

### 2. Skill: `xlsx`

The full SKILL.md content from the built-in xlsx skill, covering:

- **Mandatory formula verification** with recalc.py (zero formula errors required)
- **Financial model formatting standards** (color coding, number formats, negative numbers)
- **Formula construction rules** (assumptions placement, error prevention, documentation)
- **pandas + openpyxl best practices** (library selection, data analysis, file creation/editing)
- **Recalculation workflow** (create/modify, recalculate, verify, fix)

The skill appears in `[Available Skills]` alongside other skills like docx, pdf, and pptx.

### 3. Tool: `xlsx_recalculate`

Recalculates all formulas in an Excel file using LibreOffice and reports any formula errors. This wraps the `recalc.py` script and returns structured JSON output including:

- Total formula count
- Total error count
- Error breakdown by type (#REF!, #DIV/0!, #VALUE!, #NAME?, #NULL!, #NUM!, #N/A)
- Specific cell locations for each error

**Parameters:**
- `excelFile` (required): Path to the Excel file to recalculate
- `timeout` (optional): Maximum seconds to wait for LibreOffice (default: 30)

## Migration from Built-in Skill

This plugin packages the same files that exist in the built-in `skills/xlsx/` directory:

| Built-in Location | Plugin Location | Purpose |
|--------------------|-----------------|---------|
| `skills/xlsx/SKILL.md` | `skills/xlsx/SKILL.md` | Skill instructions for the agent |
| `skills/xlsx/recalc.py` | `skills/xlsx/recalc.py` | LibreOffice formula recalculation script |
| `skills/xlsx/LICENSE.txt` | `skills/xlsx/LICENSE.txt` | License terms |

The plugin wraps these same assets with the AionPlugin interface, adding:
- A system prompt for agent context injection
- A tool definition so the agent can call recalc.py via function-calling
- Proper manifest metadata for the plugin registry

## Plugin Structure

```
aionui-plugin-xlsx/
├── package.json              # npm metadata + aionui manifest
├── tsconfig.json             # TypeScript configuration
├── PLUGIN.md                 # This file
├── src/
│   └── index.ts              # Plugin entry point (implements AionPlugin)
└── skills/
    └── xlsx/
        ├── NOTE.md           # Explains that SKILL.md, recalc.py, LICENSE.txt
        │                     # are copied from built-in skills at package time
        ├── SKILL.md          # (copied from skills/xlsx/SKILL.md)
        ├── recalc.py         # (copied from skills/xlsx/recalc.py)
        └── LICENSE.txt       # (copied from skills/xlsx/LICENSE.txt)
```

## Requirements

- **LibreOffice**: Must be installed on the system for formula recalculation
- **Python 3**: Required to run recalc.py
- **openpyxl**: Python package used by recalc.py for reading Excel files
- **Permissions**: `fs:read`, `fs:write`, `shell:execute`

## Installation

### From npm (when published)
```
Settings > Plugins > Install > Enter: aionui-plugin-xlsx
```

### Local Development
```
Settings > Plugins > Install from Local > Select this directory
```
