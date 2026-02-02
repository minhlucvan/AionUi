/**
 * AionUi Plugin Manifest - Zod Validation Schema
 *
 * Validates the "aionui" field in a plugin's package.json.
 * The manifest declares what capabilities a plugin provides:
 * skills, MCP servers, tools, system prompts, and settings.
 */

import { z } from 'zod';

// ─── Setting Definition Schema ───────────────────────────────────────────────

const settingValidationSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
  })
  .strict();

const settingOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
});

const settingDefinitionSchema = z
  .object({
    type: z.enum(['string', 'number', 'boolean', 'select', 'multiselect']),
    label: z.string().min(1),
    description: z.string().optional(),
    default: z.unknown().optional(),
    secret: z.boolean().optional(),
    required: z.boolean().optional(),
    options: z.array(settingOptionSchema).optional(),
    validation: settingValidationSchema.optional(),
  })
  .strict();

// ─── Permission Schema ──────────────────────────────────────────────────────

const permissionSchema = z.enum([
  'fs:read',
  'fs:write',
  'fs:global',
  'network:fetch',
  'shell:execute',
  'ui:panel',
  'ui:overlay',
  'clipboard',
  'mcp:server',
]);

// ─── Category Schema ─────────────────────────────────────────────────────────

const categorySchema = z.enum([
  'productivity',
  'ai-tools',
  'code-analysis',
  'document',
  'integration',
  'other',
]);

// ─── Skill Declaration Schema ────────────────────────────────────────────────

const skillDeclarationSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

// ─── MCP Server Declaration Schema ──────────────────────────────────────────

const mcpServerDeclarationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  transport: z.string().min(1),
});

// ─── Tool Declaration Schema ─────────────────────────────────────────────────

const toolDeclarationSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

// ─── Main Manifest Schema ────────────────────────────────────────────────────

export const pluginManifestSchema = z.object({
  /** Plugin manifest schema version */
  pluginVersion: z
    .string()
    .regex(/^\d+\.\d+$/, 'Plugin version must be in format "MAJOR.MINOR"'),

  /** Human-readable display name */
  displayName: z.string().min(1).max(100),

  /** Short description */
  description: z.string().min(1).max(500),

  /** Path to icon */
  icon: z.string().optional(),

  /** Plugin category */
  category: categorySchema.optional(),

  /** Minimum AionUi host version required */
  minHostVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Must be a valid semver version')
    .optional(),

  /** Skills: path to skills/ directory OR inline declarations */
  skills: z.union([z.string(), z.array(skillDeclarationSchema)]).optional(),

  /** MCP server declarations */
  mcpServers: z.array(mcpServerDeclarationSchema).optional(),

  /** Tool declarations */
  tools: z.array(toolDeclarationSchema).optional(),

  /** Required permissions */
  permissions: z.array(permissionSchema).optional(),

  /** Settings schema */
  settings: z.record(z.string(), settingDefinitionSchema).optional(),
});

// ─── Package.json Schema ─────────────────────────────────────────────────────

export const pluginPackageJsonSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(
      /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/,
      'Must be a valid npm package name',
    ),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Must be a valid semver version'),
  description: z.string().optional(),
  main: z.string().optional(),
  types: z.string().optional(),
  aionui: pluginManifestSchema,
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type ValidatedManifest = z.infer<typeof pluginManifestSchema>;
export type ValidatedPackageJson = z.infer<typeof pluginPackageJsonSchema>;

// ─── Validation Helper ───────────────────────────────────────────────────────

export interface ManifestValidationResult {
  valid: boolean;
  manifest?: ValidatedManifest;
  errors?: Array<{ path: string; message: string }>;
}

/**
 * Validate a plugin manifest (the "aionui" field from package.json).
 */
export function validateManifest(data: unknown): ManifestValidationResult {
  const result = pluginManifestSchema.safeParse(data);

  if (result.success) {
    return { valid: true, manifest: result.data };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * Validate a full plugin package.json.
 */
export function validatePluginPackageJson(
  data: unknown,
): ManifestValidationResult & { packageJson?: ValidatedPackageJson } {
  const result = pluginPackageJsonSchema.safeParse(data);

  if (result.success) {
    return { valid: true, manifest: result.data.aionui, packageJson: result.data };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
