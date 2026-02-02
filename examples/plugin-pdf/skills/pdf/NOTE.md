# PDF Skill Files — Packaging Note

This directory would contain the full PDF skill files at package time.
In this proof-of-concept example, the files are not duplicated here to avoid
maintaining two copies. When building a distributable plugin package, the
following files should be copied from the built-in `skills/pdf/` directory:

## Files to copy from `skills/pdf/`

### Documentation

| File | Size | Description |
|------|------|-------------|
| `SKILL.md` | 7.3K | Main skill instructions with YAML frontmatter (name, description) and markdown body covering quick start, Python libraries, CLI tools, and common tasks |
| `reference.md` | 16K | Advanced reference — pypdfium2, JavaScript libraries (pdf-lib, pdfjs-dist), advanced CLI operations, complex workflows, and performance tips |
| `forms.md` | 9.3K | Form handling guide — fillable fields (extract, fill), non-fillable fields (visual analysis, bounding boxes, annotations), and step-by-step validation |
| `LICENSE.txt` | 1.5K | Proprietary license terms for the skill |

### Python Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `split_pdf.py` | Split a PDF into individual pages or extract page ranges |
| `merge_pdfs.py` | Merge multiple PDF files into one |
| `convert_pdf_to_images.py` | Convert PDF pages to PNG images |
| `check_fillable_fields.py` | Check if a PDF has fillable form fields |
| `extract_form_field_info.py` | Extract form field metadata (IDs, types, positions) to JSON |
| `fill_fillable_fields.py` | Fill native fillable form fields from a JSON values file |
| `fill_pdf_form_with_annotations.py` | Fill non-fillable forms using text annotations and bounding boxes |
| `check_bounding_boxes.py` | Validate that bounding boxes in fields.json do not intersect and are correctly sized |
| `check_bounding_boxes_test.py` | Test suite for the bounding box checker |
| `create_validation_image.py` | Generate validation images showing label (blue) and entry (red) bounding boxes overlaid on page images |

## Build Step

A build or packaging script should copy these files:

```bash
# Example packaging step
cp -r ../../skills/pdf/SKILL.md ./skills/pdf/
cp -r ../../skills/pdf/reference.md ./skills/pdf/
cp -r ../../skills/pdf/forms.md ./skills/pdf/
cp -r ../../skills/pdf/LICENSE.txt ./skills/pdf/
cp -r ../../skills/pdf/scripts/ ./skills/pdf/scripts/
```

The plugin's `src/index.ts` resolves script paths relative to the plugin root
at `skills/pdf/scripts/<scriptName>`, so the directory structure must match
the layout shown above.
