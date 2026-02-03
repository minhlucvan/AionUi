"use strict";
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleImageGenerationWithWorkspace = exports.composeMessage = exports.transformMessage = exports.joinPath = void 0;
const utils_1 = require("./utils");
/**
 * 安全的路径拼接函数，兼容Windows和Mac
 * @param basePath 基础路径
 * @param relativePath 相对路径
 * @returns 拼接后的绝对路径
 */
const joinPath = (basePath, relativePath) => {
    // 标准化路径分隔符为 /
    const normalizePath = (path) => path.replace(/\\/g, '/');
    const base = normalizePath(basePath);
    const relative = normalizePath(relativePath);
    // 去掉base路径末尾的斜杠
    const cleanBase = base.replace(/\/+$/, '');
    // 处理相对路径中的 ./ 和 ../
    const parts = relative.split('/');
    const resultParts = [];
    for (const part of parts) {
        if (part === '.' || part === '') {
            continue; // 跳过 . 和空字符串
        }
        else if (part === '..') {
            // 处理上级目录
            if (resultParts.length > 0) {
                resultParts.pop(); // 移除最后一个部分
            }
        }
        else {
            resultParts.push(part);
        }
    }
    // 拼接路径
    const result = cleanBase + '/' + resultParts.join('/');
    // 确保路径格式正确
    return result.replace(/\/+/g, '/'); // 将多个连续的斜杠替换为单个
};
exports.joinPath = joinPath;
/**
 * @description 将后端返回的消息转换为前端消息
 * */
const transformMessage = (message) => {
    switch (message.type) {
        case 'error': {
            return {
                id: (0, utils_1.uuid)(),
                type: 'tips',
                msg_id: message.msg_id,
                position: 'center',
                conversation_id: message.conversation_id,
                content: {
                    content: message.data,
                    type: 'error',
                },
            };
        }
        case 'content':
        case 'user_content': {
            return {
                id: (0, utils_1.uuid)(),
                type: 'text',
                msg_id: message.msg_id,
                position: message.type === 'content' ? 'left' : 'right',
                conversation_id: message.conversation_id,
                content: {
                    content: message.data,
                },
            };
        }
        case 'tool_call': {
            return {
                id: (0, utils_1.uuid)(),
                type: 'tool_call',
                msg_id: message.msg_id,
                conversation_id: message.conversation_id,
                position: 'left',
                content: message.data,
            };
        }
        case 'tool_group': {
            return {
                type: 'tool_group',
                id: (0, utils_1.uuid)(),
                msg_id: message.msg_id,
                conversation_id: message.conversation_id,
                content: message.data,
            };
        }
        case 'agent_status': {
            return {
                id: (0, utils_1.uuid)(),
                type: 'agent_status',
                msg_id: message.msg_id,
                position: 'center',
                conversation_id: message.conversation_id,
                content: message.data,
            };
        }
        case 'acp_permission': {
            return {
                id: (0, utils_1.uuid)(),
                type: 'acp_permission',
                msg_id: message.msg_id,
                position: 'left',
                conversation_id: message.conversation_id,
                content: message.data,
            };
        }
        case 'acp_tool_call': {
            return {
                id: (0, utils_1.uuid)(),
                type: 'acp_tool_call',
                msg_id: message.msg_id,
                position: 'left',
                conversation_id: message.conversation_id,
                content: message.data,
            };
        }
        case 'codex_permission': {
            return {
                id: (0, utils_1.uuid)(),
                type: 'codex_permission',
                msg_id: message.msg_id,
                position: 'left',
                conversation_id: message.conversation_id,
                content: message.data,
            };
        }
        case 'codex_tool_call': {
            return {
                id: (0, utils_1.uuid)(),
                type: 'codex_tool_call',
                msg_id: message.msg_id,
                position: 'left',
                conversation_id: message.conversation_id,
                content: message.data,
            };
        }
        case 'start':
        case 'finish':
        case 'thought':
            break;
        default: {
            throw new Error(`Unsupported message type '${message.type}'. All non-standard message types should be pre-processed by respective AgentManagers.`);
        }
    }
};
exports.transformMessage = transformMessage;
/**
 * @description 将消息合并到消息列表中
 * */
const composeMessage = (message, list) => {
    var _a, _b;
    if (!message)
        return list || [];
    if (!(list === null || list === void 0 ? void 0 : list.length))
        return [message];
    const last = list[list.length - 1];
    if (message.type === 'tool_group') {
        const tools = message.content.slice();
        for (let i = 0, len = list.length; i < len; i++) {
            const existingMessage = list[i];
            if (existingMessage.type === 'tool_group') {
                if (!existingMessage.content.length)
                    continue;
                // Create a new content array with merged tool data
                const newContent = existingMessage.content.map((tool) => {
                    const newToolIndex = tools.findIndex((t) => t.callId === tool.callId);
                    if (newToolIndex === -1)
                        return tool;
                    // Create new object instead of mutating original
                    const merged = Object.assign(Object.assign({}, tool), tools[newToolIndex]);
                    tools.splice(newToolIndex, 1);
                    return merged;
                });
                // Create a new message object instead of mutating the existing one
                // This ensures database update detection works correctly
                list[i] = Object.assign(Object.assign({}, existingMessage), { content: newContent });
            }
        }
        if (tools.length) {
            message.content = tools;
            list.push(message);
        }
        return list;
    }
    // Handle Gemini tool_call message merging
    if (message.type === 'tool_call') {
        for (let i = 0, len = list.length; i < len; i++) {
            const msg = list[i];
            if (msg.type === 'tool_call' && msg.content.callId === message.content.callId) {
                // Create new object instead of mutating original
                const merged = Object.assign(Object.assign({}, msg.content), message.content);
                list[i] = Object.assign(Object.assign({}, msg), { content: merged });
                return list;
            }
        }
        // If no existing tool call found, add new one
        list.push(message);
        return list;
    }
    // Handle codex_tool_call message merging
    if (message.type === 'codex_tool_call') {
        for (let i = 0, len = list.length; i < len; i++) {
            const msg = list[i];
            if (msg.type === 'codex_tool_call' && msg.content.toolCallId === message.content.toolCallId) {
                // Create new object instead of mutating original
                const merged = Object.assign(Object.assign({}, msg.content), message.content);
                list[i] = Object.assign(Object.assign({}, msg), { content: merged });
                return list;
            }
        }
        // If no existing tool call found, add new one
        list.push(message);
        return list;
    }
    // Handle acp_tool_call message merging (same logic as codex_tool_call)
    if (message.type === 'acp_tool_call') {
        for (let i = 0, len = list.length; i < len; i++) {
            const msg = list[i];
            if (msg.type === 'acp_tool_call' && ((_a = msg.content.update) === null || _a === void 0 ? void 0 : _a.toolCallId) === ((_b = message.content.update) === null || _b === void 0 ? void 0 : _b.toolCallId)) {
                // Create new object instead of mutating original
                const merged = Object.assign(Object.assign({}, msg.content), message.content);
                list[i] = Object.assign(Object.assign({}, msg), { content: merged });
                return list;
            }
        }
        // If no existing tool call found, add new one
        list.push(message);
        return list;
    }
    if (last.msg_id !== message.msg_id || last.type !== message.type)
        return list.concat(message);
    if (message.type === 'text' && last.type === 'text') {
        message.content.content = last.content.content + message.content.content;
    }
    Object.assign(last, message);
    return list;
};
exports.composeMessage = composeMessage;
const handleImageGenerationWithWorkspace = (message, workspace) => {
    // 只处理text类型的消息
    if (message.type !== 'text') {
        return message;
    }
    // 深拷贝消息以避免修改原始对象
    const processedMessage = Object.assign(Object.assign({}, message), { content: Object.assign(Object.assign({}, message.content), { content: message.content.content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, imagePath) => {
                // 如果是绝对路径、http链接或data URL，保持不变
                if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('/') || imagePath.startsWith('file:') || imagePath.startsWith('\\') || /^[A-Za-z]:/.test(imagePath)) {
                    return match;
                }
                // 如果是相对路径，与workspace拼接
                const absolutePath = (0, exports.joinPath)(workspace, imagePath);
                return `![${alt}](${encodeURI(absolutePath)})`;
            }) }) });
    return processedMessage;
};
exports.handleImageGenerationWithWorkspace = handleImageGenerationWithWorkspace;
//# sourceMappingURL=chatLib.js.map