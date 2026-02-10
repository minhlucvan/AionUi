/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Assistant Migration - Move built-in assistants to Application Support
 *
 * This migration unifies built-in and custom assistants by moving all assistants
 * to a single location: ~/Library/Application Support/AionUi/config/assistants/
 *
 * Built-in assistants are copied from resources/assistant/ to Application Support
 * and marked with isBuiltin: true in their assistant.json metadata.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { copyDirectoryRecursively } from '../utils';
import { ProcessConfig } from '../initStorage';
import { ASSISTANT_PRESETS } from '@/common/presets/assistantPresets';

/**
 * Get the Application Support assistants directory
 */
export function getAssistantsDir(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'config', 'assistants');
}

/**
 * Resolve resources directory (handles both dev and packaged modes)
 */
function resolveResourcesDir(dirPath: string): string | null {
  const appPath = app.getAppPath();
  let candidates: string[];

  if (app.isPackaged) {
    const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
    candidates = [path.join(unpackedPath, dirPath), path.join(appPath, dirPath)];
  } else {
    candidates = [path.join(appPath, dirPath), path.join(appPath, '..', dirPath), path.join(appPath, '..', '..', dirPath), path.join(process.cwd(), dirPath)];
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Check if migration is needed
 */
export async function needsAssistantMigration(): Promise<boolean> {
  const MIGRATION_KEY = 'migration.assistantsToAppSupport_v1';
  const migrationDone = await ProcessConfig.get(MIGRATION_KEY).catch(() => false);
  return !migrationDone;
}

/**
 * Mark migration as completed
 */
async function markMigrationComplete(): Promise<void> {
  const MIGRATION_KEY = 'migration.assistantsToAppSupport_v1';
  await ProcessConfig.set(MIGRATION_KEY, true);
}

/**
 * Migrate a single built-in assistant to Application Support
 *
 * @param assistantId - Assistant ID (e.g., 'video-generator')
 * @param sourcePath - Source path in resources/
 * @param targetDir - Target assistants directory
 * @returns true if migration succeeded
 */
async function migrateBuiltinAssistant(assistantId: string, sourcePath: string, targetDir: string): Promise<boolean> {
  try {
    console.log(`[Migration] Migrating built-in assistant: ${assistantId}`);

    // Use builtin- prefix for directory name to match ID
    const targetPath = path.join(targetDir, `builtin-${assistantId}`);

    // Skip if already exists
    if (fs.existsSync(targetPath)) {
      console.log(`[Migration] Assistant already exists, skipping: ${assistantId}`);
      return true;
    }

    // Copy assistant directory
    await copyDirectoryRecursively(sourcePath, targetPath, { overwrite: false });
    console.log(`[Migration] Copied to: ${targetPath}`);

    // Update or create assistant.json with locked flag (prevent editing system assistants)
    const configPath = path.join(targetPath, 'assistant.json');
    let config: any;

    if (fs.existsSync(configPath)) {
      // Load existing config
      const configContent = await fs.promises.readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);

      // IMPORTANT: Ensure ID matches directory name (source of truth)
      // Update ID to include builtin- prefix if it doesn't have it
      const expectedId = `builtin-${assistantId}`;
      if (config.id !== expectedId) {
        console.log(`[Migration] Updating ID from "${config.id}" to "${expectedId}"`);
        config.id = expectedId;
      }
    } else {
      // Create config from ASSISTANT_PRESETS if not exists
      const preset = ASSISTANT_PRESETS.find((p) => p.id === assistantId);
      if (preset) {
        config = {
          id: `builtin-${assistantId}`, // Add builtin- prefix for consistency with existing system
          name: preset.nameI18n['en-US'],
          nameI18n: preset.nameI18n,
          description: preset.descriptionI18n['en-US'],
          descriptionI18n: preset.descriptionI18n,
          avatar: preset.avatar,
          presetAgentType: preset.presetAgentType || 'gemini',
          enabledSkills: preset.defaultEnabledSkills || [],
          enabled: preset.id === 'cowork', // Cowork enabled by default
        };
        console.log(`[Migration] Created assistant.json from preset for: ${assistantId}`);
      } else {
        // Fallback if no preset found
        config = {
          id: `builtin-${assistantId}`,
          name: assistantId,
          description: '',
          avatar: '🤖',
          enabled: false,
        };
        console.warn(`[Migration] No preset found for ${assistantId}, using fallback config`);
      }
    }

    // Mark as builtin
    config.isBuiltin = true;
    config.isPreset = true; // Mark as preset

    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`[Migration] Marked as built-in: ${assistantId}`);

    return true;
  } catch (error) {
    console.error(`[Migration] Failed to migrate assistant ${assistantId}:`, error);
    return false;
  }
}

/**
 * Check if assistant structure migration is needed (v2 - nested files)
 */
async function needsAssistantStructureMigration(): Promise<boolean> {
  const MIGRATION_KEY = 'migration.assistantsNestedStructure_v1' as any;
  const migrationDone = await ProcessConfig.get(MIGRATION_KEY).catch(() => false);
  return !migrationDone;
}

/**
 * Mark assistant structure migration as completed
 */
async function markStructureMigrationComplete(): Promise<void> {
  const MIGRATION_KEY = 'migration.assistantsNestedStructure_v1' as any;
  await ProcessConfig.set(MIGRATION_KEY, true);
}

/**
 * Copy directory recursively (helper for structure migration)
 */
async function copyDirectoryStructure(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryStructure(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Run assistant structure migration (v2)
 *
 * This migration restructures the assistants directory to use nested files:
 * - Moves .md files from root to assistant subdirectories
 * - Renames directories to include builtin- prefix
 * - Merges duplicate directories
 *
 * OLD: assistants/builtin-cowork.en-US.md, assistants/cowork/
 * NEW: assistants/builtin-cowork/builtin-cowork.en-US.md
 *
 * @returns true if migration succeeded or was not needed
 */
async function runAssistantStructureMigration(): Promise<boolean> {
  try {
    // Check if migration needed
    const needed = await needsAssistantStructureMigration();
    if (!needed) {
      console.log('[Migration] Assistant structure migration already completed, skipping');
      return true;
    }

    console.log('[Migration] Starting assistant structure migration (nested files)...');

    const assistantsDir = getAssistantsDir();
    if (!fs.existsSync(assistantsDir)) {
      console.warn('[Migration] Assistants directory does not exist, skipping');
      await markStructureMigrationComplete();
      return true;
    }

    // Pattern to match assistant files
    const RULE_FILE_PATTERN = /^(builtin-|custom-)?([^.]+)\.([^.]+)\.md$/;
    const SKILL_FILE_PATTERN = /^(builtin-|custom-)?([^.]+)-skills\.([^.]+)\.md$/;

    // Read all files in assistants directory
    const entries = fs.readdirSync(assistantsDir, { withFileTypes: true });
    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));

    console.log(`[Migration] Found ${mdFiles.length} .md files at root level`);

    // Group files by assistant ID
    const filesByAssistant: Record<string, string[]> = {};

    for (const file of mdFiles) {
      const fileName = file.name;
      const skillMatch = fileName.match(SKILL_FILE_PATTERN);
      const ruleMatch = fileName.match(RULE_FILE_PATTERN);

      if (skillMatch) {
        const [, prefix, assistantId] = skillMatch;
        const fullId = prefix ? `${prefix}${assistantId}` : assistantId;
        if (!filesByAssistant[fullId]) filesByAssistant[fullId] = [];
        filesByAssistant[fullId].push(fileName);
      } else if (ruleMatch) {
        const [, prefix, assistantId] = ruleMatch;
        const fullId = prefix ? `${prefix}${assistantId}` : assistantId;
        if (!filesByAssistant[fullId]) filesByAssistant[fullId] = [];
        filesByAssistant[fullId].push(fileName);
      }
    }

    console.log(`[Migration] Found ${Object.keys(filesByAssistant).length} unique assistants with files to migrate`);

    // Move files to subdirectories
    for (const [assistantId, files] of Object.entries(filesByAssistant)) {
      try {
        const targetDir = path.join(assistantsDir, assistantId);

        // Create target directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Move each file
        for (const fileName of files) {
          const sourcePath = path.join(assistantsDir, fileName);
          const targetPath = path.join(targetDir, fileName);

          // Skip if target already exists
          if (fs.existsSync(targetPath)) {
            continue;
          }

          // Move file
          fs.renameSync(sourcePath, targetPath);
        }

        console.log(`[Migration]   ✓ Migrated ${files.length} files for: ${assistantId}`);
      } catch (error) {
        console.error(`[Migration]   ✗ Error migrating ${assistantId}:`, error);
      }
    }

    // Rename directories without builtin- prefix
    const directories = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

    for (const dir of directories) {
      const dirName = dir.name;

      // Skip if already has prefix or is numeric (custom assistant)
      if (dirName.startsWith('builtin-') || dirName.startsWith('custom-') || /^\d+$/.test(dirName)) {
        continue;
      }

      const oldPath = path.join(assistantsDir, dirName);
      const newPath = path.join(assistantsDir, `builtin-${dirName}`);

      try {
        if (fs.existsSync(newPath)) {
          // Merge: copy contents and remove old directory
          const oldFiles = fs.readdirSync(oldPath);
          for (const file of oldFiles) {
            const oldFilePath = path.join(oldPath, file);
            const newFilePath = path.join(newPath, file);

            if (!fs.existsSync(newFilePath)) {
              const stats = fs.statSync(oldFilePath);
              if (stats.isDirectory()) {
                await copyDirectoryStructure(oldFilePath, newFilePath);
              } else {
                fs.copyFileSync(oldFilePath, newFilePath);
              }
            }
          }
          fs.rmSync(oldPath, { recursive: true });
          console.log(`[Migration]   ✓ Merged directory: ${dirName} -> builtin-${dirName}`);
        } else {
          // Rename directory
          fs.renameSync(oldPath, newPath);
          console.log(`[Migration]   ✓ Renamed directory: ${dirName} -> builtin-${dirName}`);
        }
      } catch (error) {
        console.error(`[Migration]   ✗ Error renaming directory ${dirName}:`, error);
      }
    }

    // Mark migration as complete
    await markStructureMigrationComplete();
    console.log('[Migration] Assistant structure migration completed');

    return true;
  } catch (error) {
    console.error('[Migration] Assistant structure migration failed:', error);
    return false;
  }
}

/**
 * Run assistant migration (v1 - copy from resources)
 *
 * This function:
 * 1. Checks if migration is needed
 * 2. Copies built-in assistants from resources/ to Application Support
 * 3. Marks assistants as built-in
 * 4. Records migration as complete
 *
 * @returns true if migration succeeded or was not needed
 */
async function runAssistantResourceMigration(): Promise<boolean> {
  try {
    // Check if migration needed
    const needed = await needsAssistantMigration();
    if (!needed) {
      console.log('[Migration] Assistant migration already completed, skipping');
      return true;
    }

    console.log('[Migration] Starting assistant migration to Application Support');

    // Get resources/assistant directory
    const resourcesAssistantDir = resolveResourcesDir('assistant');
    if (!resourcesAssistantDir) {
      console.warn('[Migration] resources/assistant directory not found, skipping migration');
      await markMigrationComplete();
      return true;
    }

    // Get target directory
    const targetDir = getAssistantsDir();
    await fs.promises.mkdir(targetDir, { recursive: true });
    console.log(`[Migration] Target directory: ${targetDir}`);

    // Find all built-in assistants
    const entries = await fs.promises.readdir(resourcesAssistantDir, { withFileTypes: true });
    const assistantDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

    console.log(`[Migration] Found ${assistantDirs.length} built-in assistants to migrate`);

    // Migrate each assistant
    let successCount = 0;
    for (const entry of assistantDirs) {
      const sourcePath = path.join(resourcesAssistantDir, entry.name);
      const success = await migrateBuiltinAssistant(entry.name, sourcePath, targetDir);
      if (success) successCount++;
    }

    console.log(`[Migration] Successfully migrated ${successCount}/${assistantDirs.length} assistants`);

    // Mark migration as complete
    await markMigrationComplete();
    console.log('[Migration] Assistant resource migration completed');

    return true;
  } catch (error) {
    console.error('[Migration] Assistant resource migration failed:', error);
    return false;
  }
}

/**
 * Check if assistant ID fix migration is needed (v3 - fix assistant.json IDs)
 */
async function needsAssistantIdFixMigration(): Promise<boolean> {
  const MIGRATION_KEY = 'migration.assistantsIdFix_v1' as any;
  const migrationDone = await ProcessConfig.get(MIGRATION_KEY).catch(() => false);
  return !migrationDone;
}

/**
 * Mark assistant ID fix migration as completed
 */
async function markIdFixMigrationComplete(): Promise<void> {
  const MIGRATION_KEY = 'migration.assistantsIdFix_v1' as any;
  await ProcessConfig.set(MIGRATION_KEY, true);
}

/**
 * Run assistant ID fix migration (v3)
 *
 * This migration ensures that assistant.json IDs match their directory names.
 * This is necessary because some assistants may have been migrated with
 * ID: "video-generator" but directory: "builtin-video-generator"
 *
 * @returns true if migration succeeded or was not needed
 */
async function runAssistantIdFixMigration(): Promise<boolean> {
  try {
    // Check if migration needed
    const needed = await needsAssistantIdFixMigration();
    if (!needed) {
      console.log('[Migration] Assistant ID fix migration already completed, skipping');
      return true;
    }

    console.log('[Migration] Starting assistant ID fix migration...');

    const assistantsDir = getAssistantsDir();
    if (!fs.existsSync(assistantsDir)) {
      console.warn('[Migration] Assistants directory does not exist, skipping');
      await markIdFixMigrationComplete();
      return true;
    }

    const entries = fs.readdirSync(assistantsDir, { withFileTypes: true });
    const directories = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

    let fixed = 0;

    for (const dir of directories) {
      const dirName = dir.name;
      const configPath = path.join(assistantsDir, dirName, 'assistant.json');

      if (!fs.existsSync(configPath)) {
        continue;
      }

      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);

        // Check if ID matches directory name
        if (config.id !== dirName) {
          console.log(`[Migration]   Fixing ID: "${config.id}" -> "${dirName}" in ${dirName}/`);
          config.id = dirName;

          // Write updated config
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
          fixed++;
        }
      } catch (error) {
        console.error(`[Migration]   Error fixing ID for ${dirName}:`, error);
      }
    }

    console.log(`[Migration] Fixed ${fixed} assistant IDs`);

    // Mark migration as complete
    await markIdFixMigrationComplete();
    console.log('[Migration] Assistant ID fix migration completed');

    return true;
  } catch (error) {
    console.error('[Migration] Assistant ID fix migration failed:', error);
    return false;
  }
}

/**
 * Check if assistant flags fix migration is needed (v4 - fix isPreset/isBuiltin flags)
 */
async function needsAssistantFlagsFixMigration(): Promise<boolean> {
  const MIGRATION_KEY = 'migration.assistantsFlagsFix_v1' as any;
  const migrationDone = await ProcessConfig.get(MIGRATION_KEY).catch(() => false);
  return !migrationDone;
}

/**
 * Mark assistant flags fix migration as completed
 */
async function markFlagsFixMigrationComplete(): Promise<void> {
  const MIGRATION_KEY = 'migration.assistantsFlagsFix_v1' as any;
  await ProcessConfig.set(MIGRATION_KEY, true);
}

/**
 * Run assistant flags fix migration (v4)
 *
 * This migration ensures all assistants have correct isPreset and isBuiltin flags.
 * - Auto-discovered assistants from assistant/ directory should have isPreset: true
 * - Assistants with builtin- prefix should have isBuiltin: true
 *
 * @returns true if migration succeeded or was not needed
 */
async function runAssistantFlagsFixMigration(): Promise<boolean> {
  try {
    // Check if migration needed
    const needed = await needsAssistantFlagsFixMigration();
    if (!needed) {
      console.log('[Migration] Assistant flags fix migration already completed, skipping');
      return true;
    }

    console.log('[Migration] Starting assistant flags fix migration...');

    const assistantsDir = getAssistantsDir();
    if (!fs.existsSync(assistantsDir)) {
      console.warn('[Migration] Assistants directory does not exist, skipping');
      await markFlagsFixMigrationComplete();
      return true;
    }

    const entries = fs.readdirSync(assistantsDir, { withFileTypes: true });
    const directories = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

    let fixed = 0;

    for (const dir of directories) {
      const dirName = dir.name;
      const configPath = path.join(assistantsDir, dirName, 'assistant.json');

      if (!fs.existsSync(configPath)) {
        continue;
      }

      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        let modified = false;

        // Check if this is a builtin assistant
        const isBuiltinAssistant = dirName.startsWith('builtin-');

        // Fix isBuiltin flag
        if (isBuiltinAssistant && !config.isBuiltin) {
          console.log(`[Migration]   Adding isBuiltin: true to ${dirName}`);
          config.isBuiltin = true;
          modified = true;
        }

        // Fix isPreset flag for builtin assistants (they should all be presets)
        if (isBuiltinAssistant && !config.isPreset) {
          console.log(`[Migration]   Adding isPreset: true to ${dirName}`);
          config.isPreset = true;
          modified = true;
        }

        // Write updated config
        if (modified) {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
          fixed++;
        }
      } catch (error) {
        console.error(`[Migration]   Error fixing flags for ${dirName}:`, error);
      }
    }

    console.log(`[Migration] Fixed ${fixed} assistant flag configurations`);

    // Mark migration as complete
    await markFlagsFixMigrationComplete();
    console.log('[Migration] Assistant flags fix migration completed');

    return true;
  } catch (error) {
    console.error('[Migration] Assistant flags fix migration failed:', error);
    return false;
  }
}

/**
 * Run all assistant migrations in sequence
 *
 * This is the main entry point called from src/process/index.ts
 *
 * Migrations:
 * 1. v1: Copy built-in assistants from resources/ to Application Support
 * 2. v2: Restructure to nested file structure
 * 3. v3: Fix assistant.json IDs to match directory names
 * 4. v4: Fix isPreset and isBuiltin flags
 *
 * @returns true if all migrations succeeded
 */
export async function runAssistantMigration(): Promise<boolean> {
  try {
    // Run v1 migration: Copy from resources
    const v1Success = await runAssistantResourceMigration();
    if (!v1Success) {
      console.error('[Migration] Assistant resource migration (v1) failed');
      return false;
    }

    // Run v2 migration: Restructure to nested files
    const v2Success = await runAssistantStructureMigration();
    if (!v2Success) {
      console.error('[Migration] Assistant structure migration (v2) failed');
      return false;
    }

    // Run v3 migration: Fix assistant IDs to match directory names
    const v3Success = await runAssistantIdFixMigration();
    if (!v3Success) {
      console.error('[Migration] Assistant ID fix migration (v3) failed');
      return false;
    }

    // Run v4 migration: Fix isPreset and isBuiltin flags
    const v4Success = await runAssistantFlagsFixMigration();
    if (!v4Success) {
      console.error('[Migration] Assistant flags fix migration (v4) failed');
      return false;
    }

    console.log('[Migration] All assistant migrations completed successfully');
    return true;
  } catch (error) {
    console.error('[Migration] Assistant migrations failed:', error);
    return false;
  }
}
