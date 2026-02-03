/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CodexAgentEventType } from './eventTypes';
export declare enum ToolCategory {
    EXECUTION = "execution",// shell, bash, python等
    FILE_OPS = "file_ops",// 读写、编辑、搜索文件
    SEARCH = "search",// 各种搜索方式
    ANALYSIS = "analysis",// 代码分析、图表生成
    COMMUNICATION = "communication",// 网络请求、API调用
    CUSTOM = "custom"
}
export declare enum OutputFormat {
    TEXT = "text",
    MARKDOWN = "markdown",
    JSON = "json",
    IMAGE = "image",
    CHART = "chart",
    DIAGRAM = "diagram",
    TABLE = "table"
}
export declare enum RendererType {
    STANDARD = "standard",// 标准文本渲染
    MARKDOWN = "markdown",// Markdown渲染
    CODE = "code",// 代码高亮渲染
    CHART = "chart",// 图表渲染
    IMAGE = "image",// 图像渲染
    INTERACTIVE = "interactive",// 交互式渲染
    COMPOSITE = "composite"
}
export interface ToolAvailability {
    platforms: string[];
    requires?: string[];
    experimental?: boolean;
}
export interface ToolCapabilities {
    supportsStreaming: boolean;
    supportsImages: boolean;
    supportsCharts: boolean;
    supportsMarkdown: boolean;
    supportsInteraction: boolean;
    outputFormats: OutputFormat[];
}
export interface ToolRenderer {
    type: RendererType;
    config: Record<string, any>;
}
export interface ToolDefinition {
    id: string;
    name: string;
    displayNameKey: string;
    category: ToolCategory;
    priority: number;
    availability: ToolAvailability;
    capabilities: ToolCapabilities;
    renderer: ToolRenderer;
    icon?: string;
    descriptionKey: string;
    schema?: any;
}
export interface McpToolInfo {
    name: string;
    serverName: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}
export type EventDataMap = {
    [CodexAgentEventType.EXEC_COMMAND_BEGIN]: Extract<import('./eventData').CodexEventMsg, {
        type: 'exec_command_begin';
    }>;
    [CodexAgentEventType.EXEC_COMMAND_OUTPUT_DELTA]: Extract<import('./eventData').CodexEventMsg, {
        type: 'exec_command_output_delta';
    }>;
    [CodexAgentEventType.EXEC_COMMAND_END]: Extract<import('./eventData').CodexEventMsg, {
        type: 'exec_command_end';
    }>;
    [CodexAgentEventType.APPLY_PATCH_APPROVAL_REQUEST]: Extract<import('./eventData').CodexEventMsg, {
        type: 'apply_patch_approval_request';
    }>;
    [CodexAgentEventType.PATCH_APPLY_BEGIN]: Extract<import('./eventData').CodexEventMsg, {
        type: 'patch_apply_begin';
    }>;
    [CodexAgentEventType.PATCH_APPLY_END]: Extract<import('./eventData').CodexEventMsg, {
        type: 'patch_apply_end';
    }>;
    [CodexAgentEventType.MCP_TOOL_CALL_BEGIN]: Extract<import('./eventData').CodexEventMsg, {
        type: 'mcp_tool_call_begin';
    }>;
    [CodexAgentEventType.MCP_TOOL_CALL_END]: Extract<import('./eventData').CodexEventMsg, {
        type: 'mcp_tool_call_end';
    }>;
    [CodexAgentEventType.WEB_SEARCH_BEGIN]: Extract<import('./eventData').CodexEventMsg, {
        type: 'web_search_begin';
    }>;
    [CodexAgentEventType.WEB_SEARCH_END]: Extract<import('./eventData').CodexEventMsg, {
        type: 'web_search_end';
    }>;
};
//# sourceMappingURL=toolTypes.d.ts.map