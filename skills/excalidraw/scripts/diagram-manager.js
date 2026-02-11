#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 *
 * Diagram Manager
 *
 * Core diagram state management for Excalidraw skill.
 * Handles in-memory diagram state and direct JSON file I/O.
 */

const path = require('path');
const fs = require('fs').promises;

// Color palettes (semantic)
const PALETTES = {
  frontend: { bg: '#a5d8ff', stroke: '#1971c2' },
  backend: { bg: '#b2f2bb', stroke: '#2f9e44' },
  database: { bg: '#ffc9c9', stroke: '#c92a2a' },
  external: { bg: '#ffe066', stroke: '#f08c00' },
  cache: { bg: '#d0bfff', stroke: '#6741d9' },
  queue: { bg: '#ffd8a8', stroke: '#e67700' },
  actor: { bg: '#e9ecef', stroke: '#495057' },
  neutral: { bg: '#ffffff', stroke: '#000000' },
};

class DiagramManager {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.currentDiagram = null;
  }

  /**
   * Create empty diagram structure
   */
  createEmptyDiagram() {
    return {
      type: 'excalidraw',
      version: 2,
      source: 'aionui',
      elements: [],
      appState: {
        viewBackgroundColor: '#ffffff',
      },
      files: {},
    };
  }

  /**
   * Initialize: load existing file or create new diagram
   * @returns {Promise<string>} File path
   */
  async init() {
    let fileExists = false;
    try {
      await fs.access(this.filePath);
      fileExists = true;
    } catch {
      // file does not exist
    }

    if (fileExists) {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.currentDiagram = JSON.parse(content);
    } else {
      this.currentDiagram = this.createEmptyDiagram();
      await this.saveToDisk();
    }

    return this.filePath;
  }

  /**
   * Save current diagram JSON to disk
   */
  async saveToDisk() {
    await fs.writeFile(this.filePath, JSON.stringify(this.currentDiagram, null, 2), 'utf-8');
  }

  /**
   * Clear all elements
   */
  async clear() {
    this.currentDiagram.elements = [];
    await this.saveToDisk();
  }

  /**
   * Get current diagram content
   */
  getContent() {
    return JSON.stringify(this.currentDiagram, null, 2);
  }

  /**
   * Add shape element
   */
  async addShape(options) {
    const { id = `shape-${this.currentDiagram.elements.length}`, type = 'rectangle', x = 0, y = 0, width = 200, height = 100, palette = 'neutral', stroke = null, fill = null } = options;

    // Get colors from palette
    const colors = PALETTES[palette] || PALETTES.neutral;
    const backgroundColor = fill || colors.bg;
    const strokeColor = stroke || colors.stroke;

    const element = {
      id,
      type,
      x,
      y,
      width,
      height,
      angle: 0,
      strokeColor,
      backgroundColor,
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: type === 'rectangle' ? { type: 3, value: 8 } : type === 'diamond' ? null : { type: 2 },
      seed: Math.floor(Math.random() * 1000000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
    };

    this.currentDiagram.elements.push(element);
    await this.saveToDisk();

    return element.id;
  }

  /**
   * Add text element
   */
  async addText(options) {
    const { id = null, text = '', x = 0, y = 0, size = 16, containerId = null } = options;

    // Auto-generate ID if container specified
    const textId = id || (containerId ? `${containerId}-text` : `text-${this.currentDiagram.elements.length}`);

    const element = {
      id: textId,
      type: 'text',
      x,
      y,
      width: text.length * size * 0.6,
      height: size * 1.25,
      angle: 0,
      strokeColor: '#000000',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 1000000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      text,
      fontSize: size,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      baseline: size,
      containerId,
      originalText: text,
      lineHeight: 1.25,
    };

    this.currentDiagram.elements.push(element);
    await this.saveToDisk();

    return element.id;
  }

  /**
   * Add arrow element
   */
  async addArrow(options) {
    const {
      id = `arrow-${this.currentDiagram.elements.length}`,
      x = 0,
      y = 0,
      points = [
        [0, 0],
        [120, 0],
      ],
      stroke = '#000000',
      startBinding = null,
      endBinding = null,
    } = options;

    const width = Math.abs(points[points.length - 1][0] - points[0][0]);
    const height = Math.abs(points[points.length - 1][1] - points[0][1]);

    const element = {
      id,
      type: 'arrow',
      x,
      y,
      width,
      height,
      angle: 0,
      strokeColor: stroke,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 2 },
      seed: Math.floor(Math.random() * 1000000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      points,
      lastCommittedPoint: null,
      startBinding: startBinding ? { elementId: startBinding, focus: 0, gap: 1 } : null,
      endBinding: endBinding ? { elementId: endBinding, focus: 0, gap: 1 } : null,
      startArrowhead: null,
      endArrowhead: 'arrow',
    };

    this.currentDiagram.elements.push(element);
    await this.saveToDisk();

    return element.id;
  }

  /**
   * Add frame element
   */
  async addFrame(options) {
    const { id = `frame-${this.currentDiagram.elements.length}`, name = 'Frame', x = 0, y = 0, width = 400, height = 300 } = options;

    const element = {
      id,
      type: 'frame',
      x,
      y,
      width,
      height,
      angle: 0,
      strokeColor: '#bbb',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 1000000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      name,
    };

    this.currentDiagram.elements.push(element);
    await this.saveToDisk();

    return element.id;
  }

  /**
   * Link text to shape (bidirectional relationship)
   */
  async linkText(shapeId, textId) {
    const shape = this.currentDiagram.elements.find((e) => e.id === shapeId);
    const text = this.currentDiagram.elements.find((e) => e.id === textId);

    if (!shape) {
      throw new Error(`Shape '${shapeId}' not found`);
    }
    if (!text) {
      throw new Error(`Text '${textId}' not found`);
    }

    // Update shape to reference text
    if (!shape.boundElements) {
      shape.boundElements = [];
    }
    shape.boundElements.push({ type: 'text', id: textId });

    // Update text to reference shape
    text.containerId = shapeId;

    await this.saveToDisk();
  }

  /**
   * Bind arrow to shapes (bidirectional relationships)
   */
  async bindArrow(arrowId, fromId, toId) {
    const arrow = this.currentDiagram.elements.find((e) => e.id === arrowId);
    const fromElem = this.currentDiagram.elements.find((e) => e.id === fromId);
    const toElem = this.currentDiagram.elements.find((e) => e.id === toId);

    if (!arrow) {
      throw new Error(`Arrow '${arrowId}' not found`);
    }
    if (!fromElem) {
      throw new Error(`Element '${fromId}' not found`);
    }
    if (!toElem) {
      throw new Error(`Element '${toId}' not found`);
    }

    // Update arrow with bindings
    arrow.startBinding = { elementId: fromId, focus: 0, gap: 1 };
    arrow.endBinding = { elementId: toId, focus: 0, gap: 1 };

    // Update source element
    if (!fromElem.boundElements) {
      fromElem.boundElements = [];
    }
    fromElem.boundElements.push({ type: 'arrow', id: arrowId });

    // Update target element
    if (!toElem.boundElements) {
      toElem.boundElements = [];
    }
    toElem.boundElements.push({ type: 'arrow', id: arrowId });

    await this.saveToDisk();
  }

  /**
   * Delete element by ID
   */
  async deleteElement(elementId) {
    const originalCount = this.currentDiagram.elements.length;
    this.currentDiagram.elements = this.currentDiagram.elements.filter((e) => e.id !== elementId);

    if (this.currentDiagram.elements.length === originalCount) {
      throw new Error(`Element '${elementId}' not found`);
    }

    await this.saveToDisk();
  }

  /**
   * Save diagram to a different path (copy/export)
   */
  async save(outputPath) {
    const savePath = outputPath || this.filePath;
    await fs.writeFile(savePath, JSON.stringify(this.currentDiagram, null, 2), 'utf-8');
    return savePath;
  }

  /**
   * Get scene metadata (element counts, types, etc.)
   */
  getMetadata() {
    const elements = this.currentDiagram.elements;
    const elementsByType = {};

    for (const elem of elements) {
      const type = elem.type || 'unknown';
      elementsByType[type] = (elementsByType[type] || 0) + 1;
    }

    return {
      elementCount: elements.length,
      elementsByType,
      filePath: this.filePath,
    };
  }
}

module.exports = { DiagramManager };
