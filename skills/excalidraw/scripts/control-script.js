/**
 * Excalidraw MCP Control Script
 * Injected into the browser to handle diagram operations via CustomEvents
 *
 * This script provides an API layer between the CLI and the Excalidraw web app.
 * It listens for 'chrome-mcp:execute' events and dispatches 'chrome-mcp:result' events.
 */
(function () {
  /**
   * Find the Excalidraw API instance in the React component tree
   * @returns {Object|null} The Excalidraw API object or null if not found
   */
  function findExcalidrawAPI() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;

    const key = Object.keys(canvas).find((key) => key.startsWith('__react') && canvas[key]?.return?.stateNode?.excalidrawAPI);

    return key ? canvas[key].return.stateNode.excalidrawAPI : null;
  }

  /**
   * Create a complete Excalidraw element with all required fields
   * @param {Object} skeleton - Minimal element definition
   * @returns {Object} Complete element with all required Excalidraw properties
   */
  function createFullExcalidrawElement(skeleton) {
    const baseElement = {
      id: skeleton.id || `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      seed: Math.floor(Math.random() * 2147483647),
      versionNonce: Math.floor(Math.random() * 2147483647),
      index: 'a0',
      version: 1,
      isDeleted: false,
      updated: Date.now(),
      link: null,
      locked: skeleton.locked || false,
      ...skeleton,
    };

    // Add type-specific defaults
    if (skeleton.type === 'text' && !skeleton.lineHeight) {
      baseElement.lineHeight = 1.25;
    }

    if ((skeleton.type === 'arrow' || skeleton.type === 'line') && !skeleton.points) {
      baseElement.points = [
        [0, 0],
        [skeleton.width || 100, 0],
      ];
    }

    return baseElement;
  }

  /**
   * Capture full canvas snapshot with metadata
   * @returns {Object} Snapshot containing image data and metadata
   */
  async function captureSnapshot() {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      throw new Error('Canvas not found');
    }

    const api = findExcalidrawAPI();
    const elements = api.getSceneElements();
    const appState = api.getAppState();

    return {
      image: canvas.toDataURL('image/png'),
      elements: JSON.parse(JSON.stringify(elements)),
      viewport: {
        zoom: appState.zoom || 1,
        scrollX: appState.scrollX || 0,
        scrollY: appState.scrollY || 0,
      },
      dimensions: {
        width: canvas.width,
        height: canvas.height,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Get lightweight scene metadata (fast, no image encoding)
   * @returns {Object} Scene metadata
   */
  function getSceneMetadata() {
    const api = findExcalidrawAPI();
    const elements = api.getSceneElements();

    // Count elements by type
    const elementsByType = {};
    elements.forEach((e) => {
      elementsByType[e.type] = (elementsByType[e.type] || 0) + 1;
    });

    // Calculate bounding box
    const boundingBox = calculateSceneBoundingBox(elements);

    // Analyze connections
    const arrows = elements.filter((e) => e.type === 'arrow');
    const connectedArrows = arrows.filter((a) => a.startBinding && a.endBinding);

    // Quick issue detection
    const hasIssues = detectQuickIssues(elements);

    return {
      elementCount: elements.length,
      elementsByType: elementsByType,
      boundingBox: boundingBox,
      connections: {
        total: arrows.length,
        connected: connectedArrows.length,
        disconnected: arrows.length - connectedArrows.length,
      },
      hasIssues: hasIssues,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate bounding box of all elements
   * @param {Array} elements - Array of Excalidraw elements
   * @returns {Object|null} Bounding box {x, y, width, height, centerX, centerY}
   */
  function calculateSceneBoundingBox(elements) {
    const shapes = elements.filter((e) => e.width && e.height);
    if (shapes.length === 0) return null;

    const minX = Math.min(...shapes.map((e) => e.x));
    const minY = Math.min(...shapes.map((e) => e.y));
    const maxX = Math.max(...shapes.map((e) => e.x + e.width));
    const maxY = Math.max(...shapes.map((e) => e.y + e.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  /**
   * Quick issue detection (fast checks)
   * @param {Array} elements - Array of Excalidraw elements
   * @returns {Object} Issues detected
   */
  function detectQuickIssues(elements) {
    const issues = {
      overlaps: false,
      smallText: false,
      disconnectedArrows: false,
      count: 0,
    };

    // Check for small text
    const texts = elements.filter((e) => e.type === 'text');
    issues.smallText = texts.some((t) => (t.fontSize || 20) < 12);
    if (issues.smallText) issues.count++;

    // Check for disconnected arrows
    const arrows = elements.filter((e) => e.type === 'arrow');
    issues.disconnectedArrows = arrows.some((a) => !a.startBinding || !a.endBinding);
    if (issues.disconnectedArrows) issues.count++;

    // Simple overlap check (sample a few elements)
    const shapes = elements.filter((e) => ['rectangle', 'ellipse', 'diamond'].includes(e.type));
    if (shapes.length > 1 && shapes.length < 50) {
      outerLoop: for (let i = 0; i < Math.min(shapes.length, 10); i++) {
        for (let j = i + 1; j < Math.min(shapes.length, 10); j++) {
          if (elementsOverlap(shapes[i], shapes[j])) {
            issues.overlaps = true;
            issues.count++;
            break outerLoop;
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check if two elements overlap
   * @param {Object} e1 - First element
   * @param {Object} e2 - Second element
   * @returns {boolean} True if elements overlap
   */
  function elementsOverlap(e1, e2) {
    return !(e1.x + e1.width < e2.x || e2.x + e2.width < e1.x || e1.y + e1.height < e2.y || e2.y + e2.height < e1.y);
  }

  /**
   * Export scene as .excalidraw file (JSON format)
   * @returns {Object} Excalidraw JSON data
   */
  function exportExcalidraw() {
    const api = findExcalidrawAPI();
    const elements = api.getSceneElements();
    const appState = api.getAppState();

    return {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements: JSON.parse(JSON.stringify(elements)),
      appState: {
        gridSize: appState.gridSize || null,
        viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
      },
      files: {},
    };
  }

  /**
   * Export scene as PNG image data
   * @returns {Object} PNG data with metadata
   */
  async function exportPNG() {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      throw new Error('Canvas not found');
    }

    const api = findExcalidrawAPI();
    const elements = api.getSceneElements();

    // Calculate bounding box to determine export area
    const boundingBox = calculateSceneBoundingBox(elements);

    return {
      imageData: canvas.toDataURL('image/png'),
      mimeType: 'image/png',
      width: canvas.width,
      height: canvas.height,
      boundingBox: boundingBox,
      elementCount: elements.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Main event handler for diagram operations
   * Listens for 'chrome-mcp:execute' events and performs the requested action
   */
  window.addEventListener('chrome-mcp:execute', async (event) => {
    const { action, requestId, element, elementId } = event.detail;
    const api = findExcalidrawAPI();

    if (!api) {
      window.dispatchEvent(
        new CustomEvent('chrome-mcp:result', {
          detail: { requestId, error: 'Excalidraw API not found' },
        })
      );
      return;
    }

    try {
      let result = null;

      switch (action) {
        case 'getSceneElements':
          // Return all elements in the scene
          result = api.getSceneElements();
          break;

        case 'addElement':
          // Add one or more elements to the scene
          const elementsToAdd = Array.isArray(element) ? element : [element];
          const fullElements = elementsToAdd.map(createFullExcalidrawElement);
          api.updateScene({ elements: [...api.getSceneElements(), ...fullElements] });
          result = { success: true, addedCount: fullElements.length };
          break;

        case 'updateElement':
          // Update one or more existing elements
          const elementsToUpdate = Array.isArray(element) ? element : [element];
          const currentElements = api.getSceneElements();
          const updatedElements = currentElements.map((el) => {
            const update = elementsToUpdate.find((u) => u.id === el.id);
            return update ? { ...el, ...update, updated: Date.now() } : el;
          });
          api.updateScene({ elements: updatedElements });
          result = { success: true, updatedCount: elementsToUpdate.length };
          break;

        case 'deleteElement':
          // Remove one or more elements from the scene
          const idsToDelete = Array.isArray(elementId) ? elementId : [elementId];
          const remainingElements = api.getSceneElements().filter((el) => !idsToDelete.includes(el.id));
          api.updateScene({ elements: remainingElements });
          result = { success: true, deletedCount: idsToDelete.length };
          break;

        case 'cleanup':
          // Clear all elements from the canvas
          api.updateScene({ elements: [] });
          result = { success: true, message: 'Canvas cleared' };
          break;

        case 'captureSnapshot':
          // Capture full canvas snapshot with image and metadata
          result = await captureSnapshot();
          break;

        case 'getMetadata':
          // Get lightweight scene metadata (fast, no image encoding)
          result = getSceneMetadata();
          break;

        case 'exportExcalidraw':
          // Export scene as .excalidraw file (JSON format)
          result = exportExcalidraw();
          break;

        case 'exportPNG':
          // Export scene as PNG image
          result = await exportPNG();
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Dispatch success result
      window.dispatchEvent(
        new CustomEvent('chrome-mcp:result', {
          detail: { requestId, result },
        })
      );
    } catch (error) {
      // Dispatch error result
      window.dispatchEvent(
        new CustomEvent('chrome-mcp:result', {
          detail: { requestId, error: error.message },
        })
      );
    }
  });

  console.log('Excalidraw MCP control script loaded');
})();
