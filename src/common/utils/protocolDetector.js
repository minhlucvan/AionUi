"use strict";
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_PATH_SUFFIXES = exports.THIRD_PARTY_KEY_PATTERNS = exports.PROTOCOL_SIGNATURES = void 0;
exports.parseApiKeys = parseApiKeys;
exports.maskApiKey = maskApiKey;
exports.normalizeBaseUrl = normalizeBaseUrl;
exports.removeApiPathSuffix = removeApiPathSuffix;
exports.guessProtocolFromUrl = guessProtocolFromUrl;
exports.guessProtocolFromKey = guessProtocolFromKey;
exports.identifyProviderFromKey = identifyProviderFromKey;
exports.getProtocolDisplayName = getProtocolDisplayName;
exports.getRecommendedPlatform = getRecommendedPlatform;
/**
 * 协议签名配置
 * Protocol signature configurations
 *
 * 参考 GPT-Load 的 Channel 设计，每个协议定义其特征
 * Reference GPT-Load Channel design, each protocol defines its signatures
 */
exports.PROTOCOL_SIGNATURES = [
    // Gemini 协议
    {
        protocol: 'gemini',
        // Gemini API Key 格式：AIza 开头，后跟 35 个字符
        // Gemini API Key format: starts with AIza, followed by 35 characters
        keyPattern: /^AIza[A-Za-z0-9_-]{35}$/,
        urlPatterns: [
            /generativelanguage\.googleapis\.com/, // 标准 Gemini API
            /aiplatform\.googleapis\.com/, // Vertex AI
            /gemini\.google\.com/, // Gemini 网页版
            /aistudio\.google\.com/, // AI Studio
        ],
        endpoints: [
            {
                path: '/v1beta/models',
                method: 'GET',
                headers: () => ({}),
                validator: (response, status) => {
                    if (status !== 200)
                        return false;
                    return (response === null || response === void 0 ? void 0 : response.models) && Array.isArray(response.models);
                },
            },
            {
                path: '/v1/models',
                method: 'GET',
                headers: () => ({}),
                validator: (response, status) => {
                    if (status !== 200)
                        return false;
                    return (response === null || response === void 0 ? void 0 : response.models) && Array.isArray(response.models);
                },
            },
        ],
    },
    // OpenAI 协议（包括兼容服务）
    {
        protocol: 'openai',
        // OpenAI Key 格式多样：
        // - 标准格式: sk-xxx
        // - 项目 Key: sk-proj-xxx
        // - 服务账号: sk-svcacct-xxx
        // - 第三方服务可能使用其他格式
        keyPattern: /^sk-[A-Za-z0-9-_]{20,}$/,
        urlPatterns: [
            /api\.openai\.com/, // OpenAI 官方
            /\.openai\.azure\.com/, // Azure OpenAI
            /api\.deepseek\.com/, // DeepSeek
            /api\.moonshot\.cn/, // Moonshot/Kimi
            /api\.mistral\.ai/, // Mistral AI
            /api\.groq\.com/, // Groq
            /openrouter\.ai/, // OpenRouter
            /api\.together\.xyz/, // Together AI
            /api\.perplexity\.ai/, // Perplexity
            /dashscope\.aliyuncs\.com/, // 阿里云 DashScope
            /aip\.baidubce\.com/, // 百度千帆
            /ark\.cn-beijing\.volces\.com/, // 火山引擎
            /open\.bigmodel\.cn/, // 智谱 AI
            /api\.siliconflow\.cn/, // SiliconFlow
            /api\.lingyiwanwu\.com/, // 零一万物
            /localhost/, // 本地服务
            /127\.0\.0\.1/, // 本地服务
            /0\.0\.0\.0/, // 本地服务
        ],
        endpoints: [
            {
                path: '/models',
                method: 'GET',
                headers: (apiKey) => ({
                    Authorization: `Bearer ${apiKey}`,
                }),
                validator: (response, status) => {
                    if (status !== 200)
                        return false;
                    return (response === null || response === void 0 ? void 0 : response.data) && Array.isArray(response.data);
                },
            },
            {
                path: '/v1/models',
                method: 'GET',
                headers: (apiKey) => ({
                    Authorization: `Bearer ${apiKey}`,
                }),
                validator: (response, status) => {
                    if (status !== 200)
                        return false;
                    return (response === null || response === void 0 ? void 0 : response.data) && Array.isArray(response.data);
                },
            },
        ],
    },
    // Anthropic 协议
    {
        protocol: 'anthropic',
        // Anthropic Key 格式：sk-ant- 开头
        keyPattern: /^sk-ant-[A-Za-z0-9-]{80,}$/,
        urlPatterns: [
            /api\.anthropic\.com/, // Anthropic 官方
            /claude\.ai/, // Claude 网页版
        ],
        endpoints: [
            {
                // Anthropic 没有 models 端点，使用 messages 端点测试
                // Anthropic doesn't have models endpoint, use messages endpoint
                path: '/v1/messages',
                method: 'POST',
                headers: (apiKey) => ({
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                }),
                body: {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }],
                },
                validator: (_response, status) => {
                    // 200 或 400（参数错误但认证成功）都认为是有效的
                    // 200 or 400 (param error but auth success) are both valid
                    return status === 200 || status === 400;
                },
            },
        ],
    },
];
/**
 * 已知的第三方 OpenAI 兼容服务 Key 格式
 * Known third-party OpenAI-compatible service key patterns
 *
 * 这些服务使用 OpenAI 协议，但 Key 格式不同
 * These services use OpenAI protocol but with different key formats
 */
exports.THIRD_PARTY_KEY_PATTERNS = [
    { pattern: /^sk-[A-Za-z0-9-_]{20,}$/, name: 'OpenAI/Compatible', protocol: 'openai' },
    { pattern: /^AIza[A-Za-z0-9_-]{35}$/, name: 'Google/Gemini', protocol: 'gemini' },
    { pattern: /^sk-ant-[A-Za-z0-9-]{80,}$/, name: 'Anthropic', protocol: 'anthropic' },
    { pattern: /^gsk_[A-Za-z0-9]{52}$/, name: 'Groq', protocol: 'openai' },
    { pattern: /^pplx-[A-Za-z0-9]{48}$/, name: 'Perplexity', protocol: 'openai' },
    { pattern: /^[A-Za-z0-9]{32}$/, name: 'DeepSeek/Moonshot', protocol: 'openai' },
    { pattern: /^[A-Za-z0-9]{64}$/, name: 'SiliconFlow/Together', protocol: 'openai' },
];
/**
 * 解析多个 API Key
 * Parse multiple API keys from string
 */
function parseApiKeys(apiKeyString) {
    if (!apiKeyString)
        return [];
    return apiKeyString
        .split(/[,\n]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
}
/**
 * 掩码 API Key
 * Mask API key for display
 */
function maskApiKey(apiKey) {
    if (apiKey.length <= 8)
        return '***';
    return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}
/**
 * 常见的 API 路径后缀
 * Common API path suffixes
 *
 * 用于生成候选 URL 列表，当用户输入完整端点 URL 时可以尝试移除这些后缀
 * Used to generate candidate URL list when user enters full endpoint URL
 */
exports.API_PATH_SUFFIXES = [
    // Gemini 路径
    '/v1beta/models',
    '/v1/models',
    '/models',
    // OpenAI 路径
    '/v1/chat/completions',
    '/chat/completions',
    '/v1/completions',
    '/completions',
    '/v1/embeddings',
    '/embeddings',
    // Anthropic 路径
    '/v1/messages',
    '/messages',
];
/**
 * 规范化 Base URL（仅做基本清理）
 * Normalize base URL (basic cleanup only)
 *
 * 只移除末尾斜杠，不修改路径
 * Only removes trailing slashes, does not modify path
 */
function normalizeBaseUrl(baseUrl) {
    if (!baseUrl)
        return '';
    let url = baseUrl.trim();
    // 移除末尾斜杠
    url = url.replace(/\/+$/, '');
    return url;
}
/**
 * 从 URL 中移除已知的 API 路径后缀
 * Remove known API path suffix from URL
 */
function removeApiPathSuffix(baseUrl) {
    if (!baseUrl)
        return null;
    const url = baseUrl.replace(/\/+$/, '');
    // 按长度降序排列，先匹配更长的路径
    const sortedSuffixes = [...exports.API_PATH_SUFFIXES].sort((a, b) => b.length - a.length);
    for (const suffix of sortedSuffixes) {
        if (url.toLowerCase().endsWith(suffix.toLowerCase())) {
            return url.slice(0, -suffix.length).replace(/\/+$/, '');
        }
    }
    return null; // 没有匹配的后缀
}
/**
 * 根据 URL 猜测协议类型
 * Guess protocol type from URL
 */
function guessProtocolFromUrl(baseUrl) {
    const url = baseUrl.toLowerCase();
    for (const sig of exports.PROTOCOL_SIGNATURES) {
        if (sig.urlPatterns) {
            for (const pattern of sig.urlPatterns) {
                if (pattern.test(url)) {
                    return sig.protocol;
                }
            }
        }
    }
    return null;
}
/**
 * 根据 API Key 格式猜测协议类型
 * Guess protocol type from API key format
 *
 * 优先匹配更具体的模式，然后是通用模式
 * Prioritize more specific patterns, then general patterns
 */
function guessProtocolFromKey(apiKey) {
    // 先尝试标准协议签名
    for (const sig of exports.PROTOCOL_SIGNATURES) {
        if (sig.keyPattern && sig.keyPattern.test(apiKey)) {
            return sig.protocol;
        }
    }
    // 再尝试第三方服务 Key 格式
    for (const pattern of exports.THIRD_PARTY_KEY_PATTERNS) {
        if (pattern.pattern.test(apiKey)) {
            return pattern.protocol;
        }
    }
    return null;
}
/**
 * 根据 API Key 识别服务提供商名称
 * Identify service provider name from API key
 */
function identifyProviderFromKey(apiKey) {
    for (const pattern of exports.THIRD_PARTY_KEY_PATTERNS) {
        if (pattern.pattern.test(apiKey)) {
            return pattern.name;
        }
    }
    return null;
}
/**
 * 获取协议的显示名称
 * Get display name for protocol
 */
function getProtocolDisplayName(protocol) {
    const names = {
        openai: 'OpenAI',
        gemini: 'Gemini',
        anthropic: 'Anthropic',
        unknown: 'Unknown',
    };
    return names[protocol] || protocol;
}
/**
 * 获取协议对应的推荐平台
 * Get recommended platform for protocol
 */
function getRecommendedPlatform(protocol) {
    const platforms = {
        openai: null, // OpenAI 协议是当前项目通过 custom 支持的
        gemini: 'gemini',
        anthropic: 'Anthropic',
        unknown: null,
    };
    return platforms[protocol];
}
//# sourceMappingURL=protocolDetector.js.map