"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RendererType = exports.OutputFormat = exports.ToolCategory = void 0;
// 工具类别枚举
var ToolCategory;
(function (ToolCategory) {
    ToolCategory["EXECUTION"] = "execution";
    ToolCategory["FILE_OPS"] = "file_ops";
    ToolCategory["SEARCH"] = "search";
    ToolCategory["ANALYSIS"] = "analysis";
    ToolCategory["COMMUNICATION"] = "communication";
    ToolCategory["CUSTOM"] = "custom";
})(ToolCategory || (exports.ToolCategory = ToolCategory = {}));
// 输出格式枚举
var OutputFormat;
(function (OutputFormat) {
    OutputFormat["TEXT"] = "text";
    OutputFormat["MARKDOWN"] = "markdown";
    OutputFormat["JSON"] = "json";
    OutputFormat["IMAGE"] = "image";
    OutputFormat["CHART"] = "chart";
    OutputFormat["DIAGRAM"] = "diagram";
    OutputFormat["TABLE"] = "table";
})(OutputFormat || (exports.OutputFormat = OutputFormat = {}));
// 渲染器类型枚举
var RendererType;
(function (RendererType) {
    RendererType["STANDARD"] = "standard";
    RendererType["MARKDOWN"] = "markdown";
    RendererType["CODE"] = "code";
    RendererType["CHART"] = "chart";
    RendererType["IMAGE"] = "image";
    RendererType["INTERACTIVE"] = "interactive";
    RendererType["COMPOSITE"] = "composite";
})(RendererType || (exports.RendererType = RendererType = {}));
//# sourceMappingURL=toolTypes.js.map