# aionui-plugin-pdf

PDF processing plugin for AionUi, migrated from the built-in `skills/pdf/` directory to prove that existing skills can work as installable plugin packages.

## What This Plugin Provides

This plugin wraps the same SKILL.md documentation, reference guides, and Python scripts that ship with AionUi's built-in `pdf` skill into a standalone, installable plugin package. It demonstrates that the plugin architecture can fully replace built-in skills without loss of functionality.

### Capabilities

| # | Capability | What It Does |
|---|-----------|--------------|
| 1 | **System Prompt** | Injects instructions telling the agent it has PDF processing tools and how to invoke them. |
| 2 | **Skill: `pdf`** | The full SKILL.md content (plus reference.md and forms.md) — same format as the built-in skill. Appears in [Available Skills] alongside docx, pptx, etc. |
| 3 | **Tools (6)** | Function-calling tools backed by bundled Python scripts. Work with all AI providers. |
| 4 | **MCP Servers** | None — all tools are native function-calling handlers. |

## Tools

### pdf_split

Split a PDF into individual pages or extract specific page ranges.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inputPdf` | string | yes | Path to the input PDF file |
| `outputPath` | string | yes | Output directory (split all) or output file path (extract range) |
| `pages` | string | no | Page range to extract (e.g., "1-5" or "1,3,5") |

### pdf_merge

Merge multiple PDF files into a single output PDF.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `outputPdf` | string | yes | Path for the merged output PDF |
| `inputPdfs` | string[] | yes | Array of input PDF file paths (minimum 2) |

### pdf_to_images

Convert PDF pages to PNG images. Creates one PNG per page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inputPdf` | string | yes | Path to the input PDF file |
| `outputDir` | string | yes | Directory to save PNG images |
| `dpi` | number | no | Resolution in DPI (default: 150) |

### pdf_extract_form_fields

Extract form field metadata (field IDs, types, positions) from a PDF to JSON.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inputPdf` | string | yes | Path to the input PDF file |
| `outputJson` | string | yes | Path for the output JSON file |

### pdf_fill_form

Fill a PDF form with values from a JSON file. Supports both fillable (native form fields) and non-fillable (annotation-based) PDFs.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inputPdf` | string | yes | Path to the input PDF file |
| `fieldsJson` | string | yes | Path to the JSON file with field values |
| `outputPdf` | string | yes | Path for the filled output PDF |
| `fillable` | boolean | no | true for native fields (default), false for annotation-based |

### pdf_check_fields

Check if a PDF has fillable form fields. Returns field names and types if found.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `inputPdf` | string | yes | Path to the input PDF file |

## Plugin Structure

```
aionui-plugin-pdf/
├── package.json              # npm metadata + aionui manifest
├── tsconfig.json             # TypeScript configuration
├── PLUGIN.md                 # This file
├── src/
│   └── index.ts              # Plugin entry point (implements AionPlugin)
└── skills/
    └── pdf/
        ├── SKILL.md          # Main skill instructions (YAML frontmatter + markdown)
        ├── reference.md      # Advanced PDF processing reference (16K)
        ├── forms.md          # Form handling guide (9.3K)
        ├── LICENSE.txt       # Proprietary license terms
        └── scripts/          # 10 Python scripts
            ├── split_pdf.py
            ├── merge_pdfs.py
            ├── convert_pdf_to_images.py
            ├── check_bounding_boxes.py
            ├── check_bounding_boxes_test.py
            ├── check_fillable_fields.py
            ├── extract_form_field_info.py
            ├── fill_fillable_fields.py
            ├── fill_pdf_form_with_annotations.py
            └── create_validation_image.py
```

## How It Works

1. **Activation**: When the plugin is activated, `activate()` stores the plugin directory path and binds the host-provided `exec()` function for running shell commands.

2. **System Prompt**: The agent receives instructions about the available PDF tools, injected as `[Assistant Rules]` in the first message.

3. **Skill Loading**: The host discovers `skills/pdf/SKILL.md` inside the plugin directory and makes it available in the [Available Skills] list. When the agent activates the skill, it reads the full SKILL.md body plus `reference.md` and `forms.md`.

4. **Tool Execution**: When the agent calls a tool (e.g., `pdf_split`), the handler resolves the bundled Python script path relative to the plugin root and executes it via the host's `exec()` function (granted by the `shell:execute` permission).

## Permissions

This plugin requires the following permissions:

- **fs:read** — Read PDF files from the workspace
- **fs:write** — Write output PDFs, images, and JSON files
- **shell:execute** — Run the bundled Python scripts

## Migration Notes

This plugin is a direct migration of the built-in `skills/pdf/` directory. The key differences from the built-in skill:

- **Installable**: Can be installed from npm, GitHub, or a local directory
- **Self-contained**: Bundles all scripts and documentation inside the plugin package
- **Tool registration**: PDF operations are registered as function-calling tools (not just instructions in SKILL.md)
- **Cross-provider**: Works identically across Claude Code, Gemini, Codex, and any ACP agent
- **Permission-gated**: Shell execution requires explicit user approval

The built-in skill relies on the agent reading SKILL.md and running scripts manually. The plugin version provides the same SKILL.md content but also registers dedicated tools that the agent can call directly, making the workflow more structured and reliable.

## Installation

### From Local Directory (development)

```
Settings > Plugins > Install from Local > Select this directory
```

### From npm (when published)

```
Settings > Plugins > Install > Enter: aionui-plugin-pdf
```
