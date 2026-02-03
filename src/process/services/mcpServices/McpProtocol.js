"use strict";
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractMcpAgent = void 0;
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const util_1 = require("util");
const acpTypes_1 = require("@/types/acpTypes");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/client/sse.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
/**
 * MCP协议抽象基类
 */
class AbstractMcpAgent {
    constructor(backend, timeout = 30000) {
        this.operationQueue = Promise.resolve();
        this.backend = backend;
        this.timeout = timeout;
    }
    /**
     * 确保操作串行执行的互斥锁
     */
    withLock(operation) {
        const currentQueue = this.operationQueue;
        const operationName = operation.name || 'anonymous operation';
        // 创建一个新的 Promise，它会等待前一个操作完成
        const newOperation = currentQueue
            .then(() => operation())
            .catch((error) => {
            console.warn(`[${this.backend} MCP] ${operationName} failed:`, error);
            // 即使操作失败，也要继续执行队列中的下一个操作
            throw error;
        });
        // 更新队列（忽略错误，确保队列继续）
        this.operationQueue = newOperation.catch(() => {
            // Empty catch to prevent unhandled rejection
        });
        return newOperation;
    }
    getBackendType() {
        return this.backend;
    }
    /**
     * 测试MCP服务器连接的通用实现
     * @param serverOrTransport 完整的服务器配置或仅传输配置
     */
    testMcpConnection(serverOrTransport) {
        try {
            // 判断是完整的 IMcpServer 还是仅 transport
            const transport = 'transport' in serverOrTransport ? serverOrTransport.transport : serverOrTransport;
            switch (transport.type) {
                case 'stdio':
                    return this.testStdioConnection(transport);
                case 'sse':
                    return this.testSseConnection(transport);
                case 'http':
                    return this.testHttpConnection(transport);
                case 'streamable_http':
                    return this.testStreamableHttpConnection(transport);
                default:
                    return Promise.resolve({ success: false, error: 'Unsupported transport type' });
            }
        }
        catch (error) {
            return Promise.resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * 测试Stdio连接的通用实现
     * 使用 MCP SDK 进行正确的协议通信
     */
    testStdioConnection(transport_1) {
        return __awaiter(this, arguments, void 0, function* (transport, retryCount = 0) {
            let mcpClient = null;
            try {
                // app imported statically
                // 创建 Stdio 传输层
                const stdioTransport = new stdio_js_1.StdioClientTransport({
                    command: transport.command,
                    args: transport.args || [],
                    env: Object.assign(Object.assign({}, process.env), transport.env),
                });
                // 创建 MCP 客户端
                mcpClient = new index_js_1.Client({
                    name: electron_1.app.getName(),
                    version: electron_1.app.getVersion(),
                }, {
                    capabilities: {
                        sampling: {},
                    },
                });
                // 连接到服务器并获取工具列表
                yield mcpClient.connect(stdioTransport);
                const result = yield mcpClient.listTools();
                const tools = result.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                }));
                return { success: true, tools };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                // 检测 npm 缓存问题并自动修复
                if (errorMessage.includes('ENOTEMPTY') && retryCount < 1) {
                    try {
                        // exec imported statically
                        // promisify imported statically
                        const execAsync = (0, util_1.promisify)(child_process_1.exec);
                        // 清理 npm 缓存并重试
                        yield Promise.race([execAsync('npm cache clean --force && rm -rf ~/.npm/_npx'), new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), 10000))]);
                        return yield this.testStdioConnection(transport, retryCount + 1);
                    }
                    catch (cleanupError) {
                        return {
                            success: false,
                            error: `npm cache corruption detected. Auto-cleanup failed, please manually run: npm cache clean --force`,
                        };
                    }
                }
                return {
                    success: false,
                    error: errorMessage,
                };
            }
            finally {
                // 清理连接
                if (mcpClient) {
                    try {
                        yield mcpClient.close();
                    }
                    catch (closeError) {
                        console.error('[Stdio] Error closing connection:', closeError);
                    }
                }
            }
        });
    }
    /**
     * 测试SSE连接的通用实现
     * 使用 MCP SDK 进行正确的协议通信
     */
    testSseConnection(transport) {
        return __awaiter(this, void 0, void 0, function* () {
            let mcpClient = null;
            try {
                // app imported statically
                // 先尝试简单的 HTTP 请求检测认证需求
                const authCheckResponse = yield fetch(transport.url, {
                    method: 'GET',
                    headers: transport.headers || {},
                });
                // 检查是否需要认证
                if (authCheckResponse.status === 401) {
                    const wwwAuthenticate = authCheckResponse.headers.get('WWW-Authenticate');
                    if (wwwAuthenticate) {
                        return {
                            success: false,
                            needsAuth: true,
                            authMethod: wwwAuthenticate.toLowerCase().includes('bearer') ? 'oauth' : 'basic',
                            wwwAuthenticate: wwwAuthenticate,
                            error: 'Authentication required',
                        };
                    }
                }
                // 创建 SSE 传输层
                const sseTransport = new sse_js_1.SSEClientTransport(new URL(transport.url), {
                    requestInit: {
                        headers: transport.headers,
                    },
                });
                // 创建 MCP 客户端
                mcpClient = new index_js_1.Client({
                    name: electron_1.app.getName(),
                    version: electron_1.app.getVersion(),
                }, {
                    capabilities: {
                        sampling: {},
                    },
                });
                // 连接到服务器并获取工具列表
                yield mcpClient.connect(sseTransport);
                const result = yield mcpClient.listTools();
                const tools = result.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                }));
                return { success: true, tools };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                // 检查错误消息中是否包含认证相关信息
                if (errorMessage.toLowerCase().includes('401') || errorMessage.toLowerCase().includes('unauthorized')) {
                    return {
                        success: false,
                        needsAuth: true,
                        error: 'Authentication required',
                    };
                }
                return {
                    success: false,
                    error: errorMessage,
                };
            }
            finally {
                // 清理连接
                if (mcpClient) {
                    try {
                        yield mcpClient.close();
                    }
                    catch (closeError) {
                        console.error('[SSE] Error closing connection:', closeError);
                    }
                }
            }
        });
    }
    /**
     * 测试HTTP连接的通用实现
     */
    testHttpConnection(transport) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // app imported statically
                const initResponse = yield fetch(transport.url, {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, transport.headers),
                    body: JSON.stringify({
                        jsonrpc: acpTypes_1.JSONRPC_VERSION,
                        method: 'initialize',
                        id: 1,
                        params: {
                            protocolVersion: '2024-11-05',
                            capabilities: {
                                tools: {},
                            },
                            clientInfo: {
                                name: electron_1.app.getName(),
                                version: electron_1.app.getVersion(),
                            },
                        },
                    }),
                });
                // 检查是否需要认证
                if (initResponse.status === 401) {
                    const wwwAuthenticate = initResponse.headers.get('WWW-Authenticate');
                    if (wwwAuthenticate) {
                        return {
                            success: false,
                            needsAuth: true,
                            authMethod: wwwAuthenticate.toLowerCase().includes('bearer') ? 'oauth' : 'basic',
                            wwwAuthenticate: wwwAuthenticate,
                            error: 'Authentication required',
                        };
                    }
                }
                if (!initResponse.ok) {
                    return { success: false, error: `HTTP ${initResponse.status}: ${initResponse.statusText}` };
                }
                const initResult = yield initResponse.json();
                if (initResult.error) {
                    return { success: false, error: initResult.error.message || 'Initialize failed' };
                }
                const toolsResponse = yield fetch(transport.url, {
                    method: 'POST',
                    headers: Object.assign({ 'Content-Type': 'application/json' }, transport.headers),
                    body: JSON.stringify({
                        jsonrpc: acpTypes_1.JSONRPC_VERSION,
                        method: 'tools/list',
                        id: 2,
                        params: {},
                    }),
                });
                if (!toolsResponse.ok) {
                    return { success: true, tools: [], error: `Could not fetch tools: HTTP ${toolsResponse.status}` };
                }
                const toolsResult = yield toolsResponse.json();
                if (toolsResult.error) {
                    return { success: true, tools: [], error: toolsResult.error.message || 'Tools list failed' };
                }
                const tools = ((_a = toolsResult.result) === null || _a === void 0 ? void 0 : _a.tools) || [];
                return {
                    success: true,
                    tools: tools.map((tool) => ({
                        name: tool.name,
                        description: tool.description,
                    })),
                };
            }
            catch (error) {
                return { success: false, error: error instanceof Error ? error.message : String(error) };
            }
        });
    }
    /**
     * 测试Streamable HTTP连接的通用实现
     * 使用 MCP SDK 进行正确的协议通信
     */
    testStreamableHttpConnection(transport) {
        return __awaiter(this, void 0, void 0, function* () {
            let mcpClient = null;
            try {
                // app imported statically
                // 创建 Streamable HTTP 传输层
                const streamableHttpTransport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(transport.url), {
                    requestInit: {
                        headers: transport.headers,
                    },
                });
                // 创建 MCP 客户端
                mcpClient = new index_js_1.Client({
                    name: electron_1.app.getName(),
                    version: electron_1.app.getVersion(),
                }, {
                    capabilities: {
                        sampling: {},
                    },
                });
                // 连接到服务器并获取工具列表
                yield mcpClient.connect(streamableHttpTransport);
                const result = yield mcpClient.listTools();
                const tools = result.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                }));
                return { success: true, tools };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
            finally {
                // 清理连接
                if (mcpClient) {
                    try {
                        yield mcpClient.close();
                    }
                    catch (closeError) {
                        console.error('[StreamableHTTP] Error closing connection:', closeError);
                    }
                }
            }
        });
    }
}
exports.AbstractMcpAgent = AbstractMcpAgent;
//# sourceMappingURL=McpProtocol.js.map