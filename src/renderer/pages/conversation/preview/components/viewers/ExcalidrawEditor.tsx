/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeDetection } from '../../hooks';
import { usePreviewToolbarExtras } from '../../context/PreviewToolbarExtrasContext';

/**
 * Excalidraw data types
 */
type ExcalidrawElement = Record<string, unknown>;
type AppState = Record<string, unknown>;
type BinaryFiles = Record<string, unknown>;

type ExcalidrawImperativeAPI = {
  updateScene: (scene: { elements?: readonly ExcalidrawElement[]; appState?: Partial<AppState> }) => void;
  getSceneElements: () => readonly ExcalidrawElement[];
  getAppState: () => AppState;
  getFiles: () => BinaryFiles;
  scrollToContent: (target?: ExcalidrawElement | readonly ExcalidrawElement[]) => void;
  resetScene: () => void;
};

interface ExcalidrawEditorProps {
  content: string;
  onChange?: (content: string) => void;
  viewModeEnabled?: boolean;
  filePath?: string;
}

/**
 * Parse excalidraw content from string to initial data
 */
const parseExcalidrawContent = (content: string): { elements: ExcalidrawElement[]; appState: Partial<AppState>; files: BinaryFiles } | null => {
  if (!content || !content.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(content);

    // Validate it's an excalidraw file
    if (parsed.type === 'excalidraw' || Array.isArray(parsed.elements)) {
      return {
        elements: parsed.elements || [],
        appState: parsed.appState || {},
        files: parsed.files || {},
      };
    }

    // If content is just an array of elements
    if (Array.isArray(parsed)) {
      return {
        elements: parsed,
        appState: {},
        files: {},
      };
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Serialize excalidraw data back to JSON string
 */
const serializeExcalidrawData = (elements: readonly ExcalidrawElement[], appState: Partial<AppState>, files: BinaryFiles): string => {
  // Filter out non-persisted appState keys
  const persistedAppState: Record<string, unknown> = {};
  const persistKeys = ['gridSize', 'gridStep', 'gridModeEnabled', 'viewBackgroundColor', 'zenModeEnabled', 'objectsSnapModeEnabled'];
  for (const key of persistKeys) {
    if (key in (appState as Record<string, unknown>)) {
      persistedAppState[key] = (appState as Record<string, unknown>)[key];
    }
  }

  return JSON.stringify(
    {
      type: 'excalidraw',
      version: 2,
      source: 'aionui',
      elements,
      appState: persistedAppState,
      files,
    },
    null,
    2
  );
};

/**
 * Excalidraw editor/viewer component
 *
 * Provides full Excalidraw drawing capabilities with edit and view modes.
 * Supports .excalidraw and .excalidraw.json file formats.
 */
const ExcalidrawEditor: React.FC<ExcalidrawEditorProps> = ({ content, onChange, viewModeEnabled = false, filePath }) => {
  const { t } = useTranslation();
  const currentTheme = useThemeDetection();
  const [ExcalidrawComp, setExcalidrawComp] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const isInternalChange = useRef(false);
  const lastSerializedContent = useRef<string>(content);
  const toolbarExtras = usePreviewToolbarExtras();

  // Lazily load the Excalidraw component
  useEffect(() => {
    let mounted = true;

    const loadExcalidraw = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        // Load Excalidraw CSS and module in parallel
        // @ts-expect-error CSS module has no type declarations
        const [mod] = await Promise.all([import('@excalidraw/excalidraw'), import('@excalidraw/excalidraw/index.css')]);
        if (!mounted) return;

        setExcalidrawComp(() => mod.Excalidraw as unknown as React.ComponentType<Record<string, unknown>>);
      } catch (err) {
        if (!mounted) return;
        console.error('[ExcalidrawEditor] Failed to load Excalidraw:', err);
        setLoadError(t('preview.excalidraw.loadFailed', { defaultValue: 'Failed to load Excalidraw editor' }));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadExcalidraw();

    return () => {
      mounted = false;
    };
  }, [t]);

  // Parse initial data from content
  const initialData = useMemo(() => {
    const parsed = parseExcalidrawContent(content);
    if (!parsed) {
      return {
        elements: [] as ExcalidrawElement[],
        appState: {
          viewBackgroundColor: currentTheme === 'dark' ? '#1e1e1e' : '#ffffff',
        },
        files: {} as BinaryFiles,
      };
    }
    return {
      ...parsed,
      appState: {
        ...parsed.appState,
        theme: currentTheme,
      },
    };
    // Only compute on mount - intentionally empty deps
  }, []);

  // Handle external content changes (e.g., streaming updates)
  useEffect(() => {
    if (!excalidrawAPIRef.current || isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    // Skip if content matches our last serialized output
    if (content === lastSerializedContent.current) return;

    const parsed = parseExcalidrawContent(content);
    if (parsed) {
      excalidrawAPIRef.current.updateScene({
        elements: parsed.elements,
      });
      lastSerializedContent.current = content;
    }
  }, [content]);

  // Handle excalidraw onChange
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (!onChange || viewModeEnabled) return;

      const serialized = serializeExcalidrawData(elements, appState, files);
      lastSerializedContent.current = serialized;
      isInternalChange.current = true;
      onChange(serialized);
    },
    [onChange, viewModeEnabled]
  );

  // Store the excalidraw API
  const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawAPIRef.current = api;
  }, []);

  // Register toolbar extras for zoom controls
  useEffect(() => {
    toolbarExtras?.setExtras({
      left: null,
      right: (
        <div className='flex items-center gap-4px'>
          <div
            className='flex items-center gap-4px px-8px py-4px rd-4px cursor-pointer hover:bg-bg-3 transition-colors'
            onClick={() => {
              if (excalidrawAPIRef.current) {
                const elements = excalidrawAPIRef.current.getSceneElements();
                if (elements.length > 0) {
                  excalidrawAPIRef.current.scrollToContent(elements);
                }
              }
            }}
            title={t('preview.excalidraw.zoomToFit', { defaultValue: 'Zoom to fit' })}
          >
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='text-t-secondary'>
              <path d='M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7' />
            </svg>
            <span className='text-12px text-t-secondary'>{t('preview.excalidraw.zoomToFit', { defaultValue: 'Zoom to fit' })}</span>
          </div>
        </div>
      ),
    });

    return () => {
      toolbarExtras?.setExtras(null);
    };
  }, [toolbarExtras, t]);

  if (loading) {
    return (
      <div className='flex-1 flex items-center justify-center bg-bg-1'>
        <div className='text-14px text-t-secondary'>{t('common.loading', { defaultValue: 'Loading...' })}</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center bg-bg-1 gap-8px'>
        <div className='text-14px text-t-secondary'>{loadError}</div>
        {filePath && <div className='text-12px text-t-secondary'>{filePath}</div>}
      </div>
    );
  }

  if (!ExcalidrawComp) {
    return null;
  }

  return (
    <div className='flex-1 overflow-hidden relative' style={{ height: '100%' }}>
      <ExcalidrawComp
        initialData={initialData}
        theme={currentTheme}
        onChange={handleChange}
        viewModeEnabled={viewModeEnabled}
        excalidrawAPI={handleExcalidrawAPI}
        langCode='en'
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveToActiveFile: false,
          },
        }}
      />
    </div>
  );
};

export default ExcalidrawEditor;
