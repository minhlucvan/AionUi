/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
import type { OpenDialogOptions } from 'electron';
import type { McpSource } from '../process/services/mcpServices/McpProtocol';
import type { AcpBackend, PresetAgentType } from '../types/acpTypes';
import type { IMcpServer, IProvider, TChatConversation, TProviderWithModel } from './storage';
import type { PreviewHistoryTarget, PreviewSnapshotInfo } from './types/preview';
import type { ProtocolDetectionRequest, ProtocolDetectionResponse } from './utils/protocolDetector';
export declare const shell: {
    openFile: {
        provider: (provider: (params: string) => Promise<void>) => void;
        invoke: (params: string) => Promise<void>;
    };
    showItemInFolder: {
        provider: (provider: (params: string) => Promise<void>) => void;
        invoke: (params: string) => Promise<void>;
    };
    openExternal: {
        provider: (provider: (params: string) => Promise<void>) => void;
        invoke: (params: string) => Promise<void>;
    };
};
export declare const conversation: {
    create: {
        provider: (provider: (params: ICreateConversationParams) => Promise<TChatConversation>) => void;
        invoke: (params: ICreateConversationParams) => Promise<TChatConversation>;
    };
    createWithConversation: {
        provider: (provider: (params: {
            conversation: TChatConversation;
            sourceConversationId?: string;
        }) => Promise<TChatConversation>) => void;
        invoke: (params: {
            conversation: TChatConversation;
            sourceConversationId?: string;
        }) => Promise<TChatConversation>;
    };
    get: {
        provider: (provider: (params: {
            id: string;
        }) => Promise<TChatConversation>) => void;
        invoke: (params: {
            id: string;
        }) => Promise<TChatConversation>;
    };
    getAssociateConversation: {
        provider: (provider: (params: {
            conversation_id: string;
        }) => Promise<TChatConversation[]>) => void;
        invoke: (params: {
            conversation_id: string;
        }) => Promise<TChatConversation[]>;
    };
    remove: {
        provider: (provider: (params: {
            id: string;
        }) => Promise<boolean>) => void;
        invoke: (params: {
            id: string;
        }) => Promise<boolean>;
    };
    update: {
        provider: (provider: (params: {
            id: string;
            updates: Partial<TChatConversation>;
            mergeExtra?: boolean;
        }) => Promise<boolean>) => void;
        invoke: (params: {
            id: string;
            updates: Partial<TChatConversation>;
            mergeExtra?: boolean;
        }) => Promise<boolean>;
    };
    reset: {
        provider: (provider: (params: IResetConversationParams) => Promise<void>) => void;
        invoke: (params: IResetConversationParams) => Promise<void>;
    };
    stop: {
        provider: (provider: (params: {
            conversation_id: string;
        }) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: {
            conversation_id: string;
        }) => Promise<IBridgeResponse<{}>>;
    };
    sendMessage: {
        provider: (provider: (params: ISendMessageParams) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: ISendMessageParams) => Promise<IBridgeResponse<{}>>;
    };
    confirmMessage: {
        provider: (provider: (params: IConfirmMessageParams) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: IConfirmMessageParams) => Promise<IBridgeResponse<{}>>;
    };
    responseStream: {
        on(callback: (params: IResponseMessage) => void): () => void;
        emit: (params: IResponseMessage) => void;
    };
    getWorkspace: {
        provider: (provider: (params: {
            conversation_id: string;
            workspace: string;
            path: string;
            search?: string;
        }) => Promise<IDirOrFile[]>) => void;
        invoke: (params: {
            conversation_id: string;
            workspace: string;
            path: string;
            search?: string;
        }) => Promise<IDirOrFile[]>;
    };
    responseSearchWorkSpace: {
        provider: (provider: (params: {
            file: number;
            dir: number;
            match?: IDirOrFile;
        }) => Promise<void>) => void;
        invoke: (params: {
            file: number;
            dir: number;
            match?: IDirOrFile;
        }) => Promise<void>;
    };
    reloadContext: {
        provider: (provider: (params: {
            conversation_id: string;
        }) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: {
            conversation_id: string;
        }) => Promise<IBridgeResponse<{}>>;
    };
};
export declare const geminiConversation: {
    sendMessage: {
        provider: (provider: (params: ISendMessageParams) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: ISendMessageParams) => Promise<IBridgeResponse<{}>>;
    };
    confirmMessage: {
        provider: (provider: (params: IConfirmMessageParams) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: IConfirmMessageParams) => Promise<IBridgeResponse<{}>>;
    };
    responseStream: {
        on(callback: (params: IResponseMessage) => void): () => void;
        emit: (params: IResponseMessage) => void;
    };
};
export declare const application: {
    restart: {
        provider: (provider: (params: void) => Promise<void>) => void;
        invoke: (params: void) => Promise<void>;
    };
    openDevTools: {
        provider: (provider: (params: void) => Promise<void>) => void;
        invoke: (params: void) => Promise<void>;
    };
    systemInfo: {
        provider: (provider: (params: void) => Promise<{
            cacheDir: string;
            workDir: string;
            platform: string;
            arch: string;
        }>) => void;
        invoke: (params: void) => Promise<{
            cacheDir: string;
            workDir: string;
            platform: string;
            arch: string;
        }>;
    };
    updateSystemInfo: {
        provider: (provider: (params: {
            cacheDir: string;
            workDir: string;
        }) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: {
            cacheDir: string;
            workDir: string;
        }) => Promise<IBridgeResponse<{}>>;
    };
    getZoomFactor: {
        provider: (provider: (params: void) => Promise<number>) => void;
        invoke: (params: void) => Promise<number>;
    };
    setZoomFactor: {
        provider: (provider: (params: {
            factor: number;
        }) => Promise<number>) => void;
        invoke: (params: {
            factor: number;
        }) => Promise<number>;
    };
};
export declare const dialog: {
    showOpen: {
        provider: (provider: (params: {
            defaultPath?: string;
            properties?: OpenDialogOptions["properties"];
            filters?: OpenDialogOptions["filters"];
        }) => Promise<string[]>) => void;
        invoke: (params: {
            defaultPath?: string;
            properties?: OpenDialogOptions["properties"];
            filters?: OpenDialogOptions["filters"];
        }) => Promise<string[]>;
    };
};
export declare const fs: {
    getFilesByDir: {
        provider: (provider: (params: {
            dir: string;
            root: string;
        }) => Promise<IDirOrFile[]>) => void;
        invoke: (params: {
            dir: string;
            root: string;
        }) => Promise<IDirOrFile[]>;
    };
    getImageBase64: {
        provider: (provider: (params: {
            path: string;
        }) => Promise<string>) => void;
        invoke: (params: {
            path: string;
        }) => Promise<string>;
    };
    fetchRemoteImage: {
        provider: (provider: (params: {
            url: string;
        }) => Promise<string>) => void;
        invoke: (params: {
            url: string;
        }) => Promise<string>;
    };
    readFile: {
        provider: (provider: (params: {
            path: string;
        }) => Promise<string>) => void;
        invoke: (params: {
            path: string;
        }) => Promise<string>;
    };
    readFileBuffer: {
        provider: (provider: (params: {
            path: string;
        }) => Promise<ArrayBuffer>) => void;
        invoke: (params: {
            path: string;
        }) => Promise<ArrayBuffer>;
    };
    createTempFile: {
        provider: (provider: (params: {
            fileName: string;
        }) => Promise<string>) => void;
        invoke: (params: {
            fileName: string;
        }) => Promise<string>;
    };
    writeFile: {
        provider: (provider: (params: {
            path: string;
            data: Uint8Array | string;
        }) => Promise<boolean>) => void;
        invoke: (params: {
            path: string;
            data: Uint8Array | string;
        }) => Promise<boolean>;
    };
    getFileMetadata: {
        provider: (provider: (params: {
            path: string;
        }) => Promise<IFileMetadata>) => void;
        invoke: (params: {
            path: string;
        }) => Promise<IFileMetadata>;
    };
    copyFilesToWorkspace: {
        provider: (provider: (params: {
            filePaths: string[];
            workspace: string;
            sourceRoot?: string;
        }) => Promise<IBridgeResponse<{
            copiedFiles: string[];
            failedFiles?: Array<{
                path: string;
                error: string;
            }>;
        }>>) => void;
        invoke: (params: {
            filePaths: string[];
            workspace: string;
            sourceRoot?: string;
        }) => Promise<IBridgeResponse<{
            copiedFiles: string[];
            failedFiles?: Array<{
                path: string;
                error: string;
            }>;
        }>>;
    };
    removeEntry: {
        provider: (provider: (params: {
            path: string;
        }) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: {
            path: string;
        }) => Promise<IBridgeResponse<{}>>;
    };
    renameEntry: {
        provider: (provider: (params: {
            path: string;
            newName: string;
        }) => Promise<IBridgeResponse<{
            newPath: string;
        }>>) => void;
        invoke: (params: {
            path: string;
            newName: string;
        }) => Promise<IBridgeResponse<{
            newPath: string;
        }>>;
    };
    readBuiltinRule: {
        provider: (provider: (params: {
            fileName: string;
        }) => Promise<string>) => void;
        invoke: (params: {
            fileName: string;
        }) => Promise<string>;
    };
    readBuiltinSkill: {
        provider: (provider: (params: {
            fileName: string;
        }) => Promise<string>) => void;
        invoke: (params: {
            fileName: string;
        }) => Promise<string>;
    };
    readAssistantRule: {
        provider: (provider: (params: {
            assistantId: string;
            locale?: string;
        }) => Promise<string>) => void;
        invoke: (params: {
            assistantId: string;
            locale?: string;
        }) => Promise<string>;
    };
    writeAssistantRule: {
        provider: (provider: (params: {
            assistantId: string;
            content: string;
            locale?: string;
        }) => Promise<boolean>) => void;
        invoke: (params: {
            assistantId: string;
            content: string;
            locale?: string;
        }) => Promise<boolean>;
    };
    deleteAssistantRule: {
        provider: (provider: (params: {
            assistantId: string;
        }) => Promise<boolean>) => void;
        invoke: (params: {
            assistantId: string;
        }) => Promise<boolean>;
    };
    readAssistantSkill: {
        provider: (provider: (params: {
            assistantId: string;
            locale?: string;
        }) => Promise<string>) => void;
        invoke: (params: {
            assistantId: string;
            locale?: string;
        }) => Promise<string>;
    };
    writeAssistantSkill: {
        provider: (provider: (params: {
            assistantId: string;
            content: string;
            locale?: string;
        }) => Promise<boolean>) => void;
        invoke: (params: {
            assistantId: string;
            content: string;
            locale?: string;
        }) => Promise<boolean>;
    };
    deleteAssistantSkill: {
        provider: (provider: (params: {
            assistantId: string;
        }) => Promise<boolean>) => void;
        invoke: (params: {
            assistantId: string;
        }) => Promise<boolean>;
    };
    listAvailableSkills: {
        provider: (provider: (params: void) => Promise<{
            name: string;
            description: string;
            location: string;
            isCustom: boolean;
        }[]>) => void;
        invoke: (params: void) => Promise<{
            name: string;
            description: string;
            location: string;
            isCustom: boolean;
        }[]>;
    };
    readSkillInfo: {
        provider: (provider: (params: {
            skillPath: string;
        }) => Promise<IBridgeResponse<{
            name: string;
            description: string;
        }>>) => void;
        invoke: (params: {
            skillPath: string;
        }) => Promise<IBridgeResponse<{
            name: string;
            description: string;
        }>>;
    };
    importSkill: {
        provider: (provider: (params: {
            skillPath: string;
        }) => Promise<IBridgeResponse<{
            skillName: string;
        }>>) => void;
        invoke: (params: {
            skillPath: string;
        }) => Promise<IBridgeResponse<{
            skillName: string;
        }>>;
    };
    scanForSkills: {
        provider: (provider: (params: {
            folderPath: string;
        }) => Promise<IBridgeResponse<{
            name: string;
            description: string;
            path: string;
        }[]>>) => void;
        invoke: (params: {
            folderPath: string;
        }) => Promise<IBridgeResponse<{
            name: string;
            description: string;
            path: string;
        }[]>>;
    };
    detectCommonSkillPaths: {
        provider: (provider: (params: void) => Promise<IBridgeResponse<{
            name: string;
            path: string;
        }[]>>) => void;
        invoke: (params: void) => Promise<IBridgeResponse<{
            name: string;
            path: string;
        }[]>>;
    };
};
export declare const fileWatch: {
    startWatch: {
        provider: (provider: (params: {
            filePath: string;
        }) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: {
            filePath: string;
        }) => Promise<IBridgeResponse<{}>>;
    };
    stopWatch: {
        provider: (provider: (params: {
            filePath: string;
        }) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: {
            filePath: string;
        }) => Promise<IBridgeResponse<{}>>;
    };
    stopAllWatches: {
        provider: (provider: (params: void) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: void) => Promise<IBridgeResponse<{}>>;
    };
    fileChanged: {
        on(callback: (params: {
            filePath: string;
            eventType: string;
        }) => void): () => void;
        emit: (params: {
            filePath: string;
            eventType: string;
        }) => void;
    };
};
export declare const fileStream: {
    contentUpdate: {
        on(callback: (params: {
            filePath: string;
            content: string;
            workspace: string;
            relativePath: string;
            operation: "write" | "delete";
        }) => void): () => void;
        emit: (params: {
            filePath: string;
            content: string;
            workspace: string;
            relativePath: string;
            operation: "write" | "delete";
        }) => void;
    };
};
export declare const googleAuth: {
    login: {
        provider: (provider: (params: {
            proxy?: string;
        }) => Promise<IBridgeResponse<{
            account: string;
        }>>) => void;
        invoke: (params: {
            proxy?: string;
        }) => Promise<IBridgeResponse<{
            account: string;
        }>>;
    };
    logout: {
        provider: (provider: (params: {}) => Promise<void>) => void;
        invoke: (params: {}) => Promise<void>;
    };
    status: {
        provider: (provider: (params: {
            proxy?: string;
        }) => Promise<IBridgeResponse<{
            account: string;
        }>>) => void;
        invoke: (params: {
            proxy?: string;
        }) => Promise<IBridgeResponse<{
            account: string;
        }>>;
    };
};
export declare const gemini: {
    subscriptionStatus: {
        provider: (provider: (params: {
            proxy?: string;
        }) => Promise<IBridgeResponse<{
            isSubscriber: boolean;
            tier?: string;
            lastChecked: number;
            message?: string;
        }>>) => void;
        invoke: (params: {
            proxy?: string;
        }) => Promise<IBridgeResponse<{
            isSubscriber: boolean;
            tier?: string;
            lastChecked: number;
            message?: string;
        }>>;
    };
};
export declare const mode: {
    fetchModelList: {
        provider: (provider: (params: {
            base_url?: string;
            api_key: string;
            try_fix?: boolean;
            platform?: string;
        }) => Promise<IBridgeResponse<{
            mode: Array<string>;
            fix_base_url?: string;
        }>>) => void;
        invoke: (params: {
            base_url?: string;
            api_key: string;
            try_fix?: boolean;
            platform?: string;
        }) => Promise<IBridgeResponse<{
            mode: Array<string>;
            fix_base_url?: string;
        }>>;
    };
    saveModelConfig: {
        provider: (provider: (params: IProvider[]) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: IProvider[]) => Promise<IBridgeResponse<{}>>;
    };
    getModelConfig: {
        provider: (provider: (params: void) => Promise<IProvider[]>) => void;
        invoke: (params: void) => Promise<IProvider[]>;
    };
    /** 协议检测接口 - 自动检测 API 端点使用的协议类型 / Protocol detection - auto-detect API protocol type */
    detectProtocol: {
        provider: (provider: (params: ProtocolDetectionRequest) => Promise<IBridgeResponse<ProtocolDetectionResponse>>) => void;
        invoke: (params: ProtocolDetectionRequest) => Promise<IBridgeResponse<ProtocolDetectionResponse>>;
    };
};
export declare const acpConversation: {
    sendMessage: {
        provider: (provider: (params: ISendMessageParams) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: ISendMessageParams) => Promise<IBridgeResponse<{}>>;
    };
    confirmMessage: {
        provider: (provider: (params: IConfirmMessageParams) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: IConfirmMessageParams) => Promise<IBridgeResponse<{}>>;
    };
    responseStream: {
        on(callback: (params: IResponseMessage) => void): () => void;
        emit: (params: IResponseMessage) => void;
    };
    detectCliPath: {
        provider: (provider: (params: {
            backend: AcpBackend;
        }) => Promise<IBridgeResponse<{
            path?: string;
        }>>) => void;
        invoke: (params: {
            backend: AcpBackend;
        }) => Promise<IBridgeResponse<{
            path?: string;
        }>>;
    };
    getAvailableAgents: {
        provider: (provider: (params: void) => Promise<IBridgeResponse<{
            backend: AcpBackend;
            name: string;
            cliPath?: string;
            customAgentId?: string;
            isPreset?: boolean;
            context?: string;
            avatar?: string;
            presetAgentType?: PresetAgentType;
        }[]>>) => void;
        invoke: (params: void) => Promise<IBridgeResponse<{
            backend: AcpBackend;
            name: string;
            cliPath?: string;
            customAgentId?: string;
            isPreset?: boolean;
            context?: string;
            avatar?: string;
            presetAgentType?: PresetAgentType;
        }[]>>;
    };
    checkEnv: {
        provider: (provider: (params: void) => Promise<{
            env: Record<string, string>;
        }>) => void;
        invoke: (params: void) => Promise<{
            env: Record<string, string>;
        }>;
    };
    refreshCustomAgents: {
        provider: (provider: (params: void) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: void) => Promise<IBridgeResponse<{}>>;
    };
};
export declare const mcpService: {
    getAgentMcpConfigs: {
        provider: (provider: (params: {
            backend: AcpBackend;
            name: string;
            cliPath?: string;
        }[]) => Promise<IBridgeResponse<{
            source: McpSource;
            servers: IMcpServer[];
        }[]>>) => void;
        invoke: (params: {
            backend: AcpBackend;
            name: string;
            cliPath?: string;
        }[]) => Promise<IBridgeResponse<{
            source: McpSource;
            servers: IMcpServer[];
        }[]>>;
    };
    testMcpConnection: {
        provider: (provider: (params: IMcpServer) => Promise<IBridgeResponse<{
            success: boolean;
            tools?: Array<{
                name: string;
                description?: string;
            }>;
            error?: string;
            needsAuth?: boolean;
            authMethod?: "oauth" | "basic";
            wwwAuthenticate?: string;
        }>>) => void;
        invoke: (params: IMcpServer) => Promise<IBridgeResponse<{
            success: boolean;
            tools?: Array<{
                name: string;
                description?: string;
            }>;
            error?: string;
            needsAuth?: boolean;
            authMethod?: "oauth" | "basic";
            wwwAuthenticate?: string;
        }>>;
    };
    syncMcpToAgents: {
        provider: (provider: (params: {
            mcpServers: IMcpServer[];
            agents: Array<{
                backend: AcpBackend;
                name: string;
                cliPath?: string;
            }>;
        }) => Promise<IBridgeResponse<{
            success: boolean;
            results: Array<{
                agent: string;
                success: boolean;
                error?: string;
            }>;
        }>>) => void;
        invoke: (params: {
            mcpServers: IMcpServer[];
            agents: Array<{
                backend: AcpBackend;
                name: string;
                cliPath?: string;
            }>;
        }) => Promise<IBridgeResponse<{
            success: boolean;
            results: Array<{
                agent: string;
                success: boolean;
                error?: string;
            }>;
        }>>;
    };
    removeMcpFromAgents: {
        provider: (provider: (params: {
            mcpServerName: string;
            agents: Array<{
                backend: AcpBackend;
                name: string;
                cliPath?: string;
            }>;
        }) => Promise<IBridgeResponse<{
            success: boolean;
            results: Array<{
                agent: string;
                success: boolean;
                error?: string;
            }>;
        }>>) => void;
        invoke: (params: {
            mcpServerName: string;
            agents: Array<{
                backend: AcpBackend;
                name: string;
                cliPath?: string;
            }>;
        }) => Promise<IBridgeResponse<{
            success: boolean;
            results: Array<{
                agent: string;
                success: boolean;
                error?: string;
            }>;
        }>>;
    };
    checkOAuthStatus: {
        provider: (provider: (params: IMcpServer) => Promise<IBridgeResponse<{
            isAuthenticated: boolean;
            needsLogin: boolean;
            error?: string;
        }>>) => void;
        invoke: (params: IMcpServer) => Promise<IBridgeResponse<{
            isAuthenticated: boolean;
            needsLogin: boolean;
            error?: string;
        }>>;
    };
    loginMcpOAuth: {
        provider: (provider: (params: {
            server: IMcpServer;
            config?: any;
        }) => Promise<IBridgeResponse<{
            success: boolean;
            error?: string;
        }>>) => void;
        invoke: (params: {
            server: IMcpServer;
            config?: any;
        }) => Promise<IBridgeResponse<{
            success: boolean;
            error?: string;
        }>>;
    };
    logoutMcpOAuth: {
        provider: (provider: (params: string) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: string) => Promise<IBridgeResponse<{}>>;
    };
    getAuthenticatedServers: {
        provider: (provider: (params: void) => Promise<IBridgeResponse<string[]>>) => void;
        invoke: (params: void) => Promise<IBridgeResponse<string[]>>;
    };
};
export declare const codexConversation: {
    sendMessage: {
        provider: (provider: (params: ISendMessageParams) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: ISendMessageParams) => Promise<IBridgeResponse<{}>>;
    };
    confirmMessage: {
        provider: (provider: (params: IConfirmMessageParams) => Promise<IBridgeResponse<{}>>) => void;
        invoke: (params: IConfirmMessageParams) => Promise<IBridgeResponse<{}>>;
    };
    responseStream: {
        on(callback: (params: IResponseMessage) => void): () => void;
        emit: (params: IResponseMessage) => void;
    };
};
export declare const database: {
    getConversationMessages: {
        provider: (provider: (params: {
            conversation_id: string;
            page?: number;
            pageSize?: number;
        }) => Promise<import("@/common/chatLib").TMessage[]>) => void;
        invoke: (params: {
            conversation_id: string;
            page?: number;
            pageSize?: number;
        }) => Promise<import("@/common/chatLib").TMessage[]>;
    };
    getUserConversations: {
        provider: (provider: (params: {
            page?: number;
            pageSize?: number;
        }) => Promise<TChatConversation[]>) => void;
        invoke: (params: {
            page?: number;
            pageSize?: number;
        }) => Promise<TChatConversation[]>;
    };
};
export declare const previewHistory: {
    list: {
        provider: (provider: (params: {
            target: PreviewHistoryTarget;
        }) => Promise<PreviewSnapshotInfo[]>) => void;
        invoke: (params: {
            target: PreviewHistoryTarget;
        }) => Promise<PreviewSnapshotInfo[]>;
    };
    save: {
        provider: (provider: (params: {
            target: PreviewHistoryTarget;
            content: string;
        }) => Promise<PreviewSnapshotInfo>) => void;
        invoke: (params: {
            target: PreviewHistoryTarget;
            content: string;
        }) => Promise<PreviewSnapshotInfo>;
    };
    getContent: {
        provider: (provider: (params: {
            target: PreviewHistoryTarget;
            snapshotId: string;
        }) => Promise<{
            snapshot: PreviewSnapshotInfo;
            content: string;
        }>) => void;
        invoke: (params: {
            target: PreviewHistoryTarget;
            snapshotId: string;
        }) => Promise<{
            snapshot: PreviewSnapshotInfo;
            content: string;
        }>;
    };
};
export declare const preview: {
    open: {
        on(callback: (params: {
            content: string;
            contentType: import("./types/preview").PreviewContentType;
            metadata?: {
                title?: string;
                fileName?: string;
            };
        }) => void): () => void;
        emit: (params: {
            content: string;
            contentType: import("./types/preview").PreviewContentType;
            metadata?: {
                title?: string;
                fileName?: string;
            };
        }) => void;
    };
};
export declare const document: {
    convert: {
        provider: (provider: (params: import("./types/conversion").DocumentConversionRequest) => Promise<import("./types/conversion").DocumentConversionResponse>) => void;
        invoke: (params: import("./types/conversion").DocumentConversionRequest) => Promise<import("./types/conversion").DocumentConversionResponse>;
    };
};
export declare const windowControls: {
    minimize: {
        provider: (provider: (params: void) => Promise<void>) => void;
        invoke: (params: void) => Promise<void>;
    };
    maximize: {
        provider: (provider: (params: void) => Promise<void>) => void;
        invoke: (params: void) => Promise<void>;
    };
    unmaximize: {
        provider: (provider: (params: void) => Promise<void>) => void;
        invoke: (params: void) => Promise<void>;
    };
    close: {
        provider: (provider: (params: void) => Promise<void>) => void;
        invoke: (params: void) => Promise<void>;
    };
    isMaximized: {
        provider: (provider: (params: void) => Promise<boolean>) => void;
        invoke: (params: void) => Promise<boolean>;
    };
    maximizedChanged: {
        on(callback: (params: {
            isMaximized: boolean;
        }) => void): () => void;
        emit: (params: {
            isMaximized: boolean;
        }) => void;
    };
};
interface ISendMessageParams {
    input: string;
    msg_id: string;
    conversation_id: string;
    files?: string[];
    loading_id?: string;
}
export interface IConfirmMessageParams {
    confirmKey: string;
    msg_id: string;
    conversation_id: string;
    callId: string;
}
export interface ICreateConversationParams {
    type: 'gemini' | 'acp' | 'codex';
    id?: string;
    name?: string;
    model: TProviderWithModel;
    extra: {
        workspace?: string;
        customWorkspace?: boolean;
        defaultFiles?: string[];
        backend?: AcpBackend;
        cliPath?: string;
        webSearchEngine?: 'google' | 'default';
        agentName?: string;
        customAgentId?: string;
        context?: string;
        contextFileName?: string;
        presetRules?: string;
        /** Enabled skills list for filtering SkillManager skills */
        enabledSkills?: string[];
        /**
         * Preset context/rules to inject into the first message.
         * Used by smart assistants to provide custom prompts/rules.
         * For Gemini: injected via contextContent
         * For ACP/Codex: injected via <system_instruction> tag in first message
         */
        presetContext?: string;
        /** 预设助手 ID，用于在会话面板显示助手名称和头像 / Preset assistant ID for displaying name and avatar in conversation panel */
        presetAssistantId?: string;
    };
}
interface IResetConversationParams {
    id?: string;
    gemini?: {
        clearCachedCredentialFile?: boolean;
    };
}
export interface IDirOrFile {
    name: string;
    fullPath: string;
    relativePath: string;
    isDir: boolean;
    isFile: boolean;
    children?: Array<IDirOrFile>;
}
export interface IFileMetadata {
    name: string;
    path: string;
    size: number;
    type: string;
    lastModified: number;
    isDirectory?: boolean;
}
export interface IResponseMessage {
    type: string;
    data: unknown;
    msg_id: string;
    conversation_id: string;
}
interface IBridgeResponse<D = {}> {
    success: boolean;
    data?: D;
    msg?: string;
}
export {};
//# sourceMappingURL=ipcBridge.d.ts.map