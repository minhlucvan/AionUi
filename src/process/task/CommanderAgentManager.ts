/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommanderAgent } from '@/agent/commander';
import { ipcBridge } from '@/common';
import type { TMessage } from '@/common/chatLib';
import { transformMessage } from '@/common/chatLib';
import type { IResponseMessage } from '@/common/ipcBridge';
import { parseError, uuid } from '@/common/utils';
import type { AcpBackend, AcpPermissionOption, AcpPermissionRequest } from '@/types/acpTypes';
import { ACP_BACKENDS_ALL } from '@/types/acpTypes';
import { getDatabase } from '@process/database';
import { ProcessConfig } from '../initStorage';
import { addMessage, addOrUpdateMessage, nextTickToLocalFinish } from '../message';
import { cronBusyGuard } from '@process/services/cron/CronBusyGuard';

import BaseAgentManager from './BaseAgentManager';

interface CommanderAgentManagerData {
  workspace?: string;
  backend: AcpBackend;
  cliPath?: string;
  customWorkspace?: boolean;
  conversation_id: string;
  customAgentId?: string;
  presetContext?: string;
  enabledSkills?: string[];
  yoloMode?: boolean;
  acpSessionId?: string;
  acpSessionUpdatedAt?: number;
}

class CommanderAgentManager extends BaseAgentManager<CommanderAgentManagerData, AcpPermissionOption> {
  workspace: string;
  agent: CommanderAgent;
  private bootstrap: Promise<CommanderAgent> | undefined;
  private isFirstMessage: boolean = true;
  options: CommanderAgentManagerData;

  constructor(data: CommanderAgentManagerData) {
    super('commander', data);
    this.conversation_id = data.conversation_id;
    this.workspace = data.workspace;
    this.options = data;
    this.status = 'pending';
  }

  initAgent(data: CommanderAgentManagerData = this.options) {
    if (this.bootstrap) return this.bootstrap;
    this.bootstrap = (async () => {
      let cliPath = data.cliPath;
      let customArgs: string[] | undefined;
      let customEnv: Record<string, string> | undefined;

      // Handle built-in backends: read from acp.config
      if (data.backend !== 'custom') {
        const config = await ProcessConfig.get('acp.config');
        if (!cliPath && config?.[data.backend]?.cliPath) {
          cliPath = config[data.backend].cliPath;
        }

        // Get acpArgs from backend config
        const backendConfig = ACP_BACKENDS_ALL[data.backend];
        if (backendConfig?.acpArgs) {
          customArgs = backendConfig.acpArgs;
        }

        if (!cliPath && backendConfig?.cliCommand) {
          cliPath = backendConfig.cliCommand;
        }
      }

      this.agent = new CommanderAgent({
        id: data.conversation_id,
        workspace: data.workspace,
        backend: data.backend,
        cliPath: cliPath,
        customArgs: customArgs,
        customEnv: customEnv,
        yoloMode: data.yoloMode ?? true, // Commander defaults to auto-approve
        acpSessionId: data.acpSessionId,
        acpSessionUpdatedAt: data.acpSessionUpdatedAt,
        onSessionIdUpdate: (sessionId: string) => {
          this.saveSessionId(sessionId);
        },
        onStreamEvent: (message) => {
          // Mark as finished when content is output
          const contentTypes: string[] = ['content', 'agent_status', 'acp_tool_call', 'plan'];
          if (contentTypes.indexOf(message.type) >= 0) {
            this.status = 'finished';
          }

          if (message.type !== 'thought') {
            const tMessage = transformMessage(message as IResponseMessage);
            if (tMessage) {
              addOrUpdateMessage(message.conversation_id, tMessage, data.backend);
            }
          }

          // Forward to frontend
          ipcBridge.acpConversation.responseStream.emit(message as IResponseMessage);
        },
        onSignalEvent: async (v) => {
          if (v.type === 'acp_permission') {
            const { toolCall, options } = v.data as AcpPermissionRequest;
            this.addConfirmation({
              title: toolCall.title || 'messages.permissionRequest',
              action: 'messages.command',
              id: v.msg_id,
              description: toolCall.rawInput?.description || 'messages.agentRequestingPermission',
              callId: toolCall.toolCallId || v.msg_id,
              options: options.map((option) => ({
                label: option.name,
                value: option,
              })),
            });
            return;
          }

          // Clear busy guard when commander finishes
          if (v.type === 'finish') {
            cronBusyGuard.setProcessing(this.conversation_id, false);
          }

          ipcBridge.acpConversation.responseStream.emit(v);
        },
      });
      return this.agent.start().then(() => this.agent);
    })();
    return this.bootstrap;
  }

  async sendMessage(data: { content: string; files?: string[]; msg_id?: string }): Promise<{
    success: boolean;
    msg?: string;
    message?: string;
  }> {
    cronBusyGuard.setProcessing(this.conversation_id, true);
    this.status = 'running';
    try {
      await this.initAgent(this.options);

      // Save user message to chat history
      if (data.msg_id && data.content) {
        let contentToSend = data.content;

        // Inject commander system prompt on first message
        if (this.isFirstMessage && this.options.presetContext) {
          contentToSend = `<system_instruction>\n${this.options.presetContext}\n</system_instruction>\n\n${contentToSend}`;
        }

        const userMessage: TMessage = {
          id: data.msg_id,
          msg_id: data.msg_id,
          type: 'text',
          position: 'right',
          conversation_id: this.conversation_id,
          content: { content: data.content },
          createdAt: Date.now(),
        };
        addMessage(this.conversation_id, userMessage);
        const userResponseMessage: IResponseMessage = {
          type: 'user_content',
          conversation_id: this.conversation_id,
          msg_id: data.msg_id,
          data: userMessage.content.content,
        };
        ipcBridge.acpConversation.responseStream.emit(userResponseMessage);

        const result = await this.agent.sendMessage({ ...data, content: contentToSend });
        if (this.isFirstMessage) {
          this.isFirstMessage = false;
        }
        return result;
      }
      return await this.agent.sendMessage(data);
    } catch (e) {
      cronBusyGuard.setProcessing(this.conversation_id, false);
      this.status = 'finished';
      const message: IResponseMessage = {
        type: 'error',
        conversation_id: this.conversation_id,
        msg_id: data.msg_id || uuid(),
        data: parseError(e),
      };

      const tMessage = transformMessage(message);
      if (tMessage) {
        addOrUpdateMessage(this.conversation_id, tMessage);
      }

      ipcBridge.acpConversation.responseStream.emit(message);
      return new Promise((_, reject) => {
        nextTickToLocalFinish(() => {
          reject(e);
        });
      });
    }
  }

  async confirm(id: string, callId: string, data: AcpPermissionOption) {
    super.confirm(id, callId, data);
    await this.bootstrap;
    void this.agent.confirmMessage({
      confirmKey: data.optionId,
      callId: callId,
    });
  }

  async stop() {
    if (this.agent) {
      return this.agent.stop();
    }
    return Promise.resolve();
  }

  private saveSessionId(sessionId: string): void {
    try {
      const db = getDatabase();
      const result = db.getConversation(this.conversation_id);
      if (result.success && result.data) {
        const conversation = result.data;
        const updatedExtra = {
          ...conversation.extra,
          acpSessionId: sessionId,
          acpSessionUpdatedAt: Date.now(),
        };
        db.updateConversation(this.conversation_id, { extra: updatedExtra } as Partial<typeof conversation>);
        console.log(`[CommanderAgentManager] Saved session ID: ${sessionId} for conversation: ${this.conversation_id}`);
      }
    } catch (error) {
      console.error('[CommanderAgentManager] Failed to save session ID:', error);
    }
  }
}

export default CommanderAgentManager;
