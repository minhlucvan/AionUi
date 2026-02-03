"use strict";
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACP_METHODS = exports.JSONRPC_VERSION = exports.AcpErrorType = exports.ACP_ENABLED_BACKENDS = exports.ACP_BACKENDS_ALL = exports.POTENTIAL_ACP_CLIS = exports.ACP_ROUTED_PRESET_TYPES = void 0;
exports.isAcpRoutedPresetType = isAcpRoutedPresetType;
exports.isValidAcpBackend = isValidAcpBackend;
exports.getAcpBackendConfig = getAcpBackendConfig;
exports.getEnabledAcpBackends = getEnabledAcpBackends;
exports.getAllAcpBackends = getAllAcpBackends;
exports.isAcpBackendEnabled = isAcpBackendEnabled;
exports.createAcpError = createAcpError;
exports.isRetryableError = isRetryableError;
/**
 * 使用 ACP 协议的预设 Agent 类型（需要通过 ACP 后端路由）
 * Preset agent types that use ACP protocol (need to be routed through ACP backend)
 *
 * 这些类型会在创建对话时使用对应的 ACP 后端，而不是 Gemini 原生对话
 * These types will use corresponding ACP backend when creating conversation, instead of native Gemini
 */
exports.ACP_ROUTED_PRESET_TYPES = ['claude', 'opencode'];
/**
 * 检查预设 Agent 类型是否需要通过 ACP 后端路由
 * Check if preset agent type should be routed through ACP backend
 */
function isAcpRoutedPresetType(type) {
    return type !== undefined && exports.ACP_ROUTED_PRESET_TYPES.includes(type);
}
/** 默认的 ACP 启动参数 / Default ACP launch arguments */
const DEFAULT_ACP_ARGS = ['--experimental-acp'];
/**
 * 从 ACP_BACKENDS_ALL 生成可检测的 CLI 列表
 * 仅包含有 cliCommand 且已启用的后端（排除 gemini 和 custom）
 * Generate detectable CLI list from ACP_BACKENDS_ALL
 * Only includes enabled backends with cliCommand (excludes gemini and custom)
 */
function generatePotentialAcpClis() {
    // 需要在 ACP_BACKENDS_ALL 定义之后调用，所以使用延迟初始化
    // Must be called after ACP_BACKENDS_ALL is defined, so use lazy initialization
    return Object.entries(exports.ACP_BACKENDS_ALL)
        .filter(([id, config]) => {
        // 排除没有 CLI 命令的后端（gemini 内置，custom 用户配置）
        // Exclude backends without CLI command (gemini is built-in, custom is user-configured)
        if (!config.cliCommand)
            return false;
        if (id === 'gemini' || id === 'custom')
            return false;
        return config.enabled;
    })
        .map(([id, config]) => ({
        cmd: config.cliCommand,
        args: config.acpArgs || DEFAULT_ACP_ARGS,
        name: config.name,
        backendId: id,
    }));
}
// 延迟初始化，避免循环依赖 / Lazy initialization to avoid circular dependency
let _potentialAcpClis = null;
/**
 * 已知支持 ACP 协议的 CLI 工具列表
 * 检测时会遍历此列表，用 `which` 命令检查是否安装
 * 从 ACP_BACKENDS_ALL 自动生成，避免数据冗余
 */
exports.POTENTIAL_ACP_CLIS = new Proxy([], {
    get(_target, prop) {
        if (_potentialAcpClis === null) {
            _potentialAcpClis = generatePotentialAcpClis();
        }
        if (prop === 'length')
            return _potentialAcpClis.length;
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
            return _potentialAcpClis[Number(prop)];
        }
        if (prop === Symbol.iterator) {
            return function* () {
                yield* _potentialAcpClis;
            };
        }
        if (prop === 'map')
            return _potentialAcpClis.map.bind(_potentialAcpClis);
        if (prop === 'filter')
            return _potentialAcpClis.filter.bind(_potentialAcpClis);
        if (prop === 'forEach')
            return _potentialAcpClis.forEach.bind(_potentialAcpClis);
        return Reflect.get(_potentialAcpClis, prop);
    },
});
// 所有后端配置 - 包括暂时禁用的 / All backend configurations - including temporarily disabled ones
exports.ACP_BACKENDS_ALL = {
    claude: {
        id: 'claude',
        name: 'Claude Code',
        cliCommand: 'claude',
        authRequired: true,
        enabled: true,
        supportsStreaming: false,
    },
    gemini: {
        id: 'gemini',
        name: 'Google CLI',
        cliCommand: 'gemini',
        authRequired: true,
        enabled: false,
        supportsStreaming: true,
    },
    qwen: {
        id: 'qwen',
        name: 'Qwen Code',
        cliCommand: 'qwen',
        defaultCliPath: 'npx @qwen-code/qwen-code',
        authRequired: true,
        enabled: true, // ✅ 已验证支持：Qwen CLI v0.0.10+ 支持 --experimental-acp
        supportsStreaming: true,
    },
    iflow: {
        id: 'iflow',
        name: 'iFlow CLI',
        cliCommand: 'iflow',
        authRequired: true,
        enabled: true,
        supportsStreaming: false,
    },
    codex: {
        id: 'codex',
        name: 'Codex ',
        cliCommand: 'codex',
        authRequired: false,
        enabled: true, // ✅ 已验证支持：Codex CLI v0.4.0+ 支持 acp 模式
        supportsStreaming: false,
    },
    goose: {
        id: 'goose',
        name: 'Goose',
        cliCommand: 'goose',
        authRequired: false,
        enabled: true, // ✅ Block's Goose CLI，使用 `goose acp` 启动
        supportsStreaming: false,
        acpArgs: ['acp'], // goose 使用子命令而非 flag
    },
    auggie: {
        id: 'auggie',
        name: 'Augment Code',
        cliCommand: 'auggie',
        authRequired: false,
        enabled: true, // ✅ Augment Code CLI，使用 `auggie --acp` 启动
        supportsStreaming: false,
        acpArgs: ['--acp'], // auggie 使用 --acp flag
    },
    kimi: {
        id: 'kimi',
        name: 'Kimi CLI',
        cliCommand: 'kimi',
        authRequired: false,
        enabled: true, // ✅ Kimi CLI (Moonshot)，使用 `kimi --acp` 启动
        supportsStreaming: false,
        acpArgs: ['--acp'], // kimi 使用 --acp flag
    },
    opencode: {
        id: 'opencode',
        name: 'OpenCode',
        cliCommand: 'opencode',
        authRequired: false,
        enabled: true, // ✅ OpenCode CLI，使用 `opencode acp` 启动
        supportsStreaming: false,
        acpArgs: ['acp'], // opencode 使用 acp 子命令
    },
    droid: {
        id: 'droid',
        name: 'Factory Droid',
        cliCommand: 'droid',
        // Droid uses FACTORY_API_KEY from environment, not an interactive auth flow.
        authRequired: false,
        enabled: true, // ✅ Factory docs: `droid exec --output-format acp` (JetBrains/Zed ACP integration)
        supportsStreaming: false,
        acpArgs: ['exec', '--output-format', 'acp'],
    },
    custom: {
        id: 'custom',
        name: 'Custom Agent',
        cliCommand: undefined, // User-configured via settings
        authRequired: false,
        enabled: true,
        supportsStreaming: false,
    },
};
// 仅启用的后端配置 / Enabled backends only
exports.ACP_ENABLED_BACKENDS = Object.fromEntries(Object.entries(exports.ACP_BACKENDS_ALL).filter(([_, config]) => config.enabled));
// 工具函数 / Utility functions
function isValidAcpBackend(backend) {
    return backend in exports.ACP_ENABLED_BACKENDS;
}
function getAcpBackendConfig(backend) {
    return exports.ACP_ENABLED_BACKENDS[backend];
}
// 获取所有启用的后端配置 / Get all enabled backend configurations
function getEnabledAcpBackends() {
    return Object.values(exports.ACP_ENABLED_BACKENDS);
}
// 获取所有后端配置（包括禁用的）/ Get all backend configurations (including disabled ones)
function getAllAcpBackends() {
    return Object.values(exports.ACP_BACKENDS_ALL);
}
// 检查后端是否启用 / Check if a backend is enabled
function isAcpBackendEnabled(backend) {
    var _a, _b;
    return (_b = (_a = exports.ACP_BACKENDS_ALL[backend]) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : false;
}
// ACP 错误类型系统 - 优雅的错误处理 / ACP Error Type System - Elegant error handling
var AcpErrorType;
(function (AcpErrorType) {
    AcpErrorType["CONNECTION_NOT_READY"] = "CONNECTION_NOT_READY";
    AcpErrorType["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
    AcpErrorType["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    AcpErrorType["NETWORK_ERROR"] = "NETWORK_ERROR";
    AcpErrorType["TIMEOUT"] = "TIMEOUT";
    AcpErrorType["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    AcpErrorType["UNKNOWN"] = "UNKNOWN";
})(AcpErrorType || (exports.AcpErrorType = AcpErrorType = {}));
// 创建 ACP 错误的辅助函数 / Helper function to create ACP errors
function createAcpError(type, message, retryable = false, details) {
    return {
        type,
        code: type.toString(),
        message,
        retryable,
        details,
    };
}
function isRetryableError(error) {
    return error.retryable || error.type === AcpErrorType.CONNECTION_NOT_READY;
}
// ACP JSON-RPC 协议类型 / ACP JSON-RPC Protocol Types
exports.JSONRPC_VERSION = '2.0';
// ===== ACP 协议方法常量 / ACP Protocol Method Constants =====
// 这些常量定义了 ACP 协议中使用的 method 名称
// 来源：现有代码实现（无官方协议文档，如有更新请同步修改）
// These constants define the method names used in the ACP protocol.
// Source: Existing code implementation (no official protocol docs, sync changes if updated).
exports.ACP_METHODS = {
    SESSION_UPDATE: 'session/update',
    REQUEST_PERMISSION: 'session/request_permission',
    READ_TEXT_FILE: 'fs/read_text_file',
    WRITE_TEXT_FILE: 'fs/write_text_file',
};
//# sourceMappingURL=acpTypes.js.map