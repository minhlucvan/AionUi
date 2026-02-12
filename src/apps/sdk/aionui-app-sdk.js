/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * AionUi App SDK
 *
 * SDK for building mini-apps that integrate with the AionUi AI platform.
 * Each app runs in an iframe and communicates via WebSocket protocol.
 *
 * Features:
 * 1. WebSocket connection to AionUi backend
 * 2. Register tools for AI agent interaction (MCP-compatible)
 * 3. Emit/receive events for real-time coordination
 * 4. File operations (read/write/save)
 * 5. Context sharing (workspace, conversation)
 * 6. Theme synchronization with host
 *
 * Usage:
 *   <script src="/__sdk/aionui-app-sdk.js"></script>
 *   <script>
 *     const app = new AionUiApp({ appId: 'my-app' });
 *
 *     // Register a tool the AI agent can call
 *     app.registerTool('update_chart', {
 *       description: 'Update chart with new data',
 *       parameters: {
 *         type: 'object',
 *         properties: { chartId: { type: 'string' }, data: { type: 'array' } },
 *         required: ['chartId', 'data']
 *       }
 *     }, async (params) => {
 *       return updateChart(params.chartId, params.data);
 *     });
 *
 *     // Listen for events
 *     app.on('open', (resource) => { loadResource(resource); });
 *     app.on('context', (ctx) => { setWorkspace(ctx.workspace); });
 *     app.on('event', (e) => { handleEvent(e.event, e); });
 *
 *     app.connect();
 *   </script>
 */

(function (global) {
  'use strict';

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * AionUi App SDK
   * @param {Object} options
   * @param {string} options.appId - App identifier
   * @param {string} [options.sessionId] - Session ID (auto-detected from ?sid= query param)
   * @param {string} [options.wsUrl] - WebSocket URL (auto-detected)
   * @param {boolean} [options.autoConnect=true] - Auto-connect on construction
   * @param {number} [options.reconnectInterval=2000] - Reconnect interval in ms
   * @param {number} [options.maxReconnects=10] - Max reconnect attempts
   */
  function AionUiApp(options) {
    if (!options || !options.appId) {
      throw new Error('AionUiApp: appId is required');
    }

    this.appId = options.appId;
    this.sessionId = options.sessionId || this._detectSessionId();
    this.wsUrl = options.wsUrl || this._detectWsUrl();
    this.autoConnect = options.autoConnect !== false;
    this.reconnectInterval = options.reconnectInterval || 2000;
    this.maxReconnects = options.maxReconnects || 10;

    /** @type {WebSocket|null} */
    this._ws = null;
    this._reconnectCount = 0;
    this._reconnectTimer = null;
    this._connected = false;
    this._ready = false;

    /** @type {Object.<string, {name, description, parameters?, handler}>} */
    this._tools = {};

    /** @type {Object.<string, Function[]>} */
    this._listeners = {};

    /** @type {Object.<string, {resolve, reject, timer}>} */
    this._pendingRequests = {};

    this._setupHostListener();

    if (this.autoConnect) {
      this.connect();
    }
  }

  /**
   * Auto-detect WebSocket URL.
   * Static apps: ws://same-host/__ws
   * Process apps: ws://127.0.0.1:{wsPort}/__ws (from ?wsPort= query param)
   */
  AionUiApp.prototype._detectWsUrl = function () {
    var loc = window.location;
    var protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    var params = new URLSearchParams(loc.search);
    var wsPort = params.get('wsPort');

    if (wsPort) {
      return protocol + '//127.0.0.1:' + wsPort + '/__ws';
    }
    return protocol + '//' + loc.host + '/__ws';
  };

  /**
   * Auto-detect session ID from ?sid= query parameter
   */
  AionUiApp.prototype._detectSessionId = function () {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('sid') || '';
    } catch (e) {
      return '';
    }
  };

  /**
   * Connect to the AionUi backend
   */
  AionUiApp.prototype.connect = function () {
    var self = this;

    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this._ws = new WebSocket(this.wsUrl);
    } catch (err) {
      console.error('[AionUiApp] Failed to create WebSocket:', err);
      this._scheduleReconnect();
      return;
    }

    this._ws.onopen = function () {
      console.log('[AionUiApp] Connected');
      self._connected = true;
      self._reconnectCount = 0;
      self._sendReady();
      self._emit('connected');
    };

    this._ws.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data);
        self._handleMessage(msg);
      } catch (err) {
        console.error('[AionUiApp] Failed to parse message:', err);
      }
    };

    this._ws.onclose = function () {
      console.log('[AionUiApp] Disconnected');
      self._connected = false;
      self._ready = false;
      self._emit('disconnected');
      self._scheduleReconnect();
    };

    this._ws.onerror = function (err) {
      console.error('[AionUiApp] WebSocket error:', err);
      self._emit('error', err);
    };
  };

  AionUiApp.prototype.disconnect = function () {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectCount = this.maxReconnects;
    if (this._ws) {
      this._ws.close(1000, 'Client disconnect');
      this._ws = null;
    }
    this._connected = false;
    this._ready = false;
  };

  AionUiApp.prototype._scheduleReconnect = function () {
    var self = this;
    if (this._reconnectCount >= this.maxReconnects) {
      console.warn('[AionUiApp] Max reconnection attempts reached');
      this._emit('reconnect-failed');
      return;
    }

    this._reconnectCount++;
    var delay = this.reconnectInterval * Math.pow(1.5, this._reconnectCount - 1);
    this._reconnectTimer = setTimeout(function () {
      self.connect();
    }, delay);
  };

  /**
   * Send app:ready with registered tools
   */
  AionUiApp.prototype._sendReady = function () {
    var toolDeclarations = [];
    for (var name in this._tools) {
      var tool = this._tools[name];
      var decl = { name: tool.name, description: tool.description };
      if (tool.parameters) decl.parameters = tool.parameters;
      toolDeclarations.push(decl);
    }

    this._send({
      id: uuid(),
      ts: Date.now(),
      type: 'app:ready',
      payload: {
        appId: this.appId,
        sessionId: this.sessionId,
        tools: toolDeclarations,
        // backward compat
        capabilities: toolDeclarations,
      },
    });

    this._ready = true;
    this._postToHost({ type: 'app:ready', payload: { appId: this.appId } });
  };

  /**
   * Handle incoming messages from backend
   */
  AionUiApp.prototype._handleMessage = function (msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'backend:open':
        this._emit('open', msg.payload);
        break;

      case 'backend:content-update':
        this._emit('content-update', msg.payload);
        break;

      case 'backend:call-tool':
        this._handleToolCall(msg);
        break;

      // Legacy: backend:execute (same as call-tool)
      case 'backend:execute':
        this._handleToolCall(msg);
        break;

      case 'backend:event':
        this._emit('event', msg.payload);
        break;

      case 'backend:context':
        this._emit('context', msg.payload);
        break;

      case 'backend:theme':
        this._emit('theme', msg.payload);
        break;

      case 'backend:response':
        this._handleResponse(msg);
        break;

      default:
        this._emit('message', msg);
    }
  };

  /**
   * Handle a tool call from the backend (agent calling an app tool)
   */
  AionUiApp.prototype._handleToolCall = function (msg) {
    var self = this;
    // Support both new (tool) and legacy (capability) field names
    var toolName = msg.payload.tool || msg.payload.capability;
    var tool = this._tools[toolName];

    if (!tool) {
      self._send({
        id: uuid(),
        ts: Date.now(),
        type: 'app:tool-result',
        payload: {
          requestId: msg.id,
          success: false,
          error: 'Tool not found: ' + toolName,
        },
      });
      return;
    }

    try {
      var result = tool.handler(msg.payload.params, msg.payload);
      if (result && typeof result.then === 'function') {
        result.then(
          function (data) {
            self._send({
              id: uuid(),
              ts: Date.now(),
              type: 'app:tool-result',
              payload: { requestId: msg.id, success: true, data: data },
            });
          },
          function (err) {
            self._send({
              id: uuid(),
              ts: Date.now(),
              type: 'app:tool-result',
              payload: { requestId: msg.id, success: false, error: err.message || String(err) },
            });
          }
        );
      } else {
        self._send({
          id: uuid(),
          ts: Date.now(),
          type: 'app:tool-result',
          payload: { requestId: msg.id, success: true, data: result },
        });
      }
    } catch (err) {
      self._send({
        id: uuid(),
        ts: Date.now(),
        type: 'app:tool-result',
        payload: { requestId: msg.id, success: false, error: err.message || String(err) },
      });
    }
  };

  AionUiApp.prototype._handleResponse = function (msg) {
    var requestId = msg.payload.requestId;
    var pending = this._pendingRequests[requestId];
    if (!pending) return;

    clearTimeout(pending.timer);
    delete this._pendingRequests[requestId];

    if (msg.payload.success) {
      pending.resolve(msg.payload.data);
    } else {
      pending.reject(new Error(msg.payload.error || 'Request failed'));
    }
  };

  // ==================== Public API ====================

  /**
   * Register a tool that the AI agent can call.
   * @param {string} name - Tool name (e.g., 'update_chart')
   * @param {Object} meta - Tool metadata
   * @param {string} meta.description - What the tool does
   * @param {Object} [meta.parameters] - JSON Schema for parameters
   * @param {Function} handler - async (params) => result
   */
  AionUiApp.prototype.registerTool = function (name, meta, handler) {
    this._tools[name] = {
      name: name,
      description: meta.description || '',
      parameters: meta.parameters,
      handler: handler,
    };

    if (this._ready) {
      this._sendReady();
    }
  };

  /** @deprecated Use registerTool */
  AionUiApp.prototype.registerCapability = function (name, meta, handler) {
    this.registerTool(name, { description: meta.description, parameters: meta.paramsSchema }, handler);
  };

  /**
   * Subscribe to events
   * @param {string} event - Event name ('open', 'event', 'context', 'theme', etc.)
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  AionUiApp.prototype.on = function (event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);

    var self = this;
    return function () {
      self.off(event, callback);
    };
  };

  AionUiApp.prototype.off = function (event, callback) {
    var list = this._listeners[event];
    if (!list) return;
    var idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
  };

  /**
   * Emit an event to the backend (for agent / other apps to receive)
   * @param {string} event - Event name
   * @param {Object} [data] - Event data
   */
  AionUiApp.prototype.emitEvent = function (event, data) {
    this._send({
      id: uuid(),
      ts: Date.now(),
      type: 'app:event',
      payload: Object.assign({ event: event }, data || {}),
    });
  };

  /**
   * Notify content changed (dirty tracking)
   * @param {Object} payload - { content, isDirty, filePath? }
   */
  AionUiApp.prototype.notifyContentChanged = function (payload) {
    this._send({
      id: uuid(),
      ts: Date.now(),
      type: 'app:content-changed',
      payload: payload,
    });
    this._postToHost({ type: 'app:content-changed', payload: payload });
  };

  /**
   * Save a file
   * @param {string} filePath
   * @param {string} content
   * @returns {Promise}
   */
  AionUiApp.prototype.saveFile = function (filePath, content) {
    return this._request('app:save', { filePath: filePath, content: content });
  };

  /**
   * Read a file
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  AionUiApp.prototype.readFile = function (filePath) {
    return this._request('app:file-read', { filePath: filePath });
  };

  /**
   * Write a file
   * @param {string} filePath
   * @param {string} content
   * @returns {Promise}
   */
  AionUiApp.prototype.writeFile = function (filePath, content) {
    return this._request('app:file-write', { filePath: filePath, content: content });
  };

  AionUiApp.prototype.isConnected = function () {
    return this._connected;
  };

  // ==================== Internal ====================

  AionUiApp.prototype._send = function (msg) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
    }
  };

  AionUiApp.prototype._request = function (type, payload) {
    var self = this;
    var requestId = uuid();

    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        delete self._pendingRequests[requestId];
        reject(new Error('Request timed out'));
      }, 30000);

      self._pendingRequests[requestId] = { resolve: resolve, reject: reject, timer: timer };

      self._send({
        id: requestId,
        ts: Date.now(),
        type: type,
        payload: payload,
      });
    });
  };

  AionUiApp.prototype._emit = function (event, data) {
    var list = this._listeners[event];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      try {
        list[i](data);
      } catch (err) {
        console.error('[AionUiApp] Error in "' + event + '" handler:', err);
      }
    }
  };

  AionUiApp.prototype._postToHost = function (msg) {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(msg, '*');
      } catch (err) {
        // Ignore cross-origin errors
      }
    }
  };

  AionUiApp.prototype._setupHostListener = function () {
    var self = this;
    window.addEventListener('message', function (event) {
      if (!event.data || !event.data.type) return;

      switch (event.data.type) {
        case 'host:theme':
          self._emit('theme', event.data.payload);
          break;
        case 'host:focus':
          self._emit('focus');
          break;
      }
    });
  };

  // Export with backward compatibility
  global.AionUiApp = AionUiApp;
  global.PreviewApp = AionUiApp; // backward compat
})(typeof window !== 'undefined' ? window : this);
