/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * AionUi Preview App Client SDK
 *
 * Lightweight library for preview apps to:
 * 1. Connect to the backend via WebSocket protocol
 * 2. Register capabilities for agent interaction
 * 3. Handle file operations (read/write/save)
 * 4. Receive commands from the backend (open, execute, theme, etc.)
 * 5. Communicate with the host iframe via postMessage
 *
 * Usage:
 *   <script src="/__sdk/preview-app-sdk.js"></script>
 *   <script>
 *     const app = new PreviewApp({ appId: 'my-editor' });
 *     app.registerCapability('gotoLine', { description: 'Go to line number' }, async (params) => {
 *       editor.revealLine(params.line);
 *       return { success: true };
 *     });
 *     app.on('open', (payload) => { editor.setValue(payload.content); });
 *     app.connect();
 *   </script>
 */

(function (global) {
  'use strict';

  /**
   * Generate a UUID v4
   */
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
   * @typedef {Object} PreviewAppOptions
   * @property {string} appId - The app's manifest ID
   * @property {string} [wsUrl] - WebSocket URL (auto-detected from page URL if not provided)
   * @property {boolean} [autoConnect=true] - Automatically connect on construction
   * @property {number} [reconnectInterval=2000] - Reconnection interval in ms
   * @property {number} [maxReconnects=10] - Max reconnection attempts
   */

  /**
   * @typedef {Object} Capability
   * @property {string} name
   * @property {string} description
   * @property {Object} [paramsSchema]
   * @property {Function} handler
   */

  /**
   * PreviewApp client SDK
   * @param {PreviewAppOptions} options
   */
  function PreviewApp(options) {
    if (!options || !options.appId) {
      throw new Error('PreviewApp: appId is required');
    }

    this.appId = options.appId;
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

    /** @type {Object.<string, Capability>} */
    this._capabilities = {};

    /** @type {Object.<string, Function[]>} */
    this._listeners = {};

    /** @type {Object.<string, {resolve: Function, reject: Function, timer: number}>} */
    this._pendingRequests = {};

    // Listen for host messages (postMessage from parent iframe)
    this._setupHostListener();

    if (this.autoConnect) {
      this.connect();
    }
  }

  /**
   * Auto-detect the WebSocket URL from the current page URL
   */
  PreviewApp.prototype._detectWsUrl = function () {
    var loc = window.location;
    var protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return protocol + '//' + loc.host;
  };

  /**
   * Connect to the backend WebSocket server
   */
  PreviewApp.prototype.connect = function () {
    var self = this;

    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this._ws = new WebSocket(this.wsUrl);
    } catch (err) {
      console.error('[PreviewApp] Failed to create WebSocket:', err);
      this._scheduleReconnect();
      return;
    }

    this._ws.onopen = function () {
      console.log('[PreviewApp] Connected to backend');
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
        console.error('[PreviewApp] Failed to parse message:', err);
      }
    };

    this._ws.onclose = function () {
      console.log('[PreviewApp] Disconnected');
      self._connected = false;
      self._ready = false;
      self._emit('disconnected');
      self._scheduleReconnect();
    };

    this._ws.onerror = function (err) {
      console.error('[PreviewApp] WebSocket error:', err);
      self._emit('error', err);
    };
  };

  /**
   * Disconnect from the backend
   */
  PreviewApp.prototype.disconnect = function () {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnectCount = this.maxReconnects; // Prevent reconnection
    if (this._ws) {
      this._ws.close(1000, 'Client disconnect');
      this._ws = null;
    }
    this._connected = false;
    this._ready = false;
  };

  /**
   * Schedule a reconnection attempt
   */
  PreviewApp.prototype._scheduleReconnect = function () {
    var self = this;
    if (this._reconnectCount >= this.maxReconnects) {
      console.warn('[PreviewApp] Max reconnection attempts reached');
      this._emit('reconnect-failed');
      return;
    }

    this._reconnectCount++;
    var delay = this.reconnectInterval * Math.pow(1.5, this._reconnectCount - 1);
    console.log('[PreviewApp] Reconnecting in ' + Math.round(delay) + 'ms (attempt ' + this._reconnectCount + ')');

    this._reconnectTimer = setTimeout(function () {
      self.connect();
    }, delay);
  };

  /**
   * Send the app:ready message with registered capabilities
   */
  PreviewApp.prototype._sendReady = function () {
    var capDeclarations = [];
    for (var name in this._capabilities) {
      var cap = this._capabilities[name];
      capDeclarations.push({
        name: cap.name,
        description: cap.description,
        paramsSchema: cap.paramsSchema,
      });
    }

    this._send({
      id: uuid(),
      ts: Date.now(),
      type: 'app:ready',
      payload: {
        appId: this.appId,
        capabilities: capDeclarations,
      },
    });

    this._ready = true;

    // Also notify host iframe
    this._postToHost({ type: 'app:ready', payload: { appId: this.appId } });
  };

  /**
   * Handle an incoming message from the backend
   */
  PreviewApp.prototype._handleMessage = function (msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'backend:open':
        this._emit('open', msg.payload);
        break;

      case 'backend:content-update':
        this._emit('content-update', msg.payload);
        break;

      case 'backend:execute':
        this._handleExecute(msg);
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
   * Handle a capability execution request from the backend
   */
  PreviewApp.prototype._handleExecute = function (msg) {
    var self = this;
    var capName = msg.payload.capability;
    var cap = this._capabilities[capName];

    if (!cap) {
      self._send({
        id: uuid(),
        ts: Date.now(),
        type: 'app:execute-result',
        payload: {
          requestId: msg.id,
          success: false,
          error: 'Capability not found: ' + capName,
        },
      });
      return;
    }

    // Execute the capability handler
    try {
      var result = cap.handler(msg.payload.params, msg.payload);
      // Handle both sync and async handlers
      if (result && typeof result.then === 'function') {
        result.then(
          function (data) {
            self._send({
              id: uuid(),
              ts: Date.now(),
              type: 'app:execute-result',
              payload: { requestId: msg.id, success: true, data: data },
            });
          },
          function (err) {
            self._send({
              id: uuid(),
              ts: Date.now(),
              type: 'app:execute-result',
              payload: { requestId: msg.id, success: false, error: err.message || String(err) },
            });
          }
        );
      } else {
        self._send({
          id: uuid(),
          ts: Date.now(),
          type: 'app:execute-result',
          payload: { requestId: msg.id, success: true, data: result },
        });
      }
    } catch (err) {
      self._send({
        id: uuid(),
        ts: Date.now(),
        type: 'app:execute-result',
        payload: { requestId: msg.id, success: false, error: err.message || String(err) },
      });
    }
  };

  /**
   * Handle a response to a pending request
   */
  PreviewApp.prototype._handleResponse = function (msg) {
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
   * Register a capability that agents can call
   * @param {string} name - Capability name
   * @param {Object} meta - { description, paramsSchema? }
   * @param {Function} handler - async (params, context) => result
   */
  PreviewApp.prototype.registerCapability = function (name, meta, handler) {
    this._capabilities[name] = {
      name: name,
      description: meta.description || '',
      paramsSchema: meta.paramsSchema,
      handler: handler,
    };

    // If already connected, re-send ready to update capabilities
    if (this._ready) {
      this._sendReady();
    }
  };

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  PreviewApp.prototype.on = function (event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);

    var self = this;
    return function () {
      self.off(event, callback);
    };
  };

  /**
   * Unsubscribe from events
   */
  PreviewApp.prototype.off = function (event, callback) {
    var list = this._listeners[event];
    if (!list) return;
    var idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
  };

  /**
   * Notify the backend that content has changed (for dirty tracking)
   * @param {Object} payload - { filePath?, content, isDirty }
   */
  PreviewApp.prototype.notifyContentChanged = function (payload) {
    this._send({
      id: uuid(),
      ts: Date.now(),
      type: 'app:content-changed',
      payload: payload,
    });

    // Also notify host iframe for UI updates
    this._postToHost({ type: 'app:content-changed', payload: payload });
  };

  /**
   * Request to save content
   * @param {string} filePath
   * @param {string} content
   * @returns {Promise}
   */
  PreviewApp.prototype.saveFile = function (filePath, content) {
    return this._request('app:save', { filePath: filePath, content: content });
  };

  /**
   * Read a file from the backend
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  PreviewApp.prototype.readFile = function (filePath) {
    return this._request('app:file-read', { filePath: filePath });
  };

  /**
   * Write a file via the backend
   * @param {string} filePath
   * @param {string} content
   * @returns {Promise}
   */
  PreviewApp.prototype.writeFile = function (filePath, content) {
    return this._request('app:file-write', { filePath: filePath, content: content });
  };

  /**
   * Send a generic request to the backend
   * @param {string} action
   * @param {*} data
   * @returns {Promise}
   */
  PreviewApp.prototype.request = function (action, data) {
    return this._request('app:request', { action: action, data: data });
  };

  /**
   * Check if connected to the backend
   * @returns {boolean}
   */
  PreviewApp.prototype.isConnected = function () {
    return this._connected;
  };

  // ==================== Internal Helpers ====================

  PreviewApp.prototype._send = function (msg) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
    }
  };

  PreviewApp.prototype._request = function (type, payload) {
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

  PreviewApp.prototype._emit = function (event, data) {
    var list = this._listeners[event];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      try {
        list[i](data);
      } catch (err) {
        console.error('[PreviewApp] Error in event handler for "' + event + '":', err);
      }
    }
  };

  PreviewApp.prototype._postToHost = function (msg) {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(msg, '*');
      } catch (err) {
        // Ignore cross-origin errors
      }
    }
  };

  PreviewApp.prototype._setupHostListener = function () {
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

  // Export
  global.PreviewApp = PreviewApp;
})(typeof window !== 'undefined' ? window : this);
