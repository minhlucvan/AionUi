# aionui-plugin-pptx

Migration of the built-in PPTX skill to an installable plugin package. This proves that
existing built-in skills can be distributed as standalone plugin packages without changing
the underlying scripts or SKILL.md files.

## What This Plugin Provides

### 1. System Prompt

Tells the agent about three PPTX workflows (create from HTML, edit via OOXML, template-based
editing) and lists the available tools. Injected as `[Assistant Rules]` into the first message.

### 2. Skill: `pptx`

The same SKILL.md that powers the built-in PPTX skill, bundled inside the plugin package.
Includes companion reference documents `html2pptx.md` (HTML-to-PPTX converter reference)
and `ooxml.md` (OOXML editing reference). Appears in `[Available Skills]` alongside other
installed skills.

### 3. Tools (8 total)

Function-calling tools that wrap the bundled Python and Node scripts. Each tool validates
its parameters, constructs a shell command, and executes it via the host's `exec()` API.

| Tool | Script | Description |
|------|--------|-------------|
| `pptx_create_from_html` | `html2pptx.js` | Convert HTML slides to PowerPoint with accurate positioning |
| `pptx_extract_text` | `inventory.py` | Extract all text, shapes, and formatting to JSON |
| `pptx_thumbnail` | `thumbnail.py` | Create visual thumbnail grid(s) of slides |
| `pptx_rearrange` | `rearrange.py` | Rearrange, duplicate, or delete slides by index |
| `pptx_replace_text` | `replace.py` | Apply text replacements from a JSON mapping |
| `pptx_unpack` | `ooxml/scripts/unpack.py` | Unpack PPTX into pretty-printed XML files |
| `pptx_pack` | `ooxml/scripts/pack.py` | Pack directory back into PPTX with validation |
| `pptx_validate` | `ooxml/scripts/validate.py` | Validate XML against OOXML XSD schemas |

## Three Main Workflows

### Workflow 1: Create from HTML (new presentations)

Design slides as HTML with CSS positioning, then convert to PPTX. This gives full design
control with accurate positioning, typography, gradients, and layout.

```
1. Agent writes HTML slide file(s) with CSS positioning
2. pptx_create_from_html converts HTML to PPTX via Playwright + pptxgenjs
3. Output is a standards-compliant .pptx file
```

### Workflow 2: Edit via OOXML (direct XML editing)

Unpack a PPTX, edit the raw Office Open XML, validate, and repack. Use this for precise
control over comments, speaker notes, animations, slide layouts, themes, and formatting
that cannot be expressed through the other workflows.

```
1. pptx_unpack extracts PPTX to a directory of pretty-printed XML files
2. Agent reads and edits XML files directly (slides, notes, comments, themes)
3. pptx_validate checks XML against OOXML XSD schemas
4. pptx_pack repacks the directory into a valid PPTX file
```

### Workflow 3: Template-based editing (modify existing presentations)

Extract text from a template, modify the structured inventory, and apply replacements.
Rearrange slides to build new presentations from existing slide libraries.

```
1. pptx_extract_text produces a structured JSON inventory of all text/shapes
2. Agent modifies the JSON with new text content
3. pptx_replace_text applies the changes back to the presentation
4. pptx_rearrange reorders, duplicates, or removes slides as needed
5. pptx_thumbnail creates visual overview for verification
```

## Plugin Structure

```
aionui-plugin-pptx/
├── package.json              # npm metadata + aionui manifest
├── tsconfig.json             # TypeScript configuration
├── PLUGIN.md                 # This file
├── src/
│   └── index.ts              # Plugin entry point (implements AionPlugin)
└── skills/
    └── pptx/
        ├── NOTE.md           # Packaging note (see below)
        ├── SKILL.md          # Main skill documentation (from built-in)
        ├── html2pptx.md      # HTML-to-PPTX reference
        ├── ooxml.md          # OOXML editing reference
        ├── LICENSE.txt       # License terms
        ├── scripts/
        │   ├── html2pptx.js  # Playwright-based HTML-to-PPTX converter
        │   ├── inventory.py  # Text extraction
        │   ├── replace.py    # Text replacement
        │   ├── thumbnail.py  # Thumbnail grid creation
        │   └── rearrange.py  # Slide rearrangement
        └── ooxml/
            ├── scripts/
            │   ├── unpack.py     # Unpack PPTX to XML
            │   ├── pack.py       # Pack XML to PPTX
            │   ├── validate.py   # Validate against schemas
            │   └── validation/   # Validation modules
            │       ├── __init__.py
            │       ├── base.py
            │       ├── pptx.py
            │       ├── docx.py
            │       └── redlining.py
            └── schemas/          # 30+ OOXML XSD schema files
                ├── ISO-IEC29500-4_2016/
                ├── ecma/
                ├── mce/
                └── microsoft/
```

## Migration from Built-in Skill

This plugin is a direct migration of the built-in `skills/pptx/` directory. The migration
process is:

1. **Copy skill files** from `skills/pptx/` into `skills/pptx/` inside the plugin package
2. **Wrap scripts as tools** in `src/index.ts` with parameter validation and shell execution
3. **Add system prompt** describing the three workflows and available tools
4. **Declare manifest** in `package.json` under the `aionui` field

No changes to the original scripts are needed. The plugin wraps them with tool definitions
that provide:
- Structured input schemas (JSON Schema) so the agent knows what parameters to pass
- Parameter validation before script execution
- Consistent error handling and result formatting
- Shell execution via the host's sandboxed `exec()` API

## Permissions Required

- `fs:read` — Read PPTX files and templates from the workspace
- `fs:write` — Write output PPTX files, JSON inventories, and thumbnail images
- `shell:execute` — Run Python and Node scripts for PPTX processing

## Installation

### From npm (when published)
```
Settings > Plugins > Install > Enter: aionui-plugin-pptx
```

### From Local Directory (development)
```
Settings > Plugins > Install from Local > Select this directory
```
