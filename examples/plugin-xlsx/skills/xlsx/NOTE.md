# Skills Directory — Packaging Note

This directory contains the xlsx skill files that are copied from the built-in `skills/xlsx/` directory at package time. The following files should be present in a complete package:

- **SKILL.md** — Main skill documentation covering formula verification, financial model formatting standards, number formatting rules, pandas + openpyxl best practices, and the recalculation workflow. This is the same file as `skills/xlsx/SKILL.md` in the AionUi monorepo.

- **recalc.py** — LibreOffice-based formula recalculation script (178 lines). Sets up a LibreOffice macro for headless recalculation, runs it against the target Excel file, then scans all cells for Excel errors (#REF!, #DIV/0!, #VALUE!, #NAME?, #NULL!, #NUM!, #N/A) and returns JSON with error details.

- **LICENSE.txt** — License terms for the skill materials.

## Why These Files Are Not Committed Here

During development, these files live in the monorepo at `skills/xlsx/`. To avoid duplication and potential drift between the built-in and plugin versions, they are copied into this directory only at build/package time.

To populate this directory for local development or testing, run:

```bash
cp ../../../skills/xlsx/SKILL.md .
cp ../../../skills/xlsx/recalc.py .
cp ../../../skills/xlsx/LICENSE.txt .
```

A proper build script or CI step should handle this copy automatically when producing the distributable npm package.
