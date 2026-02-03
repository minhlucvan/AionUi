"use strict";
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvStorage = exports.ConfigStorage = exports.ChatMessageStorage = exports.ChatStorage = void 0;
const platform_1 = require("@office-ai/platform");
/**
 * @description 聊天相关的存储
 */
exports.ChatStorage = platform_1.storage.buildStorage('agent.chat');
// 聊天消息存储
exports.ChatMessageStorage = platform_1.storage.buildStorage('agent.chat.message');
// 系统配置存储
exports.ConfigStorage = platform_1.storage.buildStorage('agent.config');
// 系统环境变量存储
exports.EnvStorage = platform_1.storage.buildStorage('agent.env');
//# sourceMappingURL=storage.js.map