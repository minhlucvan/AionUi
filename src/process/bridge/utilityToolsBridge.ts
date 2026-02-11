/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);
import { ipcBridge } from '../../common';
import { getSkillsDir } from '../initStorage';
import { toolRegistry } from '../services/toolRegistry';
import type { ToolManifest } from '@/common/types/tool';

/** Detect if a CLI command is available */
function detectCli(command: string): string | undefined {
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    return execSync(`${whichCmd} ${command}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    })
      .trim()
      .split('\n')[0];
  } catch {
    return undefined;
  }
}

/** Get version of a CLI tool */
function getCliVersion(cliPath: string, versionCommand?: string): string | undefined {
  try {
    const cmd = versionCommand || `${cliPath} --version`;
    const output = execSync(cmd, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    }).trim();
    const versionMatch = output.match(/v?(\d+\.\d+[.\d]*[-\w]*)/);
    return versionMatch ? versionMatch[0] : output.split('\n')[0].trim();
  } catch {
    return undefined;
  }
}

/** Check login status by running the tool's loginStatusCommand */
function checkLoginStatus(loginStatusCommand: string): { loggedIn: boolean; loginUser?: string } {
  try {
    const output = execSync(loginStatusCommand, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000,
    }).trim();
    // Try common patterns to extract username
    const userMatch = output.match(/account\s+(\S+)/i) || output.match(/Logged in to \S+ as (\S+)/i);
    return {
      loggedIn: true,
      loginUser: userMatch ? userMatch[1] : undefined,
    };
  } catch {
    return { loggedIn: false };
  }
}

/** Check if a skill is installed in the user's skills directory */
function isSkillInstalled(skillName: string): boolean {
  const skillsDir = getSkillsDir();
  const skillDir = path.join(skillsDir, skillName);
  const skillFile = path.join(skillDir, 'SKILL.md');
  return fs.existsSync(skillFile);
}

/** Install a skill by writing SKILL.md to the user's skills directory */
function installSkillLocally(skillName: string, content: string): string {
  const skillsDir = getSkillsDir();
  const skillDir = path.join(skillsDir, skillName);

  fs.mkdirSync(skillDir, { recursive: true });

  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(skillFile, content, 'utf-8');

  return skillDir;
}

/** Get platform-specific install command from a tool manifest */
function getInstallCommand(manifest: ToolManifest): string | undefined {
  if (manifest.type !== 'utility') return undefined;
  const installCmd = manifest.installCommand;
  if (typeof installCmd === 'string') return installCmd;
  return installCmd[process.platform] || installCmd['linux'];
}

export function initUtilityToolsBridge(): void {
  // Initialize the tool registry
  toolRegistry.initialize();

  // Expose ACP backend configs to renderer via IPC
  ipcBridge.toolRegistryBridge.getAcpBackends.provider(() => {
    return Promise.resolve({ success: true, data: toolRegistry.getAcpBackendsAll() });
  });

  // Get status of all utility tools
  ipcBridge.utilityTools.getStatus.provider(() => {
    const loadedTools = toolRegistry.getUtilityTools();

    const results = loadedTools.map(({ manifest, toolDir }) => {
      const cliPath = detectCli(manifest.cliCommand);
      const installed = !!cliPath;

      let version: string | undefined;
      let loggedIn: boolean | undefined;
      let loginUser: string | undefined;

      if (installed) {
        version = getCliVersion(cliPath!, manifest.versionCommand);

        if (manifest.loginStatusCommand) {
          const loginStatus = checkLoginStatus(manifest.loginStatusCommand);
          loggedIn = loginStatus.loggedIn;
          loginUser = loginStatus.loginUser;
        }
      }

      const firstSkill = manifest.skills?.[0];
      const hasSkill = !!firstSkill && toolRegistry.hasSkillContent(manifest.id, firstSkill);
      const skillInstalled = firstSkill ? isSkillInstalled(firstSkill) : false;

      return {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        cliCommand: manifest.cliCommand,
        installed,
        version,
        loggedIn,
        loginUser,
        installCommand: getInstallCommand(manifest),
        updateCommand: manifest.updateCommand,
        loginCommand: manifest.loginCommand,
        installUrl: manifest.installUrl,
        hasSkill,
        skillInstalled,
        toolDir,
      };
    });

    return Promise.resolve({ success: true, data: results });
  });

  // Install a utility tool
  ipcBridge.utilityTools.install.provider(async ({ toolId }) => {
    const loaded = toolRegistry.getById(toolId);
    if (!loaded) {
      return { success: false, msg: `Unknown utility tool: ${toolId}` };
    }

    const { manifest } = loaded;
    const installCmd = getInstallCommand(manifest);
    if (!installCmd) {
      return {
        success: false,
        msg: `No install command available for ${manifest.name} on ${process.platform}. Please visit ${manifest.installUrl || 'the documentation'} to install manually.`,
      };
    }

    try {
      console.log(`[UtilityTools] Installing ${manifest.name}: ${installCmd}`);
      const { stdout, stderr } = await execAsync(installCmd, {
        timeout: 180000,
        env: { ...process.env },
      });

      const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();
      console.log(`[UtilityTools] Install completed for ${manifest.name}:`, output.slice(0, 200));

      // Auto-install skills if defined
      if (manifest.type === 'utility' && manifest.skills) {
        for (const skillName of manifest.skills) {
          try {
            const skillContent = toolRegistry.getSkillContent(toolId, skillName);
            if (skillContent) {
              installSkillLocally(skillName, skillContent);
              console.log(`[UtilityTools] Skill '${skillName}' installed alongside ${manifest.name}`);
            }
          } catch (skillError) {
            console.warn(`[UtilityTools] Failed to install skill '${skillName}' for ${manifest.name}:`, skillError);
          }
        }
      }

      return { success: true, data: { output } };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[UtilityTools] Install failed for ${manifest.name}:`, errorMsg);
      return {
        success: false,
        msg: `Installation failed: ${errorMsg}`,
        data: { output: errorMsg },
      };
    }
  });

  // Update a utility tool
  ipcBridge.utilityTools.update.provider(async ({ toolId }) => {
    const loaded = toolRegistry.getById(toolId);
    if (!loaded) {
      return { success: false, msg: `Unknown utility tool: ${toolId}` };
    }

    const { manifest } = loaded;
    if (manifest.type !== 'utility' || !manifest.updateCommand) {
      return { success: false, msg: `No update command available for ${manifest.name}.` };
    }

    try {
      console.log(`[UtilityTools] Updating ${manifest.name}: ${manifest.updateCommand}`);
      const { stdout, stderr } = await execAsync(manifest.updateCommand, {
        timeout: 120000,
        env: { ...process.env },
      });

      const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();
      return { success: true, data: { output } };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        msg: `Update failed: ${errorMsg}`,
        data: { output: errorMsg },
      };
    }
  });

  // Login to a utility tool
  ipcBridge.utilityTools.login.provider(async ({ toolId }) => {
    const loaded = toolRegistry.getById(toolId);
    if (!loaded) {
      return { success: false, msg: `Unknown utility tool: ${toolId}` };
    }

    const { manifest } = loaded;
    if (manifest.type !== 'utility' || !manifest.loginCommand) {
      return { success: false, msg: `No login command available for ${manifest.name}.` };
    }

    try {
      console.log(`[UtilityTools] Logging in to ${manifest.name}: ${manifest.loginCommand}`);
      const { stdout, stderr } = await execAsync(manifest.loginCommand, {
        timeout: 120000,
        env: { ...process.env },
      });

      const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();
      return { success: true, data: { output } };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        msg: `Login failed: ${errorMsg}`,
        data: { output: errorMsg },
      };
    }
  });

  // Install a skill associated with a utility tool
  ipcBridge.utilityTools.installSkill.provider(async ({ toolId }) => {
    const loaded = toolRegistry.getById(toolId);
    if (!loaded) {
      return { success: false, msg: `Unknown utility tool: ${toolId}` };
    }

    const { manifest } = loaded;
    if (manifest.type !== 'utility') {
      return { success: false, msg: `No skill available for ${manifest.name}.` };
    }
    const firstSkill = manifest.skills?.[0];
    if (!firstSkill) {
      return { success: false, msg: `No skill available for ${manifest.name}.` };
    }

    try {
      const skillContent = toolRegistry.getSkillContent(toolId, firstSkill);
      if (!skillContent) {
        return { success: false, msg: `Skill content not found for ${firstSkill}.` };
      }

      const installPath = installSkillLocally(firstSkill, skillContent);
      console.log(`[UtilityTools] Skill '${firstSkill}' installed at ${installPath}`);

      return {
        success: true,
        data: { skillName: firstSkill, installPath },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        msg: `Skill installation failed: ${errorMsg}`,
      };
    }
  });
}
