"use strict";
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_DECISION_MAP = exports.PermissionSeverity = exports.PermissionType = void 0;
// ===== UI-facing permission request payloads for Codex =====
/**
 * 权限类型枚举
 */
var PermissionType;
(function (PermissionType) {
    PermissionType["COMMAND_EXECUTION"] = "command_execution";
    PermissionType["FILE_WRITE"] = "file_write";
    PermissionType["FILE_READ"] = "file_read";
})(PermissionType || (exports.PermissionType = PermissionType = {}));
/**
 * 权限选项严重级别
 */
var PermissionSeverity;
(function (PermissionSeverity) {
    PermissionSeverity["LOW"] = "low";
    PermissionSeverity["MEDIUM"] = "medium";
    PermissionSeverity["HIGH"] = "high";
    PermissionSeverity["CRITICAL"] = "critical";
})(PermissionSeverity || (exports.PermissionSeverity = PermissionSeverity = {}));
/**
 * 权限决策类型映射
 * 将UI选项映射到后端决策逻辑
 * 参考 Codex 源码 approved approved_for_session denied abort
 */
exports.PERMISSION_DECISION_MAP = {
    allow_once: 'approved',
    allow_always: 'approved_for_session',
    reject_once: 'denied',
    reject_always: 'abort',
};
//# sourceMappingURL=permissionTypes.js.map