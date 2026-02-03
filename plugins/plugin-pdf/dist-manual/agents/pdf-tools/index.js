"use strict";
/**
 * PDF Tools Agent — Class-based agent for the PDF plugin.
 *
 * Lives in: plugin-pdf/src/agents/pdf-tools/index.ts
 *
 * This agent bundles:
 *   - System prompt for PDF capabilities
 *   - "pdf" skill (SKILL.md + reference docs)
 *   - 6 PDF tools (split, merge, convert, extract, fill, check)
 *
 * Demonstrates the class-based agent pattern with lifecycle hooks.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var PluginAgentBase_1 = require("../../../../../src/plugin/agents/PluginAgentBase");
var PdfToolsAgent = /** @class */ (function (_super) {
    __extends(PdfToolsAgent, _super);
    function PdfToolsAgent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.id = 'pdf-tools';
        _this.name = 'PDF Tools';
        _this.nameI18n = {
            'en-US': 'PDF Tools',
            'zh-CN': 'PDF 工具',
        };
        _this.description = 'PDF processing: split, merge, convert to images, extract and fill forms.';
        _this.descriptionI18n = {
            'en-US': 'PDF processing: split, merge, convert to images, extract and fill forms.',
            'zh-CN': 'PDF 处理：拆分、合并、转换为图片、提取和填充表单。',
        };
        _this.avatar = '📄';
        _this.presetAgentType = 'gemini';
        _this.prompts = ['Split this PDF into individual pages', 'Extract form fields from document.pdf'];
        _this.promptsI18n = {
            'en-US': ['Split this PDF into individual pages', 'Extract form fields from document.pdf'],
            'zh-CN': ['将这个PDF拆分为单独的页面', '从document.pdf中提取表单字段'],
        };
        return _this;
    }
    PdfToolsAgent.prototype.activate = function (ctx) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.activate.call(this, ctx)];
                    case 1:
                        _a.sent();
                        ctx.logger.info('PDF Tools agent activated');
                        return [2 /*return*/];
                }
            });
        });
    };
    PdfToolsAgent.prototype.getSkills = function () {
        return ['pdf'];
    };
    PdfToolsAgent.prototype.getToolNames = function () {
        return ['pdf_split', 'pdf_merge', 'pdf_to_images', 'pdf_extract_form_fields', 'pdf_fill_form', 'pdf_check_fields'];
    };
    PdfToolsAgent.prototype.onConversationStart = function (ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                (_a = this.context) === null || _a === void 0 ? void 0 : _a.logger.info("PDF agent: conversation ".concat(ctx.conversationId, " started"));
                return [2 /*return*/];
            });
        });
    };
    return PdfToolsAgent;
}(PluginAgentBase_1.PluginAgentBase));
exports.default = PdfToolsAgent;
