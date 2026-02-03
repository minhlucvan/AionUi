/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
export interface CodexJsonRpcEvent<T extends CodexEventMsg['type'] = CodexEventMsg['type']> {
    jsonrpc: '2.0';
    method: 'codex/event';
    params: {
        _meta: {
            requestId: number;
            timestamp?: number;
            source?: string;
        };
        id: string;
        msg: Extract<CodexEventMsg, {
            type: T;
        }>;
    };
}
export type CodexEventMsg = ({
    type: 'session_configured';
} & SessionConfiguredData) | ({
    type: 'task_started';
} & TaskStartedData) | ({
    type: 'task_complete';
} & TaskCompleteData) | ({
    type: 'agent_message_delta';
} & MessageDeltaData) | ({
    type: 'agent_message';
} & MessageData) | ({
    type: 'user_message';
} & UserMessageData) | ({
    type: 'agent_reasoning_delta';
} & AgentReasoningDeltaData) | ({
    type: 'agent_reasoning';
} & AgentReasoningData) | ({
    type: 'agent_reasoning_raw_content';
} & AgentReasoningRawContentData) | ({
    type: 'agent_reasoning_raw_content_delta';
} & AgentReasoningRawContentDeltaData) | ({
    type: 'exec_command_begin';
} & ExecCommandBeginData) | ({
    type: 'exec_command_output_delta';
} & ExecCommandOutputDeltaData) | ({
    type: 'exec_command_end';
} & ExecCommandEndData) | ({
    type: 'exec_approval_request';
} & ExecApprovalRequestData) | ({
    type: 'apply_patch_approval_request';
} & PatchApprovalData) | ({
    type: 'patch_apply_begin';
} & PatchApplyBeginData) | ({
    type: 'patch_apply_end';
} & PatchApplyEndData) | ({
    type: 'mcp_tool_call_begin';
} & McpToolCallBeginData) | ({
    type: 'mcp_tool_call_end';
} & McpToolCallEndData) | ({
    type: 'web_search_begin';
} & WebSearchBeginData) | ({
    type: 'web_search_end';
} & WebSearchEndData) | ({
    type: 'token_count';
} & TokenCountData) | {
    type: 'agent_reasoning_section_break';
} | ({
    type: 'turn_diff';
} & TurnDiffData) | ({
    type: 'get_history_entry_response';
} & GetHistoryEntryResponseData) | ({
    type: 'mcp_list_tools_response';
} & McpListToolsResponseData) | ({
    type: 'list_custom_prompts_response';
} & ListCustomPromptsResponseData) | ({
    type: 'conversation_path';
} & ConversationPathResponseData) | {
    type: 'background_event';
    message: string;
} | ({
    type: 'turn_aborted';
} & TurnAbortedData);
export interface SessionConfiguredData {
    session_id: string;
    model?: string;
    reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high' | null;
    history_log_id?: number;
    history_entry_count?: number;
    initial_messages?: unknown[] | null;
    rollout_path?: string | null;
}
export interface TaskStartedData {
    model_context_window: number;
}
export interface TaskCompleteData {
    last_agent_message: string;
}
export interface MessageDeltaData {
    delta: string;
}
export interface CodexEventParams {
    msg?: {
        type: string;
        [key: string]: unknown;
    };
    _meta?: {
        requestId?: number;
        [key: string]: unknown;
    };
    call_id?: string;
    codex_call_id?: string;
    changes?: Record<string, unknown>;
    codex_changes?: Record<string, unknown>;
}
export interface MessageData {
    message: string;
}
export interface AgentReasoningData {
    text: string;
}
export interface AgentReasoningDeltaData {
    delta: string;
}
export type InputMessageKind = 'plain' | 'user_instructions' | 'environment_context';
export interface UserMessageData {
    message: string;
    kind?: InputMessageKind;
    images?: string[] | null;
}
export interface StreamErrorData {
    message?: string;
    error?: string;
    code?: string;
    details?: unknown;
}
export interface ExecCommandBeginData {
    call_id: string;
    command: string[];
    cwd: string;
    parsed_cmd?: ParsedCommand[];
}
export interface ExecCommandOutputDeltaData {
    call_id: string;
    stream: 'stdout' | 'stderr';
    chunk: string;
}
export interface ExecCommandEndData {
    call_id: string;
    stdout: string;
    stderr: string;
    aggregated_output: string;
    exit_code: number;
    duration?: {
        secs: number;
        nanos: number;
    };
    formatted_output?: string;
}
export interface PatchApprovalData {
    call_id: string;
    changes: Record<string, FileChange>;
    codex_call_id?: string;
    codex_changes?: Record<string, FileChange>;
    message?: string;
    summary?: string;
    requiresConfirmation?: boolean;
    reason?: string | null;
    grant_root?: string | null;
}
export interface PatchApplyBeginData {
    call_id?: string;
    auto_approved?: boolean;
    changes?: Record<string, FileChange>;
    dryRun?: boolean;
}
export interface PatchApplyEndData {
    call_id?: string;
    success?: boolean;
    error?: string;
    appliedChanges?: string[];
    failedChanges?: string[];
    stdout?: string;
    stderr?: string;
}
export interface McpToolCallBeginData {
    invocation?: McpInvocation;
    toolName?: string;
    serverName?: string;
}
export interface McpToolCallEndData {
    invocation?: McpInvocation;
    result?: unknown;
    error?: string;
    duration?: string | number;
}
export interface WebSearchBeginData {
    call_id?: string;
}
export interface WebSearchEndData {
    call_id?: string;
    query?: string;
    results?: SearchResult[];
}
export interface TokenCountData {
    info?: {
        total_token_usage?: {
            input_tokens?: number;
            cached_input_tokens?: number;
            output_tokens?: number;
            reasoning_output_tokens?: number;
            total_tokens?: number;
        };
        last_token_usage?: {
            input_tokens?: number;
            cached_input_tokens?: number;
            output_tokens?: number;
            reasoning_output_tokens?: number;
            total_tokens?: number;
        };
        model_context_window?: number;
    };
}
export type FileChange = {
    add: {
        content: string;
    };
} | {
    delete: {
        content: string;
    };
} | {
    update: {
        unified_diff: string;
        move_path?: string | null;
    };
} | {
    type: 'add';
    content: string;
} | {
    type: 'delete';
    content: string;
} | {
    type: 'update';
    unified_diff: string;
    move_path?: string | null;
} | {
    action?: 'create' | 'modify' | 'delete' | 'rename';
    content?: string;
    oldPath?: string;
    newPath?: string;
    mode?: string;
    size?: number;
    checksum?: string;
};
export interface McpInvocation {
    server?: string;
    tool?: string;
    arguments?: Record<string, unknown>;
    method?: string;
    name?: string;
    toolId?: string;
    serverId?: string;
}
export interface SearchResult {
    title?: string;
    url?: string;
    snippet?: string;
    score?: number;
    metadata?: Record<string, unknown>;
}
export type ParsedCommand = {
    type: 'read';
    cmd: string;
    name: string;
} | {
    type: 'list_files';
    cmd: string;
    path?: string | null;
} | {
    type: 'search';
    cmd: string;
    query?: string | null;
    path?: string | null;
} | {
    type: 'unknown';
    cmd: string;
};
export interface AgentReasoningRawContentData {
    text: string;
}
export interface AgentReasoningRawContentDeltaData {
    delta: string;
}
export interface ExecApprovalRequestData {
    call_id: string;
    command: string[];
    cwd: string;
    reason: string | null;
}
export interface TurnDiffData {
    unified_diff: string;
}
export interface ConversationPathResponseData {
    conversation_id: string;
    path: string;
}
export interface GetHistoryEntryResponseData {
    offset: number;
    log_id: number;
    entry?: unknown;
}
export interface McpListToolsResponseData {
    tools: Record<string, unknown>;
}
export interface ListCustomPromptsResponseData {
    custom_prompts: unknown[];
}
export interface TurnAbortedData {
    reason: 'interrupted' | 'replaced';
}
export type ApplyPatchApprovalRequestData = PatchApprovalData;
export interface CodexAgentManagerData {
    conversation_id: string;
    workspace?: string;
    cliPath?: string;
    sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
    webSearchEnabled?: boolean;
    presetContext?: string;
    /** 启用的 skills 列表，用于过滤 SkillManager 加载的 skills / Enabled skills list for filtering SkillManager skills */
    enabledSkills?: string[];
}
export interface ElicitationCreateData {
    codex_elicitation: string;
    message?: string;
    codex_command?: string | string[];
    codex_cwd?: string;
    codex_call_id?: string;
    codex_changes?: Record<string, FileChange>;
}
//# sourceMappingURL=eventData.d.ts.map