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
import { ConfigStorage } from '@/common/storage';

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
  const migrationDone = await ConfigStorage.get(MIGRATION_KEY).catch(() => false);
  return !migrationDone;
}

/**
 * Mark migration as completed
 */
async function markMigrationComplete(): Promise<void> {
  const MIGRATION_KEY = 'migration.assistantsToAppSupport_v1';
  await ConfigStorage.set(MIGRATION_KEY, true);
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

    const targetPath = path.join(targetDir, assistantId);

    // Skip if already exists
    if (fs.existsSync(targetPath)) {
      console.log(`[Migration] Assistant already exists, skipping: ${assistantId}`);
      return true;
    }

    // Copy assistant directory
    await copyDirectoryRecursively(sourcePath, targetPath, { overwrite: false });
    console.log(`[Migration] Copied to: ${targetPath}`);

    // Update or create assistant.json with isBuiltin flag
    const configPath = path.join(targetPath, 'assistant.json');
    if (fs.existsSync(configPath)) {
      const configContent = await fs.promises.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      config.isBuiltin = true;

      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`[Migration] Marked as built-in: ${assistantId}`);
    }

    return true;
  } catch (error) {
    console.error(`[Migration] Failed to migrate assistant ${assistantId}:`, error);
    return false;
  }
}

/**
 * Run assistant migration
 *
 * This function:
 * 1. Checks if migration is needed
 * 2. Copies built-in assistants from resources/ to Application Support
 * 3. Marks assistants as built-in
 * 4. Records migration as complete
 *
 * @returns true if migration succeeded or was not needed
 */
export async function runAssistantMigration(): Promise<boolean> {
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
    console.log('[Migration] Assistant migration completed');

    return true;
  } catch (error) {
    console.error('[Migration] Assistant migration failed:', error);
    return false;
  }
}
