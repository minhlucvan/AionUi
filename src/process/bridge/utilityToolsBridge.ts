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

/** GitHub CLI skill content (SKILL.md) */
const GITHUB_CLI_SKILL_CONTENT = `---
name: github-cli
description: |
  Use the GitHub CLI (gh) to interact with GitHub resources.
  Use when: managing repositories, issues, pull requests, releases, and GitHub Actions.
---

# GitHub CLI

## Instructions
Use the GitHub CLI to interact with GitHub resources for getting information about repositories, issues, pull requests, and more.
Use the GitHub CLI to set action secrets for the user.

USAGE
  gh <command> <subcommand> [flags]

CORE COMMANDS
  auth:          Authenticate gh and git with GitHub
  browse:        Open repositories, issues, pull requests, and more in the browser
  codespace:     Connect to and manage codespaces
  gist:          Manage gists
  issue:         Manage issues
  org:           Manage organizations
  pr:            Manage pull requests
  project:       Work with GitHub Projects.
  release:       Manage releases
  repo:          Manage repositories

GITHUB ACTIONS COMMANDS
  cache:         Manage GitHub Actions caches
  run:           View details about workflow runs
  workflow:      View details about GitHub Actions workflows

ALIAS COMMANDS
  co:            Alias for "pr checkout"

ADDITIONAL COMMANDS
  alias:         Create command shortcuts
  api:           Make an authenticated GitHub API request
  attestation:   Work with artifact attestations
  completion:    Generate shell completion scripts
  config:        Manage configuration for gh
  extension:     Manage gh extensions
  gpg-key:       Manage GPG keys
  label:         Manage labels
  ruleset:       View info about repo rulesets
  search:        Search for repositories, issues, and pull requests
  secret:        Manage GitHub secrets
  ssh-key:       Manage SSH keys
  status:        Print information about relevant issues, pull requests, and notifications across repositories
  variable:      Manage GitHub Actions variables

FLAGS
  --help      Show help for command
  --version   Show gh version

EXAMPLES
  $ gh issue create
  $ gh repo clone cli/cli
  $ gh pr checkout 321

LEARN MORE
  Use \`gh <command> <subcommand> --help\` for more information about a command.
  Read the manual at https://cli.github.com/manual
  Learn about exit codes using \`gh help exit-codes\`
`;

/** Utility tool definition */
interface UtilityToolDef {
  id: string;
  name: string;
  description: string;
  cliCommand: string;
  installCommand: Record<string, string>; // platform -> command
  updateCommand?: string;
  loginCommand?: string;
  loginStatusCommand?: string;
  versionCommand?: string;
  installUrl?: string;
  /** Skill name to install alongside this tool */
  skillName?: string;
}

/** Registry of known utility CLI tools */
const UTILITY_TOOLS: UtilityToolDef[] = [
  {
    id: 'gh',
    name: 'GitHub CLI',
    description: 'GitHub official CLI for managing repos, issues, PRs, and more',
    cliCommand: 'gh',
    installCommand: {
      darwin: 'brew install gh',
      linux: '(type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y)) && sudo mkdir -p -m 755 /etc/apt/keyrings && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y',
      win32: 'winget install --id GitHub.cli',
    },
    updateCommand: 'gh upgrade',
    loginCommand: 'gh auth login --web',
    loginStatusCommand: 'gh auth status',
    versionCommand: 'gh --version',
    installUrl: 'https://cli.github.com/',
    skillName: 'github-cli',
  },
];

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
    const versionMatch = output.match(/v?(\d+\.\d+[\.\d]*[-\w]*)/);
    return versionMatch ? versionMatch[0] : output.split('\n')[0].trim();
  } catch {
    return undefined;
  }
}

/** Check login status for gh */
function checkGhLoginStatus(): { loggedIn: boolean; loginUser?: string } {
  try {
    const output = execSync('gh auth status', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000,
    }).trim();
    // gh auth status outputs "Logged in to github.com account USERNAME ..."
    const userMatch = output.match(/account\s+(\S+)/i) || output.match(/Logged in to \S+ as (\S+)/i);
    return {
      loggedIn: true,
      loginUser: userMatch ? userMatch[1] : undefined,
    };
  } catch {
    return { loggedIn: false };
  }
}

/** Check if a skill is installed */
function isSkillInstalled(skillName: string): boolean {
  const skillsDir = getSkillsDir();
  const skillDir = path.join(skillsDir, skillName);
  const skillFile = path.join(skillDir, 'SKILL.md');
  return fs.existsSync(skillFile);
}

/** Install a skill by writing SKILL.md */
function installSkillLocally(skillName: string, content: string): string {
  const skillsDir = getSkillsDir();
  const skillDir = path.join(skillsDir, skillName);

  // Ensure directory exists
  fs.mkdirSync(skillDir, { recursive: true });

  const skillFile = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(skillFile, content, 'utf-8');

  return skillDir;
}

/** Get platform-specific install command */
function getInstallCommand(tool: UtilityToolDef): string | undefined {
  return tool.installCommand[process.platform] || tool.installCommand['linux'];
}

export function initUtilityToolsBridge(): void {
  // Get status of all utility tools
  ipcBridge.utilityTools.getStatus.provider(() => {
    const results = UTILITY_TOOLS.map((tool) => {
      const cliPath = detectCli(tool.cliCommand);
      const installed = !!cliPath;

      let version: string | undefined;
      let loggedIn: boolean | undefined;
      let loginUser: string | undefined;

      if (installed) {
        version = getCliVersion(cliPath!, tool.versionCommand);

        if (tool.loginStatusCommand) {
          const loginStatus = checkGhLoginStatus();
          loggedIn = loginStatus.loggedIn;
          loginUser = loginStatus.loginUser;
        }
      }

      const skillInstalled = tool.skillName ? isSkillInstalled(tool.skillName) : undefined;

      return {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        cliCommand: tool.cliCommand,
        installed,
        version,
        loggedIn,
        loginUser,
        installCommand: getInstallCommand(tool),
        updateCommand: tool.updateCommand,
        loginCommand: tool.loginCommand,
        installUrl: tool.installUrl,
        hasSkill: !!tool.skillName,
        skillInstalled: skillInstalled ?? false,
      };
    });

    return Promise.resolve({ success: true, data: results });
  });

  // Install a utility tool
  ipcBridge.utilityTools.install.provider(async ({ toolId }) => {
    const tool = UTILITY_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return { success: false, msg: `Unknown utility tool: ${toolId}` };
    }

    const installCmd = getInstallCommand(tool);
    if (!installCmd) {
      return {
        success: false,
        msg: `No install command available for ${tool.name} on ${process.platform}. Please visit ${tool.installUrl || 'the documentation'} to install manually.`,
      };
    }

    try {
      console.log(`[UtilityTools] Installing ${tool.name}: ${installCmd}`);
      const { stdout, stderr } = await execAsync(installCmd, {
        timeout: 180000, // 3 minute timeout
        env: { ...process.env },
      });

      const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();
      console.log(`[UtilityTools] Install completed for ${tool.name}:`, output.slice(0, 200));

      // Auto-install skill if defined
      if (tool.skillName) {
        try {
          const skillContent = getSkillContent(tool.skillName);
          if (skillContent) {
            installSkillLocally(tool.skillName, skillContent);
            console.log(`[UtilityTools] Skill '${tool.skillName}' installed alongside ${tool.name}`);
          }
        } catch (skillError) {
          console.warn(`[UtilityTools] Failed to install skill for ${tool.name}:`, skillError);
        }
      }

      return { success: true, data: { output } };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[UtilityTools] Install failed for ${tool.name}:`, errorMsg);
      return {
        success: false,
        msg: `Installation failed: ${errorMsg}`,
        data: { output: errorMsg },
      };
    }
  });

  // Update a utility tool
  ipcBridge.utilityTools.update.provider(async ({ toolId }) => {
    const tool = UTILITY_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return { success: false, msg: `Unknown utility tool: ${toolId}` };
    }

    if (!tool.updateCommand) {
      return { success: false, msg: `No update command available for ${tool.name}.` };
    }

    try {
      console.log(`[UtilityTools] Updating ${tool.name}: ${tool.updateCommand}`);
      const { stdout, stderr } = await execAsync(tool.updateCommand, {
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
    const tool = UTILITY_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return { success: false, msg: `Unknown utility tool: ${toolId}` };
    }

    if (!tool.loginCommand) {
      return { success: false, msg: `No login command available for ${tool.name}.` };
    }

    try {
      console.log(`[UtilityTools] Logging in to ${tool.name}: ${tool.loginCommand}`);
      const { stdout, stderr } = await execAsync(tool.loginCommand, {
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
    const tool = UTILITY_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return { success: false, msg: `Unknown utility tool: ${toolId}` };
    }

    if (!tool.skillName) {
      return { success: false, msg: `No skill available for ${tool.name}.` };
    }

    try {
      const skillContent = getSkillContent(tool.skillName);
      if (!skillContent) {
        return { success: false, msg: `Skill content not found for ${tool.skillName}.` };
      }

      const installPath = installSkillLocally(tool.skillName, skillContent);
      console.log(`[UtilityTools] Skill '${tool.skillName}' installed at ${installPath}`);

      return {
        success: true,
        data: { skillName: tool.skillName, installPath },
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

/** Get embedded skill content by skill name */
function getSkillContent(skillName: string): string | undefined {
  const skillMap: Record<string, string> = {
    'github-cli': GITHUB_CLI_SKILL_CONTENT,
  };
  return skillMap[skillName];
}
