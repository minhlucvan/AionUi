"use strict";
/**
 * aionui-plugin-pdf
 *
 * Migrated from the built-in pdf skill to prove the plugin architecture.
 * Bundles the same SKILL.md, reference docs, and Python scripts as the
 * original /skills/pdf/ directory — but packaged as an installable plugin.
 *
 * Capabilities:
 *   1. System Prompt  → tells the agent it has PDF processing tools
 *   2. Skill          → "pdf" skill (SKILL.md + reference.md + forms.md)
 *   3. Tools          → 6 function-calling tools backed by Python scripts
 *   4. MCP Servers    → none (tools are native function-calling)
 *
 * This works across all AI agents: Claude Code, Gemini, Codex, etc.
 */
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
// ─── Class-based agents (loaded from agents/ folder) ─────────────────────────
var pdf_tools_1 = require("./agents/pdf-tools");
// ─── Plugin State ───────────────────────────────────────────────────────────
/** Resolved at activation time so tool handlers can find bundled scripts. */
var pluginDir = '';
/** Bound reference to the host-provided exec function (requires shell:execute). */
var execCommand = null;
// ─── Helpers ────────────────────────────────────────────────────────────────
/**
 * Resolve the absolute path to a bundled Python script.
 * Scripts live at `<pluginDir>/skills/pdf/scripts/<name>`.
 */
function scriptPath(scriptName) {
    return path.join(pluginDir, 'skills', 'pdf', 'scripts', scriptName);
}
/**
 * Execute a bundled Python script and return a ToolResult.
 *
 * Uses the host-provided `exec()` from PluginContext (granted via the
 * `shell:execute` permission declared in package.json).
 */
function runPythonScript(scriptName, args, logger) {
    return __awaiter(this, void 0, void 0, function () {
        var script, cmd, result, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!execCommand) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Shell execution is not available. Ensure the plugin has the "shell:execute" permission.',
                            }];
                    }
                    script = scriptPath(scriptName);
                    cmd = "python \"".concat(script, "\" ").concat(args.map(function (a) { return "\"".concat(a, "\""); }).join(' '));
                    logger.info("Running: ".concat(cmd));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, execCommand(cmd)];
                case 2:
                    result = _a.sent();
                    if (result.exitCode !== 0) {
                        return [2 /*return*/, {
                                success: false,
                                error: result.stderr || "Script exited with code ".concat(result.exitCode),
                            }];
                    }
                    return [2 /*return*/, {
                            success: true,
                            data: result.stdout,
                            display: { type: 'text', content: result.stdout },
                        }];
                case 3:
                    err_1 = _a.sent();
                    return [2 /*return*/, {
                            success: false,
                            error: "Failed to run ".concat(scriptName, ": ").concat(err_1.message),
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ─── Tool Handlers ──────────────────────────────────────────────────────────
function handlePdfSplit(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var inputPdf, outputPath, pages, args;
        return __generator(this, function (_a) {
            inputPdf = params.inputPdf;
            outputPath = params.outputPath;
            pages = params.pages;
            if (!inputPdf || !outputPath) {
                return [2 /*return*/, {
                        success: false,
                        error: 'Missing required parameters: inputPdf, outputPath',
                    }];
            }
            args = [inputPdf, outputPath];
            if (pages)
                args.push(pages);
            return [2 /*return*/, runPythonScript('split_pdf.py', args, context.logger)];
        });
    });
}
function handlePdfMerge(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var outputPdf, inputPdfs;
        return __generator(this, function (_a) {
            outputPdf = params.outputPdf;
            inputPdfs = params.inputPdfs;
            if (!outputPdf || !inputPdfs || !Array.isArray(inputPdfs) || inputPdfs.length < 2) {
                return [2 /*return*/, {
                        success: false,
                        error: 'Missing required parameters: outputPdf, inputPdfs (array of at least 2 paths)',
                    }];
            }
            return [2 /*return*/, runPythonScript('merge_pdfs.py', __spreadArray([outputPdf], inputPdfs, true), context.logger)];
        });
    });
}
function handlePdfToImages(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var inputPdf, outputDir, dpi, args;
        return __generator(this, function (_a) {
            inputPdf = params.inputPdf;
            outputDir = params.outputDir;
            dpi = params.dpi;
            if (!inputPdf || !outputDir) {
                return [2 /*return*/, {
                        success: false,
                        error: 'Missing required parameters: inputPdf, outputDir',
                    }];
            }
            args = [inputPdf, outputDir];
            if (dpi)
                args.push(String(dpi));
            return [2 /*return*/, runPythonScript('convert_pdf_to_images.py', args, context.logger)];
        });
    });
}
function handleExtractFormFields(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var inputPdf, outputJson;
        return __generator(this, function (_a) {
            inputPdf = params.inputPdf;
            outputJson = params.outputJson;
            if (!inputPdf || !outputJson) {
                return [2 /*return*/, {
                        success: false,
                        error: 'Missing required parameters: inputPdf, outputJson',
                    }];
            }
            return [2 /*return*/, runPythonScript('extract_form_field_info.py', [inputPdf, outputJson], context.logger)];
        });
    });
}
function handleFillForm(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var inputPdf, fieldsJson, outputPdf, fillable, scriptName;
        return __generator(this, function (_a) {
            inputPdf = params.inputPdf;
            fieldsJson = params.fieldsJson;
            outputPdf = params.outputPdf;
            fillable = params.fillable;
            if (!inputPdf || !fieldsJson || !outputPdf) {
                return [2 /*return*/, {
                        success: false,
                        error: 'Missing required parameters: inputPdf, fieldsJson, outputPdf',
                    }];
            }
            scriptName = fillable !== false ? 'fill_fillable_fields.py' : 'fill_pdf_form_with_annotations.py';
            return [2 /*return*/, runPythonScript(scriptName, [inputPdf, fieldsJson, outputPdf], context.logger)];
        });
    });
}
function handleCheckFields(params, context) {
    return __awaiter(this, void 0, void 0, function () {
        var inputPdf;
        return __generator(this, function (_a) {
            inputPdf = params.inputPdf;
            if (!inputPdf) {
                return [2 /*return*/, {
                        success: false,
                        error: 'Missing required parameter: inputPdf',
                    }];
            }
            return [2 /*return*/, runPythonScript('check_fillable_fields.py', [inputPdf], context.logger)];
        });
    });
}
// ─── Plugin Definition ──────────────────────────────────────────────────────
var pdfPlugin = {
    id: 'aionui-plugin-pdf',
    version: '1.0.0',
    // ── Lifecycle ─────────────────────────────────────────────────────────────
    activate: function (context) {
        var _a;
        pluginDir = context.pluginDir;
        execCommand = (_a = context.exec) !== null && _a !== void 0 ? _a : null;
        context.logger.info('PDF Tools plugin activated');
        context.logger.info("Plugin directory: ".concat(pluginDir));
        if (!execCommand) {
            context.logger.warn('Shell execution not available — PDF tools that run Python scripts will not work.');
        }
    },
    deactivate: function () {
        pluginDir = '';
        execCommand = null;
    },
    // ── Capability 1: System Prompt ───────────────────────────────────────────
    //
    // Injected into the first message as [Assistant Rules], just like
    // presetRules or AcpBackendConfig.context. Tells the agent it has
    // PDF processing tools and how to use them.
    systemPrompts: [
        {
            content: ['You have access to PDF processing tools provided by the PDF Tools plugin.', 'You can split, merge, convert to images, extract form fields, and fill PDF forms.', '', 'Available tools:', '- pdf_split: Split a PDF into pages or extract page ranges', '- pdf_merge: Merge multiple PDFs into one file', '- pdf_to_images: Convert PDF pages to PNG images', '- pdf_extract_form_fields: Extract form field metadata to JSON', '- pdf_fill_form: Fill form fields (fillable or annotation-based)', '- pdf_check_fields: Check if a PDF has fillable form fields', '', 'For detailed PDF processing guidance, activate the "pdf" skill.'].join('\n'),
            priority: 50,
        },
    ],
    // ── Capability 2: Skill ───────────────────────────────────────────────────
    //
    // The "pdf" skill — same SKILL.md content as the built-in /skills/pdf/.
    // The body is omitted so the host loads from skills/pdf/SKILL.md inside
    // the plugin directory. reference.md and forms.md are listed as resources.
    skills: [
        {
            name: 'pdf',
            description: 'Comprehensive PDF processing: extract text and tables, create PDFs, ' + 'merge/split documents, handle forms (fillable and non-fillable), ' + 'OCR scanned documents, and convert to images.',
            // body omitted — loaded from skills/pdf/SKILL.md at runtime
            resources: ['reference.md', 'forms.md'],
        },
    ],
    // ── Capability 3: Tools ───────────────────────────────────────────────────
    //
    // Six function-calling tools backed by bundled Python scripts.
    // These work with ALL providers — Claude, Gemini, Codex, any ACP agent.
    tools: [
        {
            name: 'pdf_split',
            description: 'Split a PDF into individual pages or extract specific page ranges.',
            inputSchema: {
                type: 'object',
                properties: {
                    inputPdf: {
                        type: 'string',
                        description: 'Path to the input PDF file',
                    },
                    outputPath: {
                        type: 'string',
                        description: 'Output directory (split all pages) or output file path (extract range)',
                    },
                    pages: {
                        type: 'string',
                        description: 'Page range to extract (e.g., "1-5" or "1,3,5"). Omit to split all pages.',
                    },
                },
                required: ['inputPdf', 'outputPath'],
            },
            handler: handlePdfSplit,
        },
        {
            name: 'pdf_merge',
            description: 'Merge multiple PDF files into a single output PDF.',
            inputSchema: {
                type: 'object',
                properties: {
                    outputPdf: {
                        type: 'string',
                        description: 'Path for the merged output PDF',
                    },
                    inputPdfs: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of input PDF file paths to merge (minimum 2)',
                    },
                },
                required: ['outputPdf', 'inputPdfs'],
            },
            handler: handlePdfMerge,
        },
        {
            name: 'pdf_to_images',
            description: 'Convert PDF pages to PNG images. Creates one PNG per page.',
            inputSchema: {
                type: 'object',
                properties: {
                    inputPdf: {
                        type: 'string',
                        description: 'Path to the input PDF file',
                    },
                    outputDir: {
                        type: 'string',
                        description: 'Directory to save PNG images',
                    },
                    dpi: {
                        type: 'number',
                        description: 'Resolution in DPI (default: 150)',
                    },
                },
                required: ['inputPdf', 'outputDir'],
            },
            handler: handlePdfToImages,
        },
        {
            name: 'pdf_extract_form_fields',
            description: 'Extract form field metadata (field IDs, types, positions) from a PDF to JSON.',
            inputSchema: {
                type: 'object',
                properties: {
                    inputPdf: {
                        type: 'string',
                        description: 'Path to the input PDF file',
                    },
                    outputJson: {
                        type: 'string',
                        description: 'Path for the output JSON file',
                    },
                },
                required: ['inputPdf', 'outputJson'],
            },
            handler: handleExtractFormFields,
        },
        {
            name: 'pdf_fill_form',
            description: 'Fill a PDF form with values from a JSON file. Supports both fillable ' + '(native form fields) and non-fillable (annotation-based) PDFs.',
            inputSchema: {
                type: 'object',
                properties: {
                    inputPdf: {
                        type: 'string',
                        description: 'Path to the input PDF file',
                    },
                    fieldsJson: {
                        type: 'string',
                        description: 'Path to the JSON file with field values',
                    },
                    outputPdf: {
                        type: 'string',
                        description: 'Path for the filled output PDF',
                    },
                    fillable: {
                        type: 'boolean',
                        description: 'true for native fillable form fields (default), false for annotation-based filling',
                    },
                },
                required: ['inputPdf', 'fieldsJson', 'outputPdf'],
            },
            handler: handleFillForm,
        },
        {
            name: 'pdf_check_fields',
            description: 'Check if a PDF has fillable form fields. Returns field names and types if found.',
            inputSchema: {
                type: 'object',
                properties: {
                    inputPdf: {
                        type: 'string',
                        description: 'Path to the input PDF file',
                    },
                },
                required: ['inputPdf'],
            },
            handler: handleCheckFields,
        },
    ],
    // No MCP servers — all tools are native function-calling handlers.
    // ── Capability 4: Agents ──────────────────────────────────────────────────
    //
    // The PDF plugin exposes one agent that bundles everything together.
    // When a user selects this agent, they get the PDF system prompt,
    // pdf skill enabled, and all PDF tools available.
    // Agents loaded from agents/ folder — class-based with lifecycle hooks
    agents: [new pdf_tools_1.default()],
    priority: 50,
};
exports.default = pdfPlugin;
