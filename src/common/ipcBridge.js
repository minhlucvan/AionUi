"use strict";
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowControls = exports.document = exports.preview = exports.previewHistory = exports.database = exports.codexConversation = exports.mcpService = exports.acpConversation = exports.mode = exports.gemini = exports.googleAuth = exports.fileStream = exports.fileWatch = exports.fs = exports.dialog = exports.application = exports.geminiConversation = exports.conversation = exports.shell = void 0;
const platform_1 = require("@office-ai/platform");
exports.shell = {
    openFile: platform_1.bridge.buildProvider('open-file'), // 使用系统默认程序打开文件
    showItemInFolder: platform_1.bridge.buildProvider('show-item-in-folder'), // 打开文件夹
    openExternal: platform_1.bridge.buildProvider('open-external'), // 使用系统默认程序打开外部链接
};
//通用会话能力
exports.conversation = {
    create: platform_1.bridge.buildProvider('create-conversation'), // 创建对话
    createWithConversation: platform_1.bridge.buildProvider('create-conversation-with-conversation'), // Create new conversation from history (supports migration) / 通过历史会话创建新对话（支持迁移）
    get: platform_1.bridge.buildProvider('get-conversation'), // 获取对话信息
    getAssociateConversation: platform_1.bridge.buildProvider('get-associated-conversation'), // 获取关联对话
    remove: platform_1.bridge.buildProvider('remove-conversation'), // 删除对话
    update: platform_1.bridge.buildProvider('update-conversation'), // 更新对话信息
    reset: platform_1.bridge.buildProvider('reset-conversation'), // 重置对话
    stop: platform_1.bridge.buildProvider('chat.stop.stream'), // 停止会话
    sendMessage: platform_1.bridge.buildProvider('chat.send.message'), // 发送消息（统一接口）
    confirmMessage: platform_1.bridge.buildProvider('conversation.confirm.message'), // 通用确认消息
    responseStream: platform_1.bridge.buildEmitter('chat.response.stream'), // 接收消息（统一接口）
    getWorkspace: platform_1.bridge.buildProvider('conversation.get-workspace'),
    responseSearchWorkSpace: platform_1.bridge.buildProvider('conversation.response.search.workspace'),
    reloadContext: platform_1.bridge.buildProvider('conversation.reload-context'),
};
// Gemini对话相关接口 - 复用统一的conversation接口
exports.geminiConversation = {
    sendMessage: exports.conversation.sendMessage,
    confirmMessage: platform_1.bridge.buildProvider('input.confirm.message'),
    responseStream: exports.conversation.responseStream,
};
exports.application = {
    restart: platform_1.bridge.buildProvider('restart-app'), // 重启应用
    openDevTools: platform_1.bridge.buildProvider('open-dev-tools'), // 打开开发者工具
    systemInfo: platform_1.bridge.buildProvider('system.info'), // 获取系统信息
    updateSystemInfo: platform_1.bridge.buildProvider('system.update-info'), // 更新系统信息
    getZoomFactor: platform_1.bridge.buildProvider('app.get-zoom-factor'),
    setZoomFactor: platform_1.bridge.buildProvider('app.set-zoom-factor'),
};
exports.dialog = {
    showOpen: platform_1.bridge.buildProvider('show-open'), // 打开文件/文件夹选择窗口
};
exports.fs = {
    getFilesByDir: platform_1.bridge.buildProvider('get-file-by-dir'), // 获取指定文件夹下所有文件夹和文件列表
    getImageBase64: platform_1.bridge.buildProvider('get-image-base64'), // 获取图片base64
    fetchRemoteImage: platform_1.bridge.buildProvider('fetch-remote-image'), // 远程图片转base64
    readFile: platform_1.bridge.buildProvider('read-file'), // 读取文件内容（UTF-8）
    readFileBuffer: platform_1.bridge.buildProvider('read-file-buffer'), // 读取二进制文件为 ArrayBuffer
    createTempFile: platform_1.bridge.buildProvider('create-temp-file'), // 创建临时文件
    writeFile: platform_1.bridge.buildProvider('write-file'), // 写入文件
    getFileMetadata: platform_1.bridge.buildProvider('get-file-metadata'), // 获取文件元数据
    copyFilesToWorkspace: platform_1.bridge.buildProvider('copy-files-to-workspace'), // 复制文件到工作空间 (Copy files into workspace)
    removeEntry: platform_1.bridge.buildProvider('remove-entry'), // 删除文件或文件夹
    renameEntry: platform_1.bridge.buildProvider('rename-entry'), // 重命名文件或文件夹
    readBuiltinRule: platform_1.bridge.buildProvider('read-builtin-rule'), // 读取内置 rules 文件
    readBuiltinSkill: platform_1.bridge.buildProvider('read-builtin-skill'), // 读取内置 skills 文件
    // 助手规则文件操作 / Assistant rule file operations
    readAssistantRule: platform_1.bridge.buildProvider('read-assistant-rule'), // 读取助手规则文件
    writeAssistantRule: platform_1.bridge.buildProvider('write-assistant-rule'), // 写入助手规则文件
    deleteAssistantRule: platform_1.bridge.buildProvider('delete-assistant-rule'), // 删除助手规则文件
    // 助手技能文件操作 / Assistant skill file operations
    readAssistantSkill: platform_1.bridge.buildProvider('read-assistant-skill'), // 读取助手技能文件
    writeAssistantSkill: platform_1.bridge.buildProvider('write-assistant-skill'), // 写入助手技能文件
    deleteAssistantSkill: platform_1.bridge.buildProvider('delete-assistant-skill'), // 删除助手技能文件
    // 获取可用 skills 列表 / List available skills from skills directory
    listAvailableSkills: platform_1.bridge.buildProvider('list-available-skills'),
    // 读取 skill 信息（不导入）/ Read skill info without importing
    readSkillInfo: platform_1.bridge.buildProvider('read-skill-info'),
    // 导入 skill 目录 / Import skill directory
    importSkill: platform_1.bridge.buildProvider('import-skill'),
    // 扫描目录下的 skills / Scan directory for skills
    scanForSkills: platform_1.bridge.buildProvider('scan-for-skills'),
    // 检测常见的 skills 路径 / Detect common skills paths
    detectCommonSkillPaths: platform_1.bridge.buildProvider('detect-common-skill-paths'),
};
exports.fileWatch = {
    startWatch: platform_1.bridge.buildProvider('file-watch-start'), // 开始监听文件变化
    stopWatch: platform_1.bridge.buildProvider('file-watch-stop'), // 停止监听文件变化
    stopAllWatches: platform_1.bridge.buildProvider('file-watch-stop-all'), // 停止所有文件监听
    fileChanged: platform_1.bridge.buildEmitter('file-changed'), // 文件变化事件
};
// 文件流式更新（Agent 写入文件时实时推送内容）/ File streaming updates (real-time content push when agent writes)
exports.fileStream = {
    contentUpdate: platform_1.bridge.buildEmitter('file-stream-content-update'), // Agent 写入文件时的流式内容更新 / Streaming content update when agent writes file
};
exports.googleAuth = {
    login: platform_1.bridge.buildProvider('google.auth.login'),
    logout: platform_1.bridge.buildProvider('google.auth.logout'),
    status: platform_1.bridge.buildProvider('google.auth.status'),
};
// 订阅状态查询：用于动态决定是否展示 gemini-3-pro-preview / subscription check for Gemini models
exports.gemini = {
    subscriptionStatus: platform_1.bridge.buildProvider('gemini.subscription-status'),
};
exports.mode = {
    fetchModelList: platform_1.bridge.buildProvider('mode.get-model-list'),
    saveModelConfig: platform_1.bridge.buildProvider('mode.save-model-config'),
    getModelConfig: platform_1.bridge.buildProvider('mode.get-model-config'),
    /** 协议检测接口 - 自动检测 API 端点使用的协议类型 / Protocol detection - auto-detect API protocol type */
    detectProtocol: platform_1.bridge.buildProvider('mode.detect-protocol'),
};
// ACP对话相关接口 - 复用统一的conversation接口
exports.acpConversation = {
    sendMessage: exports.conversation.sendMessage,
    confirmMessage: platform_1.bridge.buildProvider('acp.input.confirm.message'),
    responseStream: exports.conversation.responseStream,
    detectCliPath: platform_1.bridge.buildProvider('acp.detect-cli-path'),
    getAvailableAgents: platform_1.bridge.buildProvider('acp.get-available-agents'),
    checkEnv: platform_1.bridge.buildProvider('acp.check.env'),
    refreshCustomAgents: platform_1.bridge.buildProvider('acp.refresh-custom-agents'),
    // clearAllCache: bridge.buildProvider<IBridgeResponse<{ details?: any }>, void>('acp.clear.all.cache'),
};
// MCP 服务相关接口
exports.mcpService = {
    getAgentMcpConfigs: platform_1.bridge.buildProvider('mcp.get-agent-configs'),
    testMcpConnection: platform_1.bridge.buildProvider('mcp.test-connection'),
    syncMcpToAgents: platform_1.bridge.buildProvider('mcp.sync-to-agents'),
    removeMcpFromAgents: platform_1.bridge.buildProvider('mcp.remove-from-agents'),
    // OAuth 相关接口
    checkOAuthStatus: platform_1.bridge.buildProvider('mcp.check-oauth-status'),
    loginMcpOAuth: platform_1.bridge.buildProvider('mcp.login-oauth'),
    logoutMcpOAuth: platform_1.bridge.buildProvider('mcp.logout-oauth'),
    getAuthenticatedServers: platform_1.bridge.buildProvider('mcp.get-authenticated-servers'),
};
// Codex 对话相关接口 - 复用统一的conversation接口
exports.codexConversation = {
    sendMessage: exports.conversation.sendMessage,
    confirmMessage: platform_1.bridge.buildProvider('codex.input.confirm.message'),
    responseStream: exports.conversation.responseStream,
};
// Database operations
exports.database = {
    getConversationMessages: platform_1.bridge.buildProvider('database.get-conversation-messages'),
    getUserConversations: platform_1.bridge.buildProvider('database.get-user-conversations'),
};
exports.previewHistory = {
    list: platform_1.bridge.buildProvider('preview-history.list'),
    save: platform_1.bridge.buildProvider('preview-history.save'),
    getContent: platform_1.bridge.buildProvider('preview-history.get-content'),
};
// 预览面板相关接口 / Preview panel API
exports.preview = {
    // Agent 触发打开预览（如 chrome-devtools 导航到 URL）/ Agent triggers open preview (e.g., chrome-devtools navigates to URL)
    open: platform_1.bridge.buildEmitter('preview.open'),
};
exports.document = {
    convert: platform_1.bridge.buildProvider('document.convert'),
};
// 窗口控制相关接口 / Window controls API
exports.windowControls = {
    minimize: platform_1.bridge.buildProvider('window-controls:minimize'),
    maximize: platform_1.bridge.buildProvider('window-controls:maximize'),
    unmaximize: platform_1.bridge.buildProvider('window-controls:unmaximize'),
    close: platform_1.bridge.buildProvider('window-controls:close'),
    isMaximized: platform_1.bridge.buildProvider('window-controls:is-maximized'),
    maximizedChanged: platform_1.bridge.buildEmitter('window-controls:maximized-changed'),
};
//# sourceMappingURL=ipcBridge.js.map