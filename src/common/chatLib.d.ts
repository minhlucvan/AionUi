/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
import type { IResponseMessage } from './ipcBridge';
import type { AcpBackend, AcpPermissionRequest, ToolCallUpdate } from '@/types/acpTypes';
import type { CodexPermissionRequest } from '@/common/codex/types';
import type { ExecCommandBeginData, ExecCommandOutputDeltaData, ExecCommandEndData, PatchApplyBeginData, PatchApplyEndData, McpToolCallBeginData, McpToolCallEndData, WebSearchBeginData, WebSearchEndData, TurnDiffData } from '@/common/codex/types/eventData';
/**
 * 安全的路径拼接函数，兼容Windows和Mac
 * @param basePath 基础路径
 * @param relativePath 相对路径
 * @returns 拼接后的绝对路径
 */
export declare const joinPath: (basePath: string, relativePath: string) => string;
/**
 * @description 跟对话相关的消息类型申明 及相关处理
 */
type TMessageType = 'text' | 'tips' | 'tool_call' | 'tool_group' | 'agent_status' | 'acp_permission' | 'acp_tool_call' | 'codex_permission' | 'codex_tool_call';
interface IMessage<T extends TMessageType, Content extends Record<string, any>> {
    /**
     * 唯一ID
     */
    id: string;
    /**
     * 消息来源ID，
     */
    msg_id?: string;
    conversation_id: string;
    /**
     * 消息类型
     */
    type: T;
    /**
     * 消息内容
     */
    content: Content;
    /**
     * 消息创建时间
     */
    createdAt?: number;
    /**
     * 消息位置
     */
    position?: 'left' | 'right' | 'center' | 'pop';
    /**
     * 消息状态
     */
    status?: 'finish' | 'pending' | 'error' | 'work';
}
export type IMessageText = IMessage<'text', {
    content: string;
}>;
export type IMessageTips = IMessage<'tips', {
    content: string;
    type: 'error' | 'success' | 'warning';
}>;
export type IMessageToolCall = IMessage<'tool_call', {
    callId: string;
    name: string;
    args: Record<string, any>;
    error?: string;
    status?: 'success' | 'error';
}>;
type IMessageToolGroupConfirmationDetailsBase<Type, Extra extends Record<string, any>> = {
    type: Type;
    title: string;
} & Extra;
export type IMessageToolGroup = IMessage<'tool_group', Array<{
    callId: string;
    description: string;
    name: string;
    renderOutputAsMarkdown: boolean;
    resultDisplay?: string | {
        fileDiff: string;
        fileName: string;
    } | {
        img_url: string;
        relative_path: string;
    };
    status: 'Executing' | 'Success' | 'Error' | 'Canceled' | 'Pending' | 'Confirming';
    confirmationDetails?: IMessageToolGroupConfirmationDetailsBase<'edit', {
        fileName: string;
        fileDiff: string;
        isModifying?: boolean;
    }> | IMessageToolGroupConfirmationDetailsBase<'exec', {
        rootCommand: string;
        command: string;
    }> | IMessageToolGroupConfirmationDetailsBase<'info', {
        urls: string[];
        prompt: string;
    }> | IMessageToolGroupConfirmationDetailsBase<'mcp', {
        toolName: string;
        toolDisplayName: string;
        serverName: string;
    }>;
}>>;
export type IMessageAgentStatus = IMessage<'agent_status', {
    backend: AcpBackend;
    status: 'connecting' | 'connected' | 'authenticated' | 'session_active' | 'disconnected' | 'error';
    sessionId?: string;
    isConnected?: boolean;
    hasActiveSession?: boolean;
}>;
export type IMessageAcpPermission = IMessage<'acp_permission', AcpPermissionRequest>;
export type IMessageAcpToolCall = IMessage<'acp_tool_call', ToolCallUpdate>;
export type IMessageCodexPermission = IMessage<'codex_permission', CodexPermissionRequest>;
interface BaseCodexToolCallUpdate {
    toolCallId: string;
    status: 'pending' | 'executing' | 'success' | 'error' | 'canceled';
    title?: string;
    kind: 'execute' | 'patch' | 'mcp' | 'web_search';
    description?: string;
    content?: Array<{
        type: 'text' | 'diff' | 'output';
        text?: string;
        output?: string;
        filePath?: string;
        oldText?: string;
        newText?: string;
    }>;
    startTime?: number;
    endTime?: number;
}
export type CodexToolCallUpdate = (BaseCodexToolCallUpdate & {
    subtype: 'exec_command_begin';
    data: ExecCommandBeginData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'exec_command_output_delta';
    data: ExecCommandOutputDeltaData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'exec_command_end';
    data: ExecCommandEndData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'patch_apply_begin';
    data: PatchApplyBeginData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'patch_apply_end';
    data: PatchApplyEndData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'mcp_tool_call_begin';
    data: McpToolCallBeginData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'mcp_tool_call_end';
    data: McpToolCallEndData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'web_search_begin';
    data: WebSearchBeginData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'web_search_end';
    data: WebSearchEndData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'turn_diff';
    data: TurnDiffData;
}) | (BaseCodexToolCallUpdate & {
    subtype: 'generic';
    data?: any;
});
export type IMessageCodexToolCall = IMessage<'codex_tool_call', CodexToolCallUpdate>;
export type TMessage = IMessageText | IMessageTips | IMessageToolCall | IMessageToolGroup | IMessageAgentStatus | IMessageAcpPermission | IMessageAcpToolCall | IMessageCodexPermission | IMessageCodexToolCall;
/**
 * @description 将后端返回的消息转换为前端消息
 * */
export declare const transformMessage: (message: IResponseMessage) => TMessage;
/**
 * @description 将消息合并到消息列表中
 * */
export declare const composeMessage: (message: TMessage | undefined, list: TMessage[] | undefined) => TMessage[];
export declare const handleImageGenerationWithWorkspace: (message: TMessage, workspace: string) => TMessage;
export {};
//# sourceMappingURL=chatLib.d.ts.map