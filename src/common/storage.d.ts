/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AcpBackend, AcpBackendConfig } from '@/types/acpTypes';
/**
 * @description 聊天相关的存储
 */
export declare const ChatStorage: {
    get<K extends "chat.history">(key: K): Promise<IChatConversationRefer[K]>;
    set<K_1 extends "chat.history">(key: K_1, data: IChatConversationRefer[K_1]): Promise<any>;
    clear(): Promise<any>;
    remove(key: "chat.history"): Promise<void>;
    debug(debug: boolean): void;
    interceptor(interceptor: Partial<{
        set<K_2 extends "chat.history">(key: K_2, data: IChatConversationRefer[K_2]): Promise<IChatConversationRefer[K_2]>;
        get<K_3 extends "chat.history">(key: K_3): Promise<IChatConversationRefer[K_3]>;
        clear(): Promise<any>;
        remove<K_4 extends "chat.history">(key: K_4): Promise<any>;
    }>): void;
};
export declare const ChatMessageStorage: {
    get<K extends string>(key: K): Promise<any>;
    set<K_1 extends string>(key: K_1, data: any): Promise<any>;
    clear(): Promise<any>;
    remove(key: string): Promise<void>;
    debug(debug: boolean): void;
    interceptor(interceptor: Partial<{
        set<K_2 extends string>(key: K_2, data: any): Promise<any>;
        get<K_3 extends string>(key: K_3): Promise<any>;
        clear(): Promise<any>;
        remove<K_4 extends string>(key: K_4): Promise<any>;
    }>): void;
};
export declare const ConfigStorage: {
    get<K extends keyof IConfigStorageRefer>(key: K): Promise<IConfigStorageRefer[K]>;
    set<K_1 extends keyof IConfigStorageRefer>(key: K_1, data: IConfigStorageRefer[K_1]): Promise<any>;
    clear(): Promise<any>;
    remove(key: keyof IConfigStorageRefer): Promise<void>;
    debug(debug: boolean): void;
    interceptor(interceptor: Partial<{
        set<K_2 extends keyof IConfigStorageRefer>(key: K_2, data: IConfigStorageRefer[K_2]): Promise<IConfigStorageRefer[K_2]>;
        get<K_3 extends keyof IConfigStorageRefer>(key: K_3): Promise<IConfigStorageRefer[K_3]>;
        clear(): Promise<any>;
        remove<K_4 extends keyof IConfigStorageRefer>(key: K_4): Promise<any>;
    }>): void;
};
export declare const EnvStorage: {
    get<K extends "aionui.dir">(key: K): Promise<IEnvStorageRefer[K]>;
    set<K_1 extends "aionui.dir">(key: K_1, data: IEnvStorageRefer[K_1]): Promise<any>;
    clear(): Promise<any>;
    remove(key: "aionui.dir"): Promise<void>;
    debug(debug: boolean): void;
    interceptor(interceptor: Partial<{
        set<K_2 extends "aionui.dir">(key: K_2, data: IEnvStorageRefer[K_2]): Promise<IEnvStorageRefer[K_2]>;
        get<K_3 extends "aionui.dir">(key: K_3): Promise<IEnvStorageRefer[K_3]>;
        clear(): Promise<any>;
        remove<K_4 extends "aionui.dir">(key: K_4): Promise<any>;
    }>): void;
};
export interface IConfigStorageRefer {
    'gemini.config': {
        authType: string;
        proxy: string;
        GOOGLE_GEMINI_BASE_URL?: string;
        /** @deprecated Use accountProjects instead. Kept for backward compatibility migration. */
        GOOGLE_CLOUD_PROJECT?: string;
        /** 按 Google 账号存储的 GCP 项目 ID / GCP project IDs stored per Google account */
        accountProjects?: Record<string, string>;
        yoloMode?: boolean;
    };
    'acp.config': {
        [backend in AcpBackend]?: {
            authMethodId?: string;
            authToken?: string;
            lastAuthTime?: number;
            cliPath?: string;
        };
    };
    'acp.customAgents'?: AcpBackendConfig[];
    'model.config': IProvider[];
    'mcp.config': IMcpServer[];
    'mcp.agentInstallStatus': Record<string, string[]>;
    language: string;
    theme: string;
    colorScheme: string;
    customCss: string;
    'css.themes': ICssTheme[];
    'css.activeThemeId': string;
    'gemini.defaultModel': string;
    'tools.imageGenerationModel': TProviderWithModel & {
        switch: boolean;
    };
    'workspace.pasteConfirm'?: boolean;
    'guid.lastSelectedAgent'?: string;
    'migration.assistantEnabledFixed'?: boolean;
    'migration.coworkDefaultSkillsAdded'?: boolean;
}
export interface IEnvStorageRefer {
    'aionui.dir': {
        workDir: string;
        cacheDir: string;
    };
}
interface IChatConversation<T, Extra> {
    createTime: number;
    modifyTime: number;
    name: string;
    desc?: string;
    id: string;
    type: T;
    extra: Extra;
    model: TProviderWithModel;
    status?: 'pending' | 'running' | 'finished' | undefined;
}
export interface TokenUsageData {
    totalTokens: number;
}
export type TChatConversation = IChatConversation<'gemini', {
    workspace: string;
    customWorkspace?: boolean;
    webSearchEngine?: 'google' | 'default';
    lastTokenUsage?: TokenUsageData;
    contextFileName?: string;
    contextContent?: string;
    presetRules?: string;
    /** 启用的 skills 列表，用于过滤 SkillManager 加载的 skills / Enabled skills list for filtering SkillManager skills */
    enabledSkills?: string[];
    /** 预设助手 ID，用于在会话面板显示助手名称和头像 / Preset assistant ID for displaying name and avatar in conversation panel */
    presetAssistantId?: string;
}> | Omit<IChatConversation<'acp', {
    workspace?: string;
    backend: AcpBackend;
    cliPath?: string;
    customWorkspace?: boolean;
    agentName?: string;
    customAgentId?: string;
    presetContext?: string;
    /** 启用的 skills 列表，用于过滤 SkillManager 加载的 skills / Enabled skills list for filtering SkillManager skills */
    enabledSkills?: string[];
    /** 预设助手 ID，用于在会话面板显示助手名称和头像 / Preset assistant ID for displaying name and avatar in conversation panel */
    presetAssistantId?: string;
}>, 'model'> | Omit<IChatConversation<'codex', {
    workspace?: string;
    cliPath?: string;
    customWorkspace?: boolean;
    sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
    presetContext?: string;
    /** 启用的 skills 列表，用于过滤 SkillManager 加载的 skills / Enabled skills list for filtering SkillManager skills */
    enabledSkills?: string[];
    /** 预设助手 ID，用于在会话面板显示助手名称和头像 / Preset assistant ID for displaying name and avatar in conversation panel */
    presetAssistantId?: string;
}>, 'model'>;
export type IChatConversationRefer = {
    'chat.history': TChatConversation[];
};
export type ModelType = 'text' | 'vision' | 'function_calling' | 'image_generation' | 'web_search' | 'reasoning' | 'embedding' | 'rerank' | 'excludeFromPrimary';
export type ModelCapability = {
    type: ModelType;
    /**
     * 是否为用户手动选择，如果为true，则表示用户手动选择了该类型，否则表示用户手动禁止了该模型；如果为undefined，则表示使用默认值
     */
    isUserSelected?: boolean;
};
export interface IProvider {
    id: string;
    platform: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string[];
    /**
     * 模型能力标签列表。打了标签就是支持，没打就是不支持
     */
    capabilities?: ModelCapability[];
    /**
     * 上下文token限制，可选字段，只在明确知道时填写
     */
    contextLimit?: number;
}
export type TProviderWithModel = Omit<IProvider, 'model'> & {
    useModel: string;
};
export type McpTransportType = 'stdio' | 'sse' | 'http';
export interface IMcpServerTransportStdio {
    type: 'stdio';
    command: string;
    args?: string[];
    env?: Record<string, string>;
}
export interface IMcpServerTransportSSE {
    type: 'sse';
    url: string;
    headers?: Record<string, string>;
}
export interface IMcpServerTransportHTTP {
    type: 'http';
    url: string;
    headers?: Record<string, string>;
}
export interface IMcpServerTransportStreamableHTTP {
    type: 'streamable_http';
    url: string;
    headers?: Record<string, string>;
}
export type IMcpServerTransport = IMcpServerTransportStdio | IMcpServerTransportSSE | IMcpServerTransportHTTP | IMcpServerTransportStreamableHTTP;
export interface IMcpServer {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    transport: IMcpServerTransport;
    tools?: IMcpTool[];
    status?: 'connected' | 'disconnected' | 'error' | 'testing';
    lastConnected?: number;
    createdAt: number;
    updatedAt: number;
    originalJson: string;
}
export interface IMcpTool {
    name: string;
    description?: string;
    inputSchema?: unknown;
}
/**
 * CSS 主题配置接口 / CSS Theme configuration interface
 * 用于存储用户自定义的 CSS 皮肤 / Used to store user-defined CSS skins
 */
export interface ICssTheme {
    id: string;
    name: string;
    cover?: string;
    css: string;
    isPreset?: boolean;
    createdAt: number;
    updatedAt: number;
}
export {};
//# sourceMappingURL=storage.d.ts.map