/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PreviewContentType } from '@/common/types/preview';

/**
 * Result of detecting a local server URL in text output
 */
export interface LocalServerDetection {
  /** The detected URL (e.g., http://127.0.0.1:8050/) */
  url: string;
  /** Detected framework name (e.g., "Dash", "Flask") */
  framework: string;
  /** Preview title for the tab */
  title: string;
}

/**
 * Known local server framework patterns
 *
 * Each pattern matches a specific framework's startup message and extracts the URL.
 * Patterns are tested in order; first match wins.
 */
const FRAMEWORK_PATTERNS: Array<{
  name: string;
  /** Regex to match the framework's startup message. Must have a capture group for the URL. */
  pattern: RegExp;
}> = [
  // Dash: "Dash is running on http://127.0.0.1:8050/"
  { name: 'Dash', pattern: /Dash is running on\s+(https?:\/\/[\w.-]+(?::\d+)?[^\s"'<>]*)/i },
  // Flask: " * Running on http://127.0.0.1:5000"
  { name: 'Flask', pattern: /\*\s*Running on\s+(https?:\/\/[\w.-]+(?::\d+)?[^\s"'<>]*)/i },
  // Streamlit: "You can now view your Streamlit app ... Local URL: http://localhost:8501"
  { name: 'Streamlit', pattern: /Local URL:\s*(https?:\/\/[\w.-]+(?::\d+)?[^\s"'<>]*)/i },
  // Django: "Starting development server at http://127.0.0.1:8000/"
  { name: 'Django', pattern: /Starting development server at\s+(https?:\/\/[\w.-]+(?::\d+)?[^\s"'<>]*)/i },
  // FastAPI/Uvicorn: "Uvicorn running on http://127.0.0.1:8000"
  { name: 'Uvicorn', pattern: /Uvicorn running on\s+(https?:\/\/[\w.-]+(?::\d+)?[^\s"'<>]*)/i },
  // Gradio: "Running on local URL:  http://127.0.0.1:7860"
  { name: 'Gradio', pattern: /Running on local URL:\s*(https?:\/\/[\w.-]+(?::\d+)?[^\s"'<>]*)/i },
  // Node.js / Express / Next.js / Vite: common patterns
  { name: 'Vite', pattern: /Local:\s+(https?:\/\/[\w.-]+(?::\d+)?[^\s"'<>]*)/i },
  // Generic: "Server running at http://localhost:3000"
  { name: 'Server', pattern: /[Ss]erver (?:is )?(?:running|listening|started)(?: at| on)\s+(https?:\/\/[\w.-]+(?::\d+)?[^\s"'<>]*)/i },
];

/**
 * Regex to match any localhost URL in text (fallback when no framework pattern matches)
 * Matches: http://localhost:PORT, http://127.0.0.1:PORT, http://0.0.0.0:PORT
 */
const LOCALHOST_URL_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)(?:\/[^\s"'<>)}\]]*)?/gi;

/**
 * Local Server Detector
 *
 * Detects when agent output indicates a local web server has started,
 * and extracts the URL for preview. Supports frameworks like Dash, Flask,
 * Streamlit, Django, FastAPI, Gradio, Vite, and generic server patterns.
 */
export class LocalServerDetector {
  /** Set of URLs already emitted (prevents duplicate preview opens) */
  private emittedUrls = new Set<string>();

  /**
   * Detect local server URLs in text output
   *
   * Scans the provided text for patterns indicating a local web server started.
   * Returns detection results for new URLs only (duplicates are suppressed).
   *
   * @param text - Agent output text (stdout/stderr content)
   * @returns Array of detected local server URLs (empty if none found)
   */
  detect(text: string): LocalServerDetection[] {
    if (!text) return [];

    const results: LocalServerDetection[] = [];

    // Try framework-specific patterns first
    for (const { name, pattern } of FRAMEWORK_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const url = this.normalizeUrl(match[1]);
        if (this.isLocalUrl(url) && !this.emittedUrls.has(url)) {
          this.emittedUrls.add(url);
          results.push({
            url,
            framework: name,
            title: `${name}: ${url}`,
          });
        }
      }
    }

    // If no framework-specific match, try generic localhost URL pattern
    if (results.length === 0) {
      const matches = text.matchAll(LOCALHOST_URL_PATTERN);
      for (const match of matches) {
        const url = this.normalizeUrl(match[0]);
        if (!this.emittedUrls.has(url)) {
          this.emittedUrls.add(url);
          results.push({
            url,
            framework: 'Server',
            title: `Preview: ${url}`,
          });
        }
      }
    }

    return results;
  }

  /**
   * Check if a URL points to localhost
   */
  private isLocalUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    } catch {
      return false;
    }
  }

  /**
   * Normalize a URL by trimming trailing punctuation that may have been captured
   */
  private normalizeUrl(url: string): string {
    // Remove trailing punctuation commonly caught by regex (period, comma, etc.)
    return url.replace(/[.,;!?)}\]]+$/, '');
  }

  /**
   * Reset tracked URLs (e.g., when starting a new conversation)
   */
  reset(): void {
    this.emittedUrls.clear();
  }

  /**
   * Create a preview_open message for a detected local server
   */
  static createPreviewMessage(detection: LocalServerDetection, conversationId: string): {
    type: 'preview_open';
    conversation_id: string;
    msg_id: string;
    data: {
      content: string;
      contentType: PreviewContentType;
      metadata: { title: string };
    };
  } {
    return {
      type: 'preview_open',
      conversation_id: conversationId,
      msg_id: `local-server-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      data: {
        content: detection.url,
        contentType: 'url' as PreviewContentType,
        metadata: {
          title: detection.title,
        },
      },
    };
  }
}
