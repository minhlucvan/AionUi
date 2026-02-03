/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ConversionResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface ExcelSheetImage {
    row: number;
    col: number;
    src: string;
    width?: number;
    height?: number;
    alt?: string;
}
export interface ExcelSheetData {
    name: string;
    data: any[][];
    merges?: {
        s: {
            r: number;
            c: number;
        };
        e: {
            r: number;
            c: number;
        };
    }[];
    images?: ExcelSheetImage[];
}
export interface ExcelWorkbookData {
    sheets: ExcelSheetData[];
}
export interface PPTSlideData {
    slideNumber: number;
    content: any;
}
export interface PPTJsonData {
    slides: PPTSlideData[];
    raw?: any;
}
export interface ConversionServiceApi {
    wordToMarkdown: (filePath: string) => Promise<ConversionResult<string>>;
    markdownToWord: (markdown: string, targetPath: string) => Promise<ConversionResult<void>>;
    excelToJson: (filePath: string) => Promise<ConversionResult<ExcelWorkbookData>>;
    jsonToExcel: (data: ExcelWorkbookData, targetPath: string) => Promise<ConversionResult<void>>;
    pptToJson: (filePath: string) => Promise<ConversionResult<PPTJsonData>>;
    markdownToPdf: (markdown: string, targetPath: string) => Promise<ConversionResult<void>>;
    htmlToPdf: (html: string, targetPath: string) => Promise<ConversionResult<void>>;
}
export type DocumentConversionTarget = 'markdown' | 'excel-json' | 'ppt-json';
export interface DocumentConversionRequest {
    filePath: string;
    to: DocumentConversionTarget;
}
export type DocumentConversionResponse = {
    to: 'markdown';
    result: ConversionResult<string>;
} | {
    to: 'excel-json';
    result: ConversionResult<ExcelWorkbookData>;
} | {
    to: 'ppt-json';
    result: ConversionResult<PPTJsonData>;
};
//# sourceMappingURL=conversion.d.ts.map