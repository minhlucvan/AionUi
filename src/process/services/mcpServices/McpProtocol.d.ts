/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AcpBackendAll } from '@/types/acpTypes';
import type { IMcpServer } from '@/common/storage';
/**
 * MCP源类型 - 包括所有ACP后端和AionUi内置
 */
export type McpSource = AcpBackendAll | 'aionui';
/**
 * MCP操作结果接口
 */
export interface McpOperationResult {
    success: boolean;
    error?: string;
}
/**
 * MCP连接测试结果接口
 */
export interface McpConnectionTestResult {
    success: boolean;
    tools?: Array<{
        name: string;
        description?: string;
    }>;
    error?: string;
    needsAuth?: boolean;
    authMethod?: 'oauth' | 'basic';
    wwwAuthenticate?: string;
}
/**
 * MCP检测结果接口
 */
export interface DetectedMcpServer {
    source: McpSource;
    servers: IMcpServer[];
}
/**
 * MCP同步结果接口
 */
export interface McpSyncResult {
    success: boolean;
    results: Array<{
        agent: string;
        success: boolean;
        error?: string;
    }>;
}
/**
 * MCP协议接口 - 定义MCP操作的标准协议
 */
export interface IMcpProtocol {
    /**
     * 检测MCP配置
     * @param cliPath 可选的CLI路径
     * @returns MCP服务器列表
     */
    detectMcpServers(cliPath?: string): Promise<IMcpServer[]>;
    /**
     * 安装MCP服务器到agent
     * @param mcpServers 要安装的MCP服务器列表
     * @returns 操作结果
     */
    installMcpServers(mcpServers: IMcpServer[]): Promise<McpOperationResult>;
    /**
     * 从agent删除MCP服务器
     * @param mcpServerName 要删除的MCP服务器名称
     * @returns 操作结果
     */
    removeMcpServer(mcpServerName: string): Promise<McpOperationResult>;
    /**
     * 测试MCP服务器连接
     * @param server MCP服务器配置
     * @returns 连接测试结果
     */
    testMcpConnection(server: IMcpServer): Promise<McpConnectionTestResult>;
    /**
     * 获取支持的传输类型
     * @returns 支持的传输类型列表
     */
    getSupportedTransports(): string[];
    /**
     * 获取agent后端类型
     * @returns agent后端类型
     */
    getBackendType(): McpSource;
}
/**
 * MCP协议抽象基类
 */
export declare abstract class AbstractMcpAgent implements IMcpProtocol {
    protected readonly backend: McpSource;
    protected readonly timeout: number;
    private operationQueue;
    constructor(backend: McpSource, timeout?: number);
    /**
     * 确保操作串行执行的互斥锁
     */
    protected withLock<T>(operation: () => Promise<T>): Promise<T>;
    abstract detectMcpServers(cliPath?: string): Promise<IMcpServer[]>;
    abstract installMcpServers(mcpServers: IMcpServer[]): Promise<McpOperationResult>;
    abstract removeMcpServer(mcpServerName: string): Promise<McpOperationResult>;
    abstract getSupportedTransports(): string[];
    getBackendType(): McpSource;
    /**
     * 测试MCP服务器连接的通用实现
     * @param serverOrTransport 完整的服务器配置或仅传输配置
     */
    testMcpConnection(serverOrTransport: IMcpServer | IMcpServer['transport']): Promise<McpConnectionTestResult>;
    /**
     * 测试Stdio连接的通用实现
     * 使用 MCP SDK 进行正确的协议通信
     */
    protected testStdioConnection(transport: {
        command: string;
        args?: string[];
        env?: Record<string, string>;
    }, retryCount?: number): Promise<McpConnectionTestResult>;
    /**
     * 测试SSE连接的通用实现
     * 使用 MCP SDK 进行正确的协议通信
     */
    protected testSseConnection(transport: {
        url: string;
        headers?: Record<string, string>;
    }): Promise<McpConnectionTestResult>;
    /**
     * 测试HTTP连接的通用实现
     */
    protected testHttpConnection(transport: {
        url: string;
        headers?: Record<string, string>;
    }): Promise<McpConnectionTestResult>;
    /**
     * 测试Streamable HTTP连接的通用实现
     * 使用 MCP SDK 进行正确的协议通信
     */
    protected testStreamableHttpConnection(transport: {
        url: string;
        headers?: Record<string, string>;
    }): Promise<McpConnectionTestResult>;
}
//# sourceMappingURL=McpProtocol.d.ts.map