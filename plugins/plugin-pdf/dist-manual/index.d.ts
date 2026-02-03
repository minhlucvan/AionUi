/**
 * aionui-plugin-pdf
 *
 * Migrated from the built-in pdf skill to prove the plugin architecture.
 * Bundles the same SKILL.md, reference docs, and Python scripts as the
 * original /skills/pdf/ directory — but packaged as an installable plugin.
 *
 * Capabilities:
 *   1. System Prompt  → tells the agent it has PDF processing tools
 *   2. Skill          → "pdf" skill (SKILL.md + reference.md + forms.md)
 *   3. Tools          → 6 function-calling tools backed by Python scripts
 *   4. MCP Servers    → none (tools are native function-calling)
 *
 * This works across all AI agents: Claude Code, Gemini, Codex, etc.
 */
import type { AionPlugin } from '../../../src/plugin/types';
declare const pdfPlugin: AionPlugin;
export default pdfPlugin;
