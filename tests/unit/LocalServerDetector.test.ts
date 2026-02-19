/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, beforeEach } from '@jest/globals';
import { LocalServerDetector } from '@/common/navigation/LocalServerDetector';

describe('LocalServerDetector', () => {
  let detector: LocalServerDetector;

  beforeEach(() => {
    detector = new LocalServerDetector();
  });

  describe('Dash framework detection', () => {
    it('should detect Dash app running on 127.0.0.1', () => {
      const text = 'Dash is running on http://127.0.0.1:8050/\n\n * Serving Flask app "app"';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://127.0.0.1:8050/');
      expect(results[0].framework).toBe('Dash');
    });

    it('should detect Dash app running on localhost', () => {
      const text = 'Dash is running on http://localhost:8050/';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://localhost:8050/');
      expect(results[0].framework).toBe('Dash');
    });

    it('should detect Dash app on non-default port', () => {
      const text = 'Dash is running on http://127.0.0.1:9999/';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://127.0.0.1:9999/');
    });
  });

  describe('Flask framework detection', () => {
    it('should detect Flask running on default port', () => {
      const text = ' * Running on http://127.0.0.1:5000';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://127.0.0.1:5000');
      expect(results[0].framework).toBe('Flask');
    });

    it('should detect Flask with URL in parentheses', () => {
      const text = ' * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].framework).toBe('Flask');
    });
  });

  describe('Streamlit detection', () => {
    it('should detect Streamlit local URL', () => {
      const text = 'You can now view your Streamlit app in your browser.\n\n  Local URL: http://localhost:8501';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://localhost:8501');
      expect(results[0].framework).toBe('Streamlit');
    });
  });

  describe('Django detection', () => {
    it('should detect Django development server', () => {
      const text = 'Starting development server at http://127.0.0.1:8000/';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://127.0.0.1:8000/');
      expect(results[0].framework).toBe('Django');
    });
  });

  describe('Uvicorn/FastAPI detection', () => {
    it('should detect Uvicorn server', () => {
      const text = 'INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://127.0.0.1:8000');
      expect(results[0].framework).toBe('Uvicorn');
    });
  });

  describe('Gradio detection', () => {
    it('should detect Gradio local URL', () => {
      const text = 'Running on local URL:  http://127.0.0.1:7860';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://127.0.0.1:7860');
      expect(results[0].framework).toBe('Gradio');
    });
  });

  describe('Vite detection', () => {
    it('should detect Vite dev server', () => {
      const text = '  VITE v5.0.0  ready in 500 ms\n\n  ➜  Local:   http://localhost:5173/';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://localhost:5173/');
      expect(results[0].framework).toBe('Vite');
    });
  });

  describe('Generic server detection', () => {
    it('should detect "Server running at" pattern', () => {
      const text = 'Server running at http://localhost:3000';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://localhost:3000');
      expect(results[0].framework).toBe('Server');
    });

    it('should detect "Server is running on" pattern', () => {
      const text = 'Server is running on http://localhost:4000/';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://localhost:4000/');
    });

    it('should detect "Server listening on" pattern', () => {
      const text = 'Server listening on http://0.0.0.0:8080';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://0.0.0.0:8080');
    });

    it('should detect "server started on" pattern', () => {
      const text = 'server started on http://localhost:3000';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://localhost:3000');
    });
  });

  describe('Fallback localhost URL detection', () => {
    it('should detect bare localhost URLs without framework pattern', () => {
      const text = 'Open your browser and go to http://localhost:8050/ to see the app.';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://localhost:8050/');
      expect(results[0].framework).toBe('Server');
    });

    it('should detect 127.0.0.1 URLs', () => {
      const text = 'Visit http://127.0.0.1:3000/dashboard for the UI.';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://127.0.0.1:3000/dashboard');
    });

    it('should detect 0.0.0.0 URLs', () => {
      const text = 'App available at http://0.0.0.0:5000/';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://0.0.0.0:5000/');
    });
  });

  describe('Duplicate suppression', () => {
    it('should not emit the same URL twice', () => {
      const text1 = 'Dash is running on http://127.0.0.1:8050/';
      const text2 = 'Dash is running on http://127.0.0.1:8050/';
      const results1 = detector.detect(text1);
      const results2 = detector.detect(text2);
      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(0);
    });

    it('should detect different URLs from the same detector', () => {
      const text1 = 'Dash is running on http://127.0.0.1:8050/';
      const text2 = 'Flask is running on http://127.0.0.1:5000/';
      const results1 = detector.detect(text1);
      const results2 = detector.detect(text2);
      expect(results1).toHaveLength(1);
      expect(results2).toHaveLength(1);
      expect(results2[0].url).toBe('http://127.0.0.1:5000/');
    });
  });

  describe('reset', () => {
    it('should allow re-detection after reset', () => {
      const text = 'Dash is running on http://127.0.0.1:8050/';
      detector.detect(text);
      detector.reset();
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('should return empty array for empty text', () => {
      expect(detector.detect('')).toHaveLength(0);
    });

    it('should return empty array for text without URLs', () => {
      expect(detector.detect('Hello world, no URLs here.')).toHaveLength(0);
    });

    it('should not detect non-localhost URLs', () => {
      const text = 'Server running at https://example.com:8080';
      const results = detector.detect(text);
      expect(results).toHaveLength(0);
    });

    it('should handle URLs with trailing punctuation', () => {
      const text = 'Dash is running on http://127.0.0.1:8050/.';
      const results = detector.detect(text);
      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('http://127.0.0.1:8050/');
    });
  });

  describe('createPreviewMessage', () => {
    it('should create a valid preview message', () => {
      const detection = {
        url: 'http://127.0.0.1:8050/',
        framework: 'Dash',
        title: 'Dash: http://127.0.0.1:8050/',
      };
      const msg = LocalServerDetector.createPreviewMessage(detection, 'conv-123');
      expect(msg.type).toBe('preview_open');
      expect(msg.conversation_id).toBe('conv-123');
      expect(msg.data.content).toBe('http://127.0.0.1:8050/');
      expect(msg.data.contentType).toBe('url');
      expect(msg.data.metadata.title).toBe('Dash: http://127.0.0.1:8050/');
      expect(msg.msg_id).toBeTruthy();
    });
  });
});
