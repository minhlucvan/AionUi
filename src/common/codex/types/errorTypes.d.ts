/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
export interface CodexError extends Error {
    code: string;
    originalError?: Error | string;
    context?: string;
    retryCount?: number;
    timestamp?: Date;
    userMessage?: string;
    technicalDetails?: Record<string, unknown>;
}
export declare const ERROR_CODES: {
    readonly CLOUDFLARE_BLOCKED: "CLOUDFLARE_BLOCKED";
    readonly NETWORK_TIMEOUT: "NETWORK_TIMEOUT";
    readonly NETWORK_REFUSED: "CONNECTION_REFUSED";
    readonly NETWORK_UNKNOWN: "NETWORK_UNKNOWN";
    readonly SYSTEM_INIT_FAILED: "SYSTEM_INIT_FAILED";
    readonly SESSION_TIMEOUT: "SESSION_TIMEOUT";
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly INVALID_MESSAGE_FORMAT: "INVALID_MESSAGE_FORMAT";
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly UNKNOWN_ERROR: "UNKNOWN_ERROR";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
//# sourceMappingURL=errorTypes.d.ts.map