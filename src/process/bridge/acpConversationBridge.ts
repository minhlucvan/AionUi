/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { acpDetector } from '@/agent/acp/AcpDetector';
import { AcpConnection } from '@/agent/acp/AcpConnection';
import { CodexConnection } from '@/agent/codex/connection/CodexConnection';
import { ACP_BACKENDS_ALL } from '@/types/acpTypes';
import type { AcpBackendAll } from '@/types/acpTypes';
import { ipcBridge } from '../../common';
import * as os from 'os';

/** Known install/setup commands for CLI tools */
const CLI_INSTALL_INFO: Partial<Record<AcpBackendAll, { installCommand?: string; setupCommand?: string; installUrl?: string }>> = {
  claude: { installCommand: 'npm install -g @anthropic-ai/claude-code', setupCommand: 'claude --version', installUrl: 'https://docs.anthropic.com/en/docs/claude-code' },
  codex: { installCommand: 'npm install -g @openai/codex', setupCommand: 'codex --version', installUrl: 'https://github.com/openai/codex' },
  qwen: { installCommand: 'npm install -g @qwen-code/qwen-code', setupCommand: 'qwen --version', installUrl: 'https://github.com/QwenLM/qwen-code' },
  goose: { installCommand: 'brew install block/goose/goose', setupCommand: 'goose --version', installUrl: 'https://github.com/block/goose' },
  copilot: { installUrl: 'https://github.com/github/copilot-cli' },
  opencode: { installCommand: 'npm install -g opencode-ai', setupCommand: 'opencode --version', installUrl: 'https://github.com/nichochar/opencode' },
  kimi: { installCommand: 'curl -LsSf https://code.kimi.com/install.sh | bash', setupCommand: 'kimi --version', installUrl: 'https://github.com/MoonshotAI/kimi-cli' },
  auggie: { installUrl: 'https://www.augmentcode.com/' },
  iflow: { installUrl: 'https://iflow.dev/' },
  droid: { installUrl: 'https://www.factory.ai/' },
  qoder: { installUrl: 'https://github.com/qoder-ai/qodercli' },
  'openclaw-gateway': { installUrl: 'https://github.com/openclaw/openclaw' },
};

export function initAcpConversationBridge(): void {
  // Debug provider to check environment variables
  ipcBridge.acpConversation.checkEnv.provider(() => {
    return Promise.resolve({
      env: {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '[SET]' : '[NOT SET]',
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT ? '[SET]' : '[NOT SET]',
        NODE_ENV: process.env.NODE_ENV || '[NOT SET]',
      },
    });
  });

  // 保留旧的detectCliPath接口用于向后兼容，但使用新检测器的结果
  ipcBridge.acpConversation.detectCliPath.provider(({ backend }) => {
    const agents = acpDetector.getDetectedAgents();
    const agent = agents.find((a) => a.backend === backend);

    if (agent?.cliPath) {
      return Promise.resolve({ success: true, data: { path: agent.cliPath } });
    }

    return Promise.resolve({ success: false, msg: `${backend} CLI not found. Please install it and ensure it's accessible.` });
  });

  // 新的ACP检测接口 - 基于全局标记位
  ipcBridge.acpConversation.getAvailableAgents.provider(() => {
    try {
      const agents = acpDetector.getDetectedAgents();
      return Promise.resolve({ success: true, data: agents });
    } catch (error) {
      return Promise.resolve({
        success: false,
        msg: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Refresh custom agents detection - called when custom agents config changes
  ipcBridge.acpConversation.refreshCustomAgents.provider(async () => {
    try {
      await acpDetector.refreshCustomAgents();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        msg: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Check agent health by sending a real test message
  // This is the most reliable way to verify an agent can actually respond
  ipcBridge.acpConversation.checkAgentHealth.provider(async ({ backend }) => {
    const startTime = Date.now();

    // Step 1: Check if CLI is installed
    const agents = acpDetector.getDetectedAgents();
    const agent = agents.find((a) => a.backend === backend);

    // Skip CLI check for claude (uses npx) and codex (has its own detection)
    if (!agent?.cliPath && backend !== 'claude' && backend !== 'codex') {
      return {
        success: false,
        msg: `${backend} CLI not found`,
        data: { available: false, error: 'CLI not installed' },
      };
    }

    const tempDir = os.tmpdir();

    // Step 2: Handle Codex separately - it uses MCP protocol, not ACP
    if (backend === 'codex') {
      const codexConnection = new CodexConnection();
      try {
        // Start Codex MCP server
        await codexConnection.start(agent?.cliPath || 'codex', tempDir);

        // Wait for server to be ready and ping it
        await codexConnection.waitForServerReady(15000);
        const pingResult = await codexConnection.ping(5000);

        if (!pingResult) {
          throw new Error('Codex server not responding to ping');
        }

        const latency = Date.now() - startTime;
        void codexConnection.stop();

        return {
          success: true,
          data: { available: true, latency },
        };
      } catch (error) {
        try {
          void codexConnection.stop();
        } catch {
          // Ignore stop errors
        }

        const errorMsg = error instanceof Error ? error.message : String(error);
        const lowerError = errorMsg.toLowerCase();

        if (lowerError.includes('auth') || lowerError.includes('login') || lowerError.includes('api key') || lowerError.includes('not found') || lowerError.includes('command not found')) {
          return {
            success: false,
            msg: `codex not available`,
            data: { available: false, error: errorMsg },
          };
        }

        return {
          success: false,
          msg: `codex health check failed: ${errorMsg}`,
          data: { available: false, error: errorMsg },
        };
      }
    }

    // Step 3: For ACP-based agents (claude, gemini, qwen, etc.)
    const connection = new AcpConnection();

    try {
      // Connect to the agent
      await connection.connect(backend, agent?.cliPath, tempDir, agent?.acpArgs);

      // Create a new session
      await connection.newSession(tempDir);

      // Send a minimal test message - just need to verify we can communicate
      // Using a simple prompt that should get a quick response
      await connection.sendPrompt('hi');

      // If we get here, the agent responded successfully
      const latency = Date.now() - startTime;

      // Clean up
      connection.disconnect();

      return {
        success: true,
        data: { available: true, latency },
      };
    } catch (error) {
      // Clean up on error
      try {
        connection.disconnect();
      } catch {
        // Ignore disconnect errors
      }

      const errorMsg = error instanceof Error ? error.message : String(error);
      const lowerError = errorMsg.toLowerCase();

      // Check for authentication-related errors
      if (lowerError.includes('auth') || lowerError.includes('login') || lowerError.includes('credential') || lowerError.includes('api key') || lowerError.includes('unauthorized') || lowerError.includes('forbidden')) {
        return {
          success: false,
          msg: `${backend} not authenticated`,
          data: { available: false, error: 'Not authenticated' },
        };
      }

      return {
        success: false,
        msg: `${backend} health check failed: ${errorMsg}`,
        data: { available: false, error: errorMsg },
      };
    }
  });

  // Get CLI version info for all known backends
  ipcBridge.acpConversation.getCliVersions.provider(() => {
    const detectedAgents = acpDetector.getDetectedAgents();

    const results = Object.entries(ACP_BACKENDS_ALL)
      .filter(([id, config]) => {
        // Exclude gemini (built-in) and custom (user-configured)
        if (id === 'gemini' || id === 'custom') return false;
        return config.enabled && config.cliCommand;
      })
      .map(([id, config]) => {
        const backendId = id as AcpBackendAll;
        const detected = detectedAgents.find((a) => a.backend === backendId);
        const installed = !!detected?.cliPath;
        const installInfo = CLI_INSTALL_INFO[backendId];

        let version: string | undefined;
        if (installed && detected?.cliPath) {
          try {
            const output = execSync(`${detected.cliPath} --version`, {
              encoding: 'utf-8',
              stdio: 'pipe',
              timeout: 5000,
            }).trim();
            // Extract version from output - often contains extra text
            const versionMatch = output.match(/v?(\d+\.\d+[\.\d]*[-\w]*)/);
            version = versionMatch ? versionMatch[0] : output.split('\n')[0].trim();
          } catch {
            // Version command failed - CLI may not support --version
            version = undefined;
          }
        }

        return {
          backend: backendId,
          name: config.name,
          installed,
          version,
          cliCommand: config.cliCommand,
          installCommand: installInfo?.installCommand,
          installUrl: installInfo?.installUrl,
        };
      });

    return Promise.resolve({ success: true, data: results });
  });

  // Install a CLI tool via its install command
  ipcBridge.acpConversation.installCli.provider(async ({ backend }) => {
    const backendId = backend as AcpBackendAll;
    const installInfo = CLI_INSTALL_INFO[backendId];
    const backendConfig = ACP_BACKENDS_ALL[backendId];

    if (!installInfo?.installCommand) {
      return {
        success: false,
        msg: `No install command available for ${backendConfig?.name || backend}. Please visit the documentation to install manually.`,
      };
    }

    try {
      console.log(`[ACP] Installing CLI: ${installInfo.installCommand}`);
      const { stdout, stderr } = await execAsync(installInfo.installCommand, {
        timeout: 120000, // 2 minute timeout for install
        env: { ...process.env },
      });

      const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();
      console.log(`[ACP] Install completed for ${backend}:`, output.slice(0, 200));

      // Re-initialize detector to pick up the newly installed CLI
      await acpDetector.reinitialize();

      return {
        success: true,
        data: { output },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ACP] Install failed for ${backend}:`, errorMsg);
      return {
        success: false,
        msg: `Installation failed: ${errorMsg}`,
        data: { output: errorMsg },
      };
    }
  });

  // Setup/verify a CLI tool after installation
  ipcBridge.acpConversation.setupCli.provider(async ({ backend }) => {
    const backendId = backend as AcpBackendAll;
    const installInfo = CLI_INSTALL_INFO[backendId];
    const backendConfig = ACP_BACKENDS_ALL[backendId];

    if (!installInfo?.setupCommand) {
      return {
        success: false,
        msg: `No setup command available for ${backendConfig?.name || backend}.`,
      };
    }

    try {
      console.log(`[ACP] Running setup for ${backend}: ${installInfo.setupCommand}`);
      const { stdout, stderr } = await execAsync(installInfo.setupCommand, {
        timeout: 30000,
        env: { ...process.env },
      });

      const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();
      return {
        success: true,
        data: { output },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        msg: `Setup failed: ${errorMsg}`,
        data: { output: errorMsg },
      };
    }
  });
}
