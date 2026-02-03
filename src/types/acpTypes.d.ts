/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * ACP Backend 类型定义
 * ACP Backend Type Definitions
 *
 * 为了更好的扩展性，将所有支持的 ACP 后端定义在此处
 * 当需要支持新的后端时，只需要在这里添加即可
 * For better extensibility, all supported ACP backends are defined here.
 * When adding a new backend, simply add it here.
 */
/**
 * 预设助手的主 Agent 类型，用于决定创建哪种类型的对话
 * The primary agent type for preset assistants, used to determine which conversation type to create.
 */
export type PresetAgentType = 'gemini' | 'claude' | 'codex' | 'opencode';
/**
 * 使用 ACP 协议的预设 Agent 类型（需要通过 ACP 后端路由）
 * Preset agent types that use ACP protocol (need to be routed through ACP backend)
 *
 * 这些类型会在创建对话时使用对应的 ACP 后端，而不是 Gemini 原生对话
 * These types will use corresponding ACP backend when creating conversation, instead of native Gemini
 */
export declare const ACP_ROUTED_PRESET_TYPES: readonly PresetAgentType[];
/**
 * 检查预设 Agent 类型是否需要通过 ACP 后端路由
 * Check if preset agent type should be routed through ACP backend
 */
export declare function isAcpRoutedPresetType(type: PresetAgentType | undefined): boolean;
export type AcpBackendAll = 'claude' | 'gemini' | 'qwen' | 'iflow' | 'codex' | 'droid' | 'goose' | 'auggie' | 'kimi' | 'opencode' | 'custom';
/**
 * 潜在的 ACP CLI 工具列表
 * 用于自动检测用户本地安装的 CLI 工具
 * 当有新的 ACP CLI 工具发布时，只需在此列表中添加即可
 *
 * Potential ACP CLI tools list.
 * Used for auto-detecting CLI tools installed on user's local machine.
 * When new ACP CLI tools are released, simply add them to this list.
 */
export interface PotentialAcpCli {
    /** CLI 可执行文件名 / CLI executable filename */
    cmd: string;
    /** ACP 启动参数 / ACP launch arguments */
    args: string[];
    /** 显示名称 / Display name */
    name: string;
    /** 对应的 backend id / Corresponding backend id */
    backendId: AcpBackendAll;
}
/**
 * 已知支持 ACP 协议的 CLI 工具列表
 * 检测时会遍历此列表，用 `which` 命令检查是否安装
 * 从 ACP_BACKENDS_ALL 自动生成，避免数据冗余
 */
export declare const POTENTIAL_ACP_CLIS: PotentialAcpCli[];
/**
 * ACP 后端 Agent 配置
 * 用于内置后端（claude, gemini, qwen）和用户自定义 Agent
 *
 * Configuration for an ACP backend agent.
 * Used for both built-in backends (claude, gemini, qwen) and custom user agents.
 */
export interface AcpBackendConfig {
    /** 后端唯一标识符 / Unique identifier for the backend (e.g., 'claude', 'gemini', 'custom') */
    id: string;
    /** UI 显示名称 / Display name shown in the UI (e.g., 'Goose', 'Claude Code') */
    name: string;
    /** 本地化名称 / Localized names (e.g., { 'zh-CN': '...', 'en-US': '...' }) */
    nameI18n?: Record<string, string>;
    /** 助手列表或设置中显示的简短描述 / Short description shown in assistant lists or settings */
    description?: string;
    /** 本地化描述 / Localized descriptions (e.g., { 'zh-CN': '...', 'en-US': '...' }) */
    descriptionI18n?: Record<string, string>;
    /** 助手头像 - 可以是 emoji 或图片路径 / Avatar for the assistant - can be an emoji string or image path */
    avatar?: string;
    /**
     * 用于 `which` 命令检测的 CLI 命令名
     * 仅当二进制文件名与 id 不同时需要
     *
     * CLI command name used for detection via `which` command.
     * Example: 'goose', 'claude', 'qwen'
     * Only needed if the binary name differs from id.
     */
    cliCommand?: string;
    /**
     * 完整 CLI 路径（可包含空格分隔的参数）
     * 用于启动进程
     *
     * Full CLI path with optional arguments (space-separated).
     * Used when spawning the process.
     * Examples:
     *   - 'goose' (simple binary)
     *   - 'npx @qwen-code/qwen-code' (npx package)
     *   - '/usr/local/bin/my-agent --verbose' (full path with args)
     * Note: '--experimental-acp' is auto-appended for non-custom backends.
     */
    defaultCliPath?: string;
    /** 使用前是否需要认证 / Whether this backend requires authentication before use */
    authRequired?: boolean;
    /** 是否启用并显示在 UI 中 / Whether this backend is enabled and should appear in the UI */
    enabled?: boolean;
    /** 是否支持流式响应 / Whether this backend supports streaming responses */
    supportsStreaming?: boolean;
    /**
     * 传递给子进程的自定义环境变量
     * 启动时与 process.env 合并
     *
     * Custom environment variables to pass to the spawned process.
     * Merged with process.env when spawning.
     * Example: { "ANTHROPIC_API_KEY": "sk-...", "DEBUG": "true" }
     */
    env?: Record<string, string>;
    /**
     * 启用 ACP 模式时的参数
     * 不同 CLI 使用不同约定：
     *   - ['--experimental-acp'] 用于 claude, qwen（未指定时的默认值）
     *   - ['acp'] 用于 goose（子命令）
     *   - ['--acp'] 用于 auggie
     *
     * Arguments to enable ACP mode when spawning the CLI.
     * Different CLIs use different conventions:
     *   - ['--experimental-acp'] for claude, qwen (default if not specified)
     *   - ['acp'] for goose (subcommand)
     *   - ['--acp'] for auggie
     * If not specified, defaults to ['--experimental-acp'].
     */
    acpArgs?: string[];
    /** 是否为基于提示词的预设（无需 CLI 二进制文件）/ Whether this is a prompt-based preset (no CLI binary required) */
    isPreset?: boolean;
    /** 此预设的系统提示词或规则上下文 / The system prompt or rule context for this preset */
    context?: string;
    /** 此预设的本地化提示词 / Localized prompts for this preset (e.g., { 'zh-CN': '...', 'en-US': '...' }) */
    contextI18n?: Record<string, string>;
    /** 此预设的示例 prompts / Example prompts for this preset */
    prompts?: string[];
    /** 本地化示例 prompts / Localized example prompts */
    promptsI18n?: Record<string, string[]>;
    /**
     * 此预设的主 Agent 类型（仅 isPreset=true 时生效）
     * 决定选择此预设时创建哪种类型的对话
     * - 'gemini': 创建 Gemini 对话
     * - 'claude': 创建使用 Claude 后端的 ACP 对话
     * - 'codex': 创建 Codex 对话
     * 为向后兼容默认为 'gemini'
     *
     * The primary agent type for this preset (only applies when isPreset=true).
     * Determines which conversation type to create when selecting this preset.
     * - 'gemini': Creates a Gemini conversation
     * - 'claude': Creates an ACP conversation with Claude backend
     * - 'codex': Creates a Codex conversation
     * Defaults to 'gemini' for backward compatibility.
     */
    presetAgentType?: PresetAgentType;
    /**
     * 此助手可用的模型列表（仅 isPreset=true 时生效）
     * 如果未指定，将使用系统默认的模型列表
     *
     * Available models for this assistant (only applies when isPreset=true).
     * If not specified, system default models will be used.
     */
    models?: string[];
    /** 是否为内置助手（不可编辑/删除）/ Whether this is a built-in assistant (cannot be edited/deleted) */
    isBuiltin?: boolean;
    /**
     * 此助手启用的 skills 列表（仅 isPreset=true 时生效）
     * 如果未指定或为空数组，将加载所有可用 skills
     *
     * Enabled skills for this assistant (only applies when isPreset=true).
     * If not specified or empty array, all available skills will be loaded.
     */
    enabledSkills?: string[];
    /**
     * 通过 "Add Skills" 添加的自定义 skills 名称列表（仅 isPreset=true 时生效）
     * 这些 skills 会显示在 Custom Skills 区域，即使已经被导入
     *
     * List of custom skill names added via "Add Skills" button (only applies when isPreset=true).
     * These skills will be displayed in the Custom Skills section even after being imported.
     */
    customSkillNames?: string[];
}
export declare const ACP_BACKENDS_ALL: Record<AcpBackendAll, AcpBackendConfig>;
export declare const ACP_ENABLED_BACKENDS: Record<string, AcpBackendConfig>;
export type AcpBackend = keyof typeof ACP_BACKENDS_ALL;
export type AcpBackendId = AcpBackend;
export declare function isValidAcpBackend(backend: string): backend is AcpBackend;
export declare function getAcpBackendConfig(backend: AcpBackend): AcpBackendConfig;
export declare function getEnabledAcpBackends(): AcpBackendConfig[];
export declare function getAllAcpBackends(): AcpBackendConfig[];
export declare function isAcpBackendEnabled(backend: AcpBackendAll): boolean;
export declare enum AcpErrorType {
    CONNECTION_NOT_READY = "CONNECTION_NOT_READY",
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    SESSION_EXPIRED = "SESSION_EXPIRED",
    NETWORK_ERROR = "NETWORK_ERROR",
    TIMEOUT = "TIMEOUT",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    UNKNOWN = "UNKNOWN"
}
export interface AcpError {
    type: AcpErrorType;
    code: string;
    message: string;
    retryable: boolean;
    details?: unknown;
}
export type AcpResult<T = unknown> = {
    success: true;
    data: T;
} | {
    success: false;
    error: AcpError;
};
export declare function createAcpError(type: AcpErrorType, message: string, retryable?: boolean, details?: unknown): AcpError;
export declare function isRetryableError(error: AcpError): boolean;
export declare const JSONRPC_VERSION: "2.0";
export interface AcpRequest {
    jsonrpc: typeof JSONRPC_VERSION;
    id: number;
    method: string;
    params?: Record<string, unknown> | unknown[];
}
export interface AcpResponse {
    jsonrpc: typeof JSONRPC_VERSION;
    id: number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
    };
}
export interface AcpNotification {
    jsonrpc: typeof JSONRPC_VERSION;
    method: string;
    params?: Record<string, unknown> | unknown[];
}
export interface BaseSessionUpdate {
    sessionId: string;
}
export interface AgentMessageChunkUpdate extends BaseSessionUpdate {
    update: {
        sessionUpdate: 'agent_message_chunk';
        content: {
            type: 'text' | 'image';
            text?: string;
            data?: string;
            mimeType?: string;
            uri?: string;
        };
    };
}
export interface AgentThoughtChunkUpdate extends BaseSessionUpdate {
    update: {
        sessionUpdate: 'agent_thought_chunk';
        content: {
            type: 'text';
            text: string;
        };
    };
}
/** Tool call 内容项类型 / Tool call content item type */
export interface ToolCallContentItem {
    type: 'content' | 'diff';
    content?: {
        type: 'text';
        text: string;
    };
    path?: string;
    oldText?: string | null;
    newText?: string;
}
/** Tool call 位置项类型 / Tool call location item type */
export interface ToolCallLocationItem {
    path: string;
}
export interface ToolCallUpdate extends BaseSessionUpdate {
    update: {
        sessionUpdate: 'tool_call';
        toolCallId: string;
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
        title: string;
        kind: 'read' | 'edit' | 'execute';
        rawInput?: Record<string, unknown>;
        content?: ToolCallContentItem[];
        locations?: ToolCallLocationItem[];
    };
}
export interface ToolCallUpdateStatus extends BaseSessionUpdate {
    update: {
        sessionUpdate: 'tool_call_update';
        toolCallId: string;
        status: 'completed' | 'failed';
        content?: Array<{
            type: 'content';
            content: {
                type: 'text';
                text: string;
            };
        }>;
    };
}
export interface PlanUpdate extends BaseSessionUpdate {
    update: {
        sessionUpdate: 'plan';
        entries: Array<{
            content: string;
            status: 'pending' | 'in_progress' | 'completed';
            priority?: 'low' | 'medium' | 'high';
        }>;
    };
}
export interface AvailableCommandsUpdate extends BaseSessionUpdate {
    update: {
        sessionUpdate: 'available_commands_update';
        availableCommands: Array<{
            name: string;
            description: string;
            input?: {
                hint?: string;
            } | null;
        }>;
    };
}
export interface UserMessageChunkUpdate extends BaseSessionUpdate {
    update: {
        sessionUpdate: 'user_message_chunk';
        content: {
            type: 'text' | 'image';
            text?: string;
            data?: string;
            mimeType?: string;
            uri?: string;
        };
    };
}
export interface CurrentModeUpdate extends BaseSessionUpdate {
    update: {
        sessionUpdate: 'current_mode_update';
        mode: string;
        description?: string;
    };
}
export type AcpSessionUpdate = AgentMessageChunkUpdate | AgentThoughtChunkUpdate | ToolCallUpdate | ToolCallUpdateStatus | PlanUpdate | AvailableCommandsUpdate | UserMessageChunkUpdate;
export interface AcpPermissionRequest {
    sessionId: string;
    options: Array<{
        optionId: string;
        name: string;
        kind: 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always';
    }>;
    toolCall: {
        toolCallId: string;
        rawInput?: {
            command?: string;
            description?: string;
            [key: string]: unknown;
        };
        status?: string;
        title?: string;
        kind?: string;
        content?: ToolCallContentItem[];
        locations?: ToolCallLocationItem[];
    };
}
export interface LegacyAcpPermissionData extends Record<string, unknown> {
    options?: Array<{
        optionId?: string;
        name?: string;
        kind?: string;
        [key: string]: unknown;
    }>;
    toolCall?: {
        toolCallId?: string;
        rawInput?: unknown;
        title?: string;
        kind?: string;
        [key: string]: unknown;
    };
}
export type CompatibleAcpPermissionData = AcpPermissionRequest | LegacyAcpPermissionData;
export type AcpMessage = AcpRequest | AcpNotification | AcpResponse | AcpSessionUpdate;
export interface AcpFileWriteRequest extends AcpRequest {
    method: 'fs/write_text_file';
    params: {
        sessionId: string;
        path: string;
        content: string;
    };
}
export interface AcpFileReadRequest extends AcpRequest {
    method: 'fs/read_text_file';
    params: {
        sessionId: string;
        path: string;
    };
}
export declare const ACP_METHODS: {
    readonly SESSION_UPDATE: "session/update";
    readonly REQUEST_PERMISSION: "session/request_permission";
    readonly READ_TEXT_FILE: "fs/read_text_file";
    readonly WRITE_TEXT_FILE: "fs/write_text_file";
};
export type AcpMethod = (typeof ACP_METHODS)[keyof typeof ACP_METHODS];
/** Session 更新通知 / Session update notification */
export interface AcpSessionUpdateNotification {
    jsonrpc: typeof JSONRPC_VERSION;
    method: typeof ACP_METHODS.SESSION_UPDATE;
    params: AcpSessionUpdate;
}
/** 权限请求消息 / Permission request message */
export interface AcpPermissionRequestMessage {
    jsonrpc: typeof JSONRPC_VERSION;
    id: number;
    method: typeof ACP_METHODS.REQUEST_PERMISSION;
    params: AcpPermissionRequest;
}
/** 文件读取请求（带类型化 params）/ File read request (with typed params) */
export interface AcpFileReadMessage {
    jsonrpc: typeof JSONRPC_VERSION;
    id: number;
    method: typeof ACP_METHODS.READ_TEXT_FILE;
    params: {
        path: string;
        sessionId?: string;
    };
}
/** 文件写入请求（带类型化 params）/ File write request (with typed params) */
export interface AcpFileWriteMessage {
    jsonrpc: typeof JSONRPC_VERSION;
    id: number;
    method: typeof ACP_METHODS.WRITE_TEXT_FILE;
    params: {
        path: string;
        content: string;
        sessionId?: string;
    };
}
/**
 * ACP 入站消息联合类型
 * TypeScript 可根据 method 字段自动窄化类型
 *
 * ACP incoming message union type.
 * TypeScript can automatically narrow the type based on the method field.
 */
export type AcpIncomingMessage = AcpSessionUpdateNotification | AcpPermissionRequestMessage | AcpFileReadMessage | AcpFileWriteMessage;
//# sourceMappingURL=acpTypes.d.ts.map