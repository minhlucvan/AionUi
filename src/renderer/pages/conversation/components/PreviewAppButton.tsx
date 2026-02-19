/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PreviewAppButton - Shows a "Preview App" button in the conversation header
 * when an app.json config file is detected in the workspace.
 *
 * Reads workspace/app.json to determine which apps are available for preview,
 * then opens the configured URL in the preview panel when clicked.
 */

import { ipcBridge } from '@/common';
import { joinPath } from '@/common/chatLib';
import type { WorkspaceApp } from '@/common/types/workspaceApp';
import { APP_CONFIG_FILENAME, normalizeAppConfig } from '@/common/types/workspaceApp';
import { useConversationContextSafe } from '@/renderer/context/ConversationContext';
import { usePreviewContext } from '@/renderer/pages/conversation/preview/context/PreviewContext';
import { iconColors } from '@/renderer/theme/colors';
import { Button, Dropdown, Menu, Tooltip } from '@arco-design/web-react';
import { PreviewOpen } from '@icon-park/react';
import React, { useCallback, useEffect, useState } from 'react';

type PreviewAppButtonProps = {
  workspace?: string;
};

const PreviewAppButton: React.FC<PreviewAppButtonProps> = ({ workspace: workspaceProp }) => {
  const conversationContext = useConversationContextSafe();
  const workspace = workspaceProp || conversationContext?.workspace;
  const { openPreview } = usePreviewContext();
  const [apps, setApps] = useState<WorkspaceApp[]>([]);

  // Read app.json from workspace on mount and when workspace changes
  useEffect(() => {
    if (!workspace) {
      setApps([]);
      return;
    }

    let cancelled = false;

    const loadAppConfig = async () => {
      try {
        const configPath = joinPath(workspace, APP_CONFIG_FILENAME);
        const content = await ipcBridge.fs.readFile.invoke({ path: configPath });
        if (cancelled) return;

        const raw = JSON.parse(content);
        const normalized = normalizeAppConfig(raw);
        setApps(normalized.apps);
      } catch {
        // app.json doesn't exist or is invalid - that's fine
        if (!cancelled) setApps([]);
      }
    };

    loadAppConfig();

    // Also listen for file changes to app.json
    const unsubscribe = ipcBridge.fileStream.contentUpdate.on(({ filePath, operation }) => {
      const fileName = filePath.split(/[\\/]/).pop();
      if (fileName === APP_CONFIG_FILENAME) {
        if (operation === 'delete') {
          setApps([]);
        } else {
          loadAppConfig();
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [workspace]);

  const handleOpenApp = useCallback(
    (app: WorkspaceApp) => {
      openPreview(app.url, 'url', {
        title: app.name || `Preview: ${app.url}`,
        editable: false,
      });
    },
    [openPreview]
  );

  // Don't render if no apps configured
  if (apps.length === 0) return null;

  // Single app: direct button click
  if (apps.length === 1) {
    return (
      <Tooltip content={`Preview: ${apps[0].name}`}>
        <Button
          type='text'
          size='small'
          onClick={() => handleOpenApp(apps[0])}
          icon={
            <span className='inline-flex items-center gap-2px rounded-full px-8px py-2px bg-2'>
              <PreviewOpen theme='outline' size={16} fill={iconColors.primary} />
            </span>
          }
        />
      </Tooltip>
    );
  }

  // Multiple apps: dropdown menu
  return (
    <Dropdown
      droplist={
        <Menu onClickMenuItem={(key) => {
          const app = apps.find((a) => a.url === key);
          if (app) handleOpenApp(app);
        }}>
          {apps.map((app) => (
            <Menu.Item key={app.url}>
              <span className='flex items-center gap-8px'>
                <PreviewOpen theme='outline' size={14} />
                <span>{app.name}</span>
                {app.type && <span className='text-t-secondary text-12px'>({app.type})</span>}
              </span>
            </Menu.Item>
          ))}
        </Menu>
      }
      trigger='click'
      position='bl'
    >
      <Tooltip content='Preview App'>
        <Button
          type='text'
          size='small'
          icon={
            <span className='inline-flex items-center gap-2px rounded-full px-8px py-2px bg-2'>
              <PreviewOpen theme='outline' size={16} fill={iconColors.primary} />
            </span>
          }
        />
      </Tooltip>
    </Dropdown>
  );
};

export default PreviewAppButton;
