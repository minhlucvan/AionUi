/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * AionRouter 协议检测器
 * Protocol Detector for AionRouter
 *
 * 支持自动检测 API 端点使用的协议类型：
 * - OpenAI 协议（大多数第三方服务）
 * - Gemini 协议（Google 官方）
 * - Anthropic 协议（Claude 官方）
 */
/**
 * 支持的协议类型
 * Supported protocol types
 */
export type ProtocolType = 'openai' | 'gemini' | 'anthropic' | 'unknown';
/**
 * 协议检测结果
 * Protocol detection result
 */
export interface ProtocolDetectionResult {
    /** 检测到的协议类型 / Detected protocol type */
    protocol: ProtocolType;
    /** 是否检测成功 / Whether detection succeeded */
    success: boolean;
    /** 置信度 (0-100) / Confidence level (0-100) */
    confidence: number;
    /** 响应时间 (ms) / Response time in milliseconds */
    latency?: number;
    /** 错误信息 / Error message */
    error?: string;
    /** 修正后的 base URL / Fixed base URL if needed */
    fixedBaseUrl?: string;
    /** 额外信息 / Additional info */
    metadata?: {
        /** 模型列表（如果获取成功）/ Model list if available */
        models?: string[];
        /** API 版本 / API version */
        apiVersion?: string;
        /** 服务商名称 / Provider name */
        providerName?: string;
    };
}
/**
 * 多 Key 测试结果
 * Multi-key test result
 */
export interface MultiKeyTestResult {
    /** 总 Key 数量 / Total key count */
    total: number;
    /** 有效 Key 数量 / Valid key count */
    valid: number;
    /** 无效 Key 数量 / Invalid key count */
    invalid: number;
    /** 每个 Key 的详细结果 / Detailed result for each key */
    details: Array<{
        /** Key 索引 / Key index */
        index: number;
        /** Key 掩码（只显示前后几位）/ Masked key */
        maskedKey: string;
        /** 是否有效 / Whether valid */
        valid: boolean;
        /** 错误信息 / Error message */
        error?: string;
        /** 响应时间 / Latency */
        latency?: number;
    }>;
}
/**
 * 协议检测请求参数
 * Protocol detection request parameters
 */
export interface ProtocolDetectionRequest {
    /** Base URL */
    baseUrl: string;
    /** API Key（可以是逗号或换行分隔的多个 Key）/ API Key (can be comma or newline separated) */
    apiKey: string;
    /** 超时时间（毫秒）/ Timeout in milliseconds */
    timeout?: number;
    /** 是否测试所有 Key（默认只测试第一个）/ Whether to test all keys */
    testAllKeys?: boolean;
    /** 指定要测试的协议（如果已知）/ Specific protocol to test (if known) */
    preferredProtocol?: ProtocolType;
}
/**
 * 协议检测响应
 * Protocol detection response
 */
export interface ProtocolDetectionResponse {
    /** 是否成功 / Whether successful */
    success: boolean;
    /** 检测到的协议 / Detected protocol */
    protocol: ProtocolType;
    /** 置信度 / Confidence */
    confidence: number;
    /** 错误信息 / Error message */
    error?: string;
    /** 修正后的 base URL / Fixed base URL */
    fixedBaseUrl?: string;
    /** 建议操作 / Suggested action */
    suggestion?: {
        /** 建议类型 / Suggestion type */
        type: 'switch_platform' | 'fix_url' | 'check_key' | 'none';
        /** 建议消息 / Suggestion message */
        message: string;
        /** 建议的平台 / Suggested platform */
        suggestedPlatform?: string;
        /** i18n key（前端使用）/ i18n key for frontend */
        i18nKey?: string;
        /** i18n 参数 / i18n parameters */
        i18nParams?: Record<string, string>;
    };
    /** 多 Key 测试结果（如果启用）/ Multi-key test result if enabled */
    multiKeyResult?: MultiKeyTestResult;
    /** 模型列表 / Model list */
    models?: string[];
}
/**
 * 协议特征定义
 * Protocol signature definitions
 */
interface ProtocolSignature {
    /** 协议类型 / Protocol type */
    protocol: ProtocolType;
    /** 测试端点模板 / Test endpoint templates */
    endpoints: Array<{
        path: string;
        method: 'GET' | 'POST';
        /** 请求头 / Headers */
        headers?: (apiKey: string) => Record<string, string>;
        /** 请求体（POST 请求）/ Request body for POST */
        body?: object;
        /** 响应验证器 / Response validator */
        validator: (response: any, status: number) => boolean;
    }>;
    /** API Key 格式验证 / API Key format validation */
    keyPattern?: RegExp;
    /** URL 特征 / URL characteristics */
    urlPatterns?: RegExp[];
}
/**
 * 协议签名配置
 * Protocol signature configurations
 *
 * 参考 GPT-Load 的 Channel 设计，每个协议定义其特征
 * Reference GPT-Load Channel design, each protocol defines its signatures
 */
export declare const PROTOCOL_SIGNATURES: ProtocolSignature[];
/**
 * 已知的第三方 OpenAI 兼容服务 Key 格式
 * Known third-party OpenAI-compatible service key patterns
 *
 * 这些服务使用 OpenAI 协议，但 Key 格式不同
 * These services use OpenAI protocol but with different key formats
 */
export declare const THIRD_PARTY_KEY_PATTERNS: Array<{
    pattern: RegExp;
    name: string;
    protocol: ProtocolType;
}>;
/**
 * 解析多个 API Key
 * Parse multiple API keys from string
 */
export declare function parseApiKeys(apiKeyString: string): string[];
/**
 * 掩码 API Key
 * Mask API key for display
 */
export declare function maskApiKey(apiKey: string): string;
/**
 * 常见的 API 路径后缀
 * Common API path suffixes
 *
 * 用于生成候选 URL 列表，当用户输入完整端点 URL 时可以尝试移除这些后缀
 * Used to generate candidate URL list when user enters full endpoint URL
 */
export declare const API_PATH_SUFFIXES: string[];
/**
 * 规范化 Base URL（仅做基本清理）
 * Normalize base URL (basic cleanup only)
 *
 * 只移除末尾斜杠，不修改路径
 * Only removes trailing slashes, does not modify path
 */
export declare function normalizeBaseUrl(baseUrl: string): string;
/**
 * 从 URL 中移除已知的 API 路径后缀
 * Remove known API path suffix from URL
 */
export declare function removeApiPathSuffix(baseUrl: string): string | null;
/**
 * 根据 URL 猜测协议类型
 * Guess protocol type from URL
 */
export declare function guessProtocolFromUrl(baseUrl: string): ProtocolType | null;
/**
 * 根据 API Key 格式猜测协议类型
 * Guess protocol type from API key format
 *
 * 优先匹配更具体的模式，然后是通用模式
 * Prioritize more specific patterns, then general patterns
 */
export declare function guessProtocolFromKey(apiKey: string): ProtocolType | null;
/**
 * 根据 API Key 识别服务提供商名称
 * Identify service provider name from API key
 */
export declare function identifyProviderFromKey(apiKey: string): string | null;
/**
 * 获取协议的显示名称
 * Get display name for protocol
 */
export declare function getProtocolDisplayName(protocol: ProtocolType): string;
/**
 * 获取协议对应的推荐平台
 * Get recommended platform for protocol
 */
export declare function getRecommendedPlatform(protocol: ProtocolType): string | null;
export {};
//# sourceMappingURL=protocolDetector.d.ts.map