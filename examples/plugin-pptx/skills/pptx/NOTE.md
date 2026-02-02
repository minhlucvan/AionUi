# Packaging Note

This directory would contain the full set of files copied from the built-in `skills/pptx/`
directory at package time. The plugin's tool handlers and skill definition reference these
files by their paths relative to the plugin root.

## Files to copy from `skills/pptx/`

### Documentation
- `SKILL.md` — Main skill documentation (25K) with overview, workflows, and design principles
- `html2pptx.md` — HTML-to-PPTX converter reference (20K) with element support and CSS mapping
- `ooxml.md` — OOXML editing reference (11K) with XML structure, namespaces, and examples
- `LICENSE.txt` — License terms (1.5K)

### Scripts (`scripts/`)
- `html2pptx.js` — Playwright-based HTML-to-PPTX converter (37K). Renders HTML in a headless
  browser, extracts element positions and styles, and creates matching PPTX slides via pptxgenjs.
  Supports text, images, shapes, gradients, borders, bullet lists, and placeholder extraction.
- `inventory.py` — Extract structured text from presentations (38K). Produces JSON with
  slide-by-slide text content, paragraph formatting (fonts, colors, alignment, bullets),
  shape positions, dimensions, and GroupShape handling.
- `replace.py` — Apply text replacements from a JSON mapping (14K). Takes the inventory
  structure as input and applies modified paragraph text, formatting, and bullet properties
  back to the presentation shapes.
- `thumbnail.py` — Create thumbnail grids of slides (16K). Renders slides to images and
  arranges them in configurable grid layouts. Supports placeholder outlining for template
  analysis. Outputs JPEG grid files.
- `rearrange.py` — Rearrange, duplicate, or delete slides (8.4K). Takes a comma-separated
  sequence of 0-based slide indices and creates a new presentation with slides in that order.

### OOXML Tools (`ooxml/`)

#### Scripts (`ooxml/scripts/`)
- `unpack.py` — Unpack PPTX/DOCX/XLSX into pretty-printed XML. Extracts the ZIP archive
  and reformats all XML and .rels files for human readability.
- `pack.py` — Pack a directory back into an Office file. Validates XML against schemas
  before packing (unless `--force` is specified) to prevent corrupt output.
- `validate.py` — Validate Office document XML against XSD schemas. Supports PPTX and DOCX
  validation with type-specific validators.

#### Validation Modules (`ooxml/scripts/validation/`)
- `__init__.py` — Package init, exports validator classes
- `base.py` — Base schema validator with XSD loading and XML validation logic
- `pptx.py` — PPTX-specific validation rules
- `docx.py` — DOCX-specific validation rules
- `redlining.py` — Tracked changes (redlining) validator for DOCX

#### XSD Schemas (`ooxml/schemas/`)
30+ XML Schema Definition files organized by source:

- `ISO-IEC29500-4_2016/` — ISO/IEC 29500 Part 4 schemas:
  - `pml.xsd` — PresentationML (slides, presentations)
  - `dml-main.xsd` — DrawingML (shapes, text, effects)
  - `dml-chart.xsd`, `dml-diagram.xsd`, `dml-picture.xsd` — Drawing sub-schemas
  - `shared-commonSimpleTypes.xsd` — Shared type definitions
  - `vml-main.xsd`, `vml-officeDrawing.xsd` — VML legacy drawing
  - `wml.xsd`, `sml.xsd` — WordprocessingML and SpreadsheetML
  - And more (see the full directory listing)

- `ecma/fouth-edition/` — ECMA-376 4th Edition schemas:
  - `opc-contentTypes.xsd` — Package content types
  - `opc-relationships.xsd` — Package relationships
  - `opc-coreProperties.xsd` — Core document properties
  - `opc-digSig.xsd` — Digital signatures

- `mce/` — Markup Compatibility and Extensibility:
  - `mc.xsd` — MCE namespace schema

- `microsoft/` — Microsoft extension schemas:
  - `wml-2010.xsd`, `wml-2012.xsd`, `wml-2018.xsd` — Word extensions
  - And more vendor-specific extensions

## Build Script (hypothetical)

At package time, a build script would:

```bash
# Copy all skill files into the plugin package
cp -r skills/pptx/* examples/plugin-pptx/skills/pptx/

# Build the TypeScript
cd examples/plugin-pptx && npm run build

# Package for distribution
npm pack
```

The resulting npm package would contain everything needed: the compiled plugin code,
skill documentation, scripts, and OOXML schemas.
