#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * IPC Bridge Loader
 *
 * Provides clean access to Electron IPC for utility process context.
 * Wraps ipcRenderer to match the structure of ipcBridge.ts.
 *
 * Usage:
 *   const { ipcBridge } = require('./ipc-bridge-loader');
 *   await ipcBridge.preview.open.emit({ content, contentType, metadata });
 */

const { ipcRenderer } = require('electron');

/**
 * IPC Bridge wrapper matching ipcBridge.ts structure
 */
const ipcBridge = {
  // Preview panel operations
  preview: {
    open: {
      /**
       * Open or update preview panel
       * @param {Object} data
       * @param {string} data.content - Content to display (JSON string or URL)
       * @param {string} data.contentType - Content type ('excalidraw', 'html', etc.)
       * @param {Object} [data.metadata] - Optional metadata
       * @param {string} [data.metadata.title] - Preview title
       * @param {string} [data.metadata.fileName] - File name
       * @param {string} [data.metadata.filePath] - Full file path
       * @param {string} [data.metadata.workspace] - Workspace directory
       * @param {boolean} [data.metadata.editable] - Enable edit mode
       */
      emit: (data) => {
        ipcRenderer.send('preview.open', data);
      },
    },
  },

  // Conversation operations
  conversation: {
    get: {
      /**
       * Get conversation by ID
       * @param {Object} params
       * @param {string} params.id - Conversation ID
       * @returns {Promise<Object>} Conversation object with workspace property
       */
      invoke: (params) => {
        return ipcRenderer.invoke('get-conversation', params);
      },
    },
  },

  // File system operations
  fs: {
    writeFile: {
      /**
       * Write file to disk
       * @param {Object} params
       * @param {string} params.path - File path
       * @param {string|Uint8Array} params.data - File content
       * @returns {Promise<boolean>} Success status
       */
      invoke: (params) => {
        return ipcRenderer.invoke('write-file', params);
      },
    },

    readFile: {
      /**
       * Read file from disk (UTF-8)
       * @param {Object} params
       * @param {string} params.path - File path
       * @returns {Promise<string>} File content
       */
      invoke: (params) => {
        return ipcRenderer.invoke('read-file', params);
      },
    },

    readFileBuffer: {
      /**
       * Read file as binary buffer
       * @param {Object} params
       * @param {string} params.path - File path
       * @returns {Promise<ArrayBuffer>} File content as ArrayBuffer
       */
      invoke: (params) => {
        return ipcRenderer.invoke('read-file-buffer', params);
      },
    },

    getFileMetadata: {
      /**
       * Get file metadata (size, modified time, etc.)
       * @param {Object} params
       * @param {string} params.path - File path
       * @returns {Promise<Object>} File metadata
       */
      invoke: (params) => {
        return ipcRenderer.invoke('get-file-metadata', params);
      },
    },
  },
};

module.exports = { ipcBridge };
