# Packaging Note

This directory would contain the full DOCX skill files copied from the AionUi
built-in skills directory at package time. The plugin example itself only includes
this note; the actual skill files live in the main repository at `skills/docx/`.

## Files to copy from `skills/docx/`

### Documentation and license
- `SKILL.md` (~10K) -- Main skill documentation with workflow decision tree,
  instructions for reading/analyzing, creating new documents, editing existing
  documents with tracked changes, redlining workflow, and converting to images.
- `docx-js.md` (~17K) -- docx-js creation reference. Complete API documentation
  for the Document, Paragraph, TextRun, Table, and other components used when
  creating new Word documents from scratch with JavaScript/TypeScript.
- `ooxml.md` (~24K) -- OOXML editing reference. Document library API, XML
  patterns for tracked changes, run properties, paragraph manipulation, and
  direct DOM access for complex editing scenarios.
- `LICENSE.txt` (~1.5K) -- Proprietary license terms for the skill.

### Python scripts (`scripts/`)
- `scripts/__init__.py` -- Package init.
- `scripts/document.py` (~50K) -- The Document library. Provides the high-level
  API for OOXML manipulation with tracked changes support. Includes methods for
  finding nodes by text, inserting/deleting/replacing runs with revision marks,
  adding comments, managing RSIDs, and direct DOM access for complex scenarios.
- `scripts/utilities.py` (~14K) -- XMLEditor utility class for safe XML
  manipulation with namespace handling, XPath queries, and serialization.

### XML comment templates (`scripts/templates/`)
These are template XML files used when adding comments to a document that
does not already have a comments infrastructure:
- `scripts/templates/comments.xml` -- w:comments root element template.
- `scripts/templates/commentsExtended.xml` -- w15:commentsEx extension template.
- `scripts/templates/commentsExtensible.xml` -- w16cex:commentsExtensible template.
- `scripts/templates/commentsIds.xml` -- w16cid:commentsIds template.
- `scripts/templates/people.xml` -- w15:people template for comment authors.

### OOXML scripts (`ooxml/scripts/`)
- `ooxml/scripts/unpack.py` -- Unpacks a DOCX (or other OOXML) file into a
  directory. Extracts all ZIP entries, preserves directory structure, and
  suggests an RSID for tracked changes based on existing RSIDs in the document.
- `ooxml/scripts/pack.py` -- Packs a directory back into a DOCX file. Rebuilds
  the ZIP archive with correct content types and compression settings.
- `ooxml/scripts/validate.py` -- Validates DOCX XML against OOXML schemas.
  Supports strict mode, reports schema violations and structural issues.

### Validation modules (`ooxml/scripts/validation/`)
- `ooxml/scripts/validation/__init__.py` -- Package init.
- `ooxml/scripts/validation/base.py` -- Base validator class with common
  schema loading, XML parsing, and error reporting logic.
- `ooxml/scripts/validation/docx.py` -- DOCX-specific validation rules
  (document.xml structure, relationships, content types).
- `ooxml/scripts/validation/pptx.py` -- PPTX validation rules (shared
  codebase supports both document types).
- `ooxml/scripts/validation/redlining.py` -- Validates tracked changes
  structure (w:ins, w:del, RSID consistency, revision marks).

### OOXML schemas (`ooxml/schemas/`)
40+ XSD schema files organized by source:

**ISO/IEC 29500-4:2016** (`ooxml/schemas/ISO-IEC29500-4_2016/`)
- `wml.xsd` -- WordprocessingML schema (main document schema)
- `dml-main.xsd` -- DrawingML main schema
- `dml-chart.xsd`, `dml-chartDrawing.xsd`, `dml-diagram.xsd` -- DrawingML extensions
- `dml-picture.xsd`, `dml-lockedCanvas.xsd` -- Picture and canvas schemas
- `dml-wordprocessingDrawing.xsd`, `dml-spreadsheetDrawing.xsd` -- Drawing placement
- `pml.xsd` -- PresentationML schema
- `sml.xsd` -- SpreadsheetML schema
- `shared-commonSimpleTypes.xsd` -- Common simple types
- `shared-math.xsd` -- OMML math schema
- `shared-bibliography.xsd` -- Bibliography schema
- `shared-documentProperties*.xsd` -- Document properties schemas
- `shared-customXml*.xsd` -- Custom XML schemas
- `shared-relationshipReference.xsd` -- Relationship reference schema
- `shared-additionalCharacteristics.xsd` -- Additional characteristics
- `vml-main.xsd` -- VML main schema
- `vml-officeDrawing.xsd`, `vml-wordprocessingDrawing.xsd` -- VML extensions
- `vml-presentationDrawing.xsd`, `vml-spreadsheetDrawing.xsd` -- VML extensions
- `xml.xsd` -- Base XML schema

**ECMA 4th Edition** (`ooxml/schemas/ecma/fouth-edition/`)
- `opc-contentTypes.xsd` -- OPC content types schema
- `opc-coreProperties.xsd` -- OPC core properties schema
- `opc-digSig.xsd` -- OPC digital signatures schema
- `opc-relationships.xsd` -- OPC relationships schema

**MCE** (`ooxml/schemas/mce/`)
- `mc.xsd` -- Markup Compatibility and Extensibility schema

**Microsoft Extensions** (`ooxml/schemas/microsoft/`)
- `wml-2010.xsd` -- Word 2010 extensions
- `wml-2012.xsd` -- Word 2013 extensions
- `wml-2018.xsd` -- Word 2019 extensions
- `wml-cex-2018.xsd` -- Comment extensibility extensions
- `wml-cid-2016.xsd` -- Comment ID extensions
- `wml-sdtdatahash-2020.xsd` -- Structured document tag data hash
- `wml-symex-2015.xsd` -- Symbol extensibility

## Build process

At package time, a build script would:

1. Copy all files listed above from `skills/docx/` to `skills/docx/` in this
   plugin directory, preserving the directory structure.
2. Run `tsc` to compile `src/index.ts` into `dist/index.js` + `dist/index.d.ts`.
3. Package the result as an npm tarball or push to a registry.

The plugin's tool handlers use paths relative to the plugin install directory
(via `context.pluginDir`), so the scripts and schemas must be present at the
expected locations within the installed package.
