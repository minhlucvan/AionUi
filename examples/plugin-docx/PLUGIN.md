# aionui-plugin-docx

AionUi plugin that migrates the built-in DOCX skill into an installable plugin package.

This plugin proves that existing built-in skills can be extracted and distributed as
standalone plugin packages -- same capabilities, same quality, but installable via
npm, GitHub, or local path. The DOCX skill is one of the most complex built-in skills,
with 50+ files including Python scripts, XML templates, OOXML schemas, and reference
documentation. Successfully packaging it as a plugin validates the plugin system design.

## What This Plugin Provides

### 1. System Prompt

Tells the agent about four DOCX workflows and the available tools, so it knows
when and how to use each capability. Injected into the first message as
`[Assistant Rules]`, same as `presetRules` or `AcpBackendConfig.context`.

### 2. Skill: `docx`

The same SKILL.md from the built-in skill, with two reference documents:

- **docx-js.md** -- docx-js library reference for creating new documents
- **ooxml.md** -- OOXML editing reference for the Document library and tracked changes

The agent sees "docx" in `[Available Skills]` and loads the reference docs on demand,
exactly as it does with the built-in version.

### 3. Tools

Five function-calling tools that wrap bundled Python scripts and system utilities:

| Tool | Description | Implementation |
|------|-------------|----------------|
| `docx_unpack` | Unpack a DOCX file for XML editing | `python ooxml/scripts/unpack.py` |
| `docx_pack` | Pack a directory back into DOCX | `python ooxml/scripts/pack.py` |
| `docx_validate` | Validate XML against OOXML schemas | `python ooxml/scripts/validate.py` |
| `docx_to_text` | Extract text as markdown | `pandoc --track-changes=...` |
| `docx_to_images` | Convert pages to PNG/JPEG | LibreOffice + pdftoppm |

All tools work across all AI providers (Claude Code, Gemini, Codex, any ACP agent)
with no per-provider adapters needed.

## Four Main Workflows

### Workflow 1: Read / Analyze

Extract document text with `docx_to_text` (pandoc-based, supports tracked changes
modes). For deeper analysis of comments, formatting, or metadata, use `docx_unpack`
to access the raw XML.

### Workflow 2: Create New Document

Use the docx-js JavaScript library documented in `docx-js.md`. Create a script
using `Document`, `Paragraph`, `TextRun` components, then export via
`Packer.toBuffer()`.

### Workflow 3: Edit Existing Document (Tracked Changes / Redlining)

The most complex workflow, designed for professional document review:

1. `docx_to_text` -- understand current content
2. `docx_unpack` -- extract XML for editing
3. Write Python scripts using the Document library (see `ooxml.md`)
4. `docx_pack` -- reassemble the DOCX file
5. `docx_validate` -- verify the result

Supports tracked changes, comments, redlining, and minimal-diff editing that
only marks text that actually changes.

### Workflow 4: Convert to Images

Use `docx_to_images` for visual analysis. Two-step conversion:
LibreOffice DOCX-to-PDF, then pdftoppm PDF-to-PNG/JPEG. Supports DPI control
and page range selection.

## Plugin Structure

```
aionui-plugin-docx/
├── package.json                # npm metadata + aionui manifest
├── tsconfig.json               # TypeScript configuration
├── PLUGIN.md                   # This file
├── src/
│   └── index.ts                # Plugin entry point (implements AionPlugin)
└── skills/
    └── docx/
        ├── NOTE.md             # Packaging note about built-in skill files
        ├── SKILL.md            # Main skill documentation (from built-in)
        ├── docx-js.md          # docx-js creation reference (from built-in)
        ├── ooxml.md            # OOXML editing reference (from built-in)
        ├── LICENSE.txt         # Skill license (from built-in)
        ├── scripts/
        │   ├── __init__.py
        │   ├── document.py     # Document library with tracked changes
        │   ├── utilities.py    # XMLEditor utility
        │   └── templates/      # 5 XML comment templates
        │       ├── comments.xml
        │       ├── commentsExtended.xml
        │       ├── commentsExtensible.xml
        │       ├── commentsIds.xml
        │       └── people.xml
        └── ooxml/
            ├── scripts/
            │   ├── pack.py
            │   ├── unpack.py
            │   ├── validate.py
            │   └── validation/
            │       ├── __init__.py
            │       ├── base.py
            │       ├── docx.py
            │       ├── pptx.py
            │       └── redlining.py
            └── schemas/        # 40+ XSD schema files
                ├── ISO-IEC29500-4_2016/
                ├── ecma/fouth-edition/
                ├── mce/
                └── microsoft/
```

## Dependencies

The plugin requires these system dependencies (same as the built-in skill):

- **Python 3** -- for running unpack/pack/validate scripts
- **defusedxml** -- `pip install defusedxml` (secure XML parsing)
- **pandoc** -- `sudo apt-get install pandoc` (text extraction)
- **LibreOffice** -- `sudo apt-get install libreoffice` (PDF conversion)
- **Poppler** -- `sudo apt-get install poppler-utils` (pdftoppm for PDF-to-images)

## Permissions Required

- `fs:read` -- read DOCX files and unpacked XML
- `fs:write` -- write unpacked directories and output files
- `shell:execute` -- run Python scripts, pandoc, LibreOffice, pdftoppm

## Installation

### From npm
```
Settings > Plugins > Install > Enter: aionui-plugin-docx
```

### From GitHub
```
Settings > Plugins > Install from GitHub > Enter: your-org/aionui-plugin-docx
```

### Local Development
```
Settings > Plugins > Install from Local > Select this directory
```

## Migration from Built-in Skill

This plugin is a direct migration of the built-in `skills/docx/` directory. The
skill content, scripts, schemas, and templates are identical. The only additions
are the plugin wrapper (`src/index.ts`), manifest (`package.json`), and the five
tool definitions that expose the scripts as function-calling tools.

To package the plugin for distribution, copy the contents of `skills/docx/` from
the AionUi repository into `skills/docx/` in this plugin directory. See
`skills/docx/NOTE.md` for details.
