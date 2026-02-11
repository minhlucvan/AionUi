/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IWorkspace } from '@/common/types/workspace';
import { useWorkspaceContext } from '@/renderer/context/WorkspaceContext';
import { iconColors } from '@/renderer/theme/colors';
import { Dropdown, Menu, Popconfirm, Tooltip } from '@arco-design/web-react';
import { DeleteOne, Down, Home, Pin, Plus, SettingTwo } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import WorkspaceSettingsPopover from './WorkspaceSettingsPopover';

type WorkspaceSelectorProps = {
  collapsed?: boolean;
};

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ collapsed = false }) => {
  const { t } = useTranslation();
  const { workspaces, activeWorkspace, defaultWorkspace, effectiveWorkspace, setActiveWorkspace, setDefaultWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaceContext();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [settingsWorkspace, setSettingsWorkspace] = useState<IWorkspace | null>(null);

  const handleWorkspaceSelect = useCallback(
    (ws: IWorkspace | null) => {
      setActiveWorkspace(ws);
    },
    [setActiveWorkspace]
  );

  const handleTogglePin = useCallback(
    async (ws: IWorkspace, e: React.MouseEvent) => {
      e.stopPropagation();
      await updateWorkspace({ id: ws.id, updates: { pinned: !ws.pinned } });
    },
    [updateWorkspace]
  );

  const handleSetDefault = useCallback(
    async (wsId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await setDefaultWorkspace(wsId);
    },
    [setDefaultWorkspace]
  );

  const handleDelete = useCallback(
    async (wsId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await deleteWorkspace(wsId);
    },
    [deleteWorkspace]
  );

  const handleOpenSettings = useCallback((ws: IWorkspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingsWorkspace(ws);
  }, []);

  // Display name for the selector button
  const displayName = effectiveWorkspace?.name || t('workspace.allConversations');
  const displayIcon = effectiveWorkspace?.icon || '📁';

  const droplist = (
    <Menu className='max-h-400px overflow-y-auto min-w-220px'>
      {/* Workspace list */}
      {workspaces.map((ws) => {
        const isDefault = ws.config?.isDefault === true;
        const isActive = activeWorkspace?.id === ws.id;
        const isEffective = !activeWorkspace && isDefault;

        return (
          <Menu.Item
            key={ws.id}
            className={classNames('flex items-center gap-8px group', { '!bg-active': isActive || isEffective })}
            onClick={() => handleWorkspaceSelect(isDefault ? null : ws)}
          >
            <span className='flex-shrink-0'>{ws.icon || '📁'}</span>
            <span className='flex-1 truncate min-w-0'>{ws.name}</span>
            {isDefault && <Home theme='filled' size='12' className='flex-shrink-0 text-t-tertiary' />}
            <span className='hidden group-hover:flex items-center gap-4px flex-shrink-0'>
              <span className='cursor-pointer' onClick={(e) => handleOpenSettings(ws, e)} title={t('workspace.settings')}>
                <SettingTwo theme='outline' size='14' />
              </span>
              <span className='cursor-pointer' onClick={(e) => handleTogglePin(ws, e)} title={ws.pinned ? t('workspace.unpin') : t('workspace.pin')}>
                <Pin theme={ws.pinned ? 'filled' : 'outline'} size='14' />
              </span>
              {!isDefault && (
                <span className='cursor-pointer' onClick={(e) => handleSetDefault(ws.id, e)} title={t('workspace.setAsDefault')}>
                  <Home theme='outline' size='14' />
                </span>
              )}
              {!isDefault && (
                <Popconfirm
                  title={t('workspace.delete')}
                  content={t('workspace.deleteConfirm')}
                  onOk={(e) => handleDelete(ws.id, e)}
                  onCancel={(e) => e.stopPropagation()}
                >
                  <span className='cursor-pointer' onClick={(e) => e.stopPropagation()}>
                    <DeleteOne theme='outline' size='14' />
                  </span>
                </Popconfirm>
              )}
            </span>
          </Menu.Item>
        );
      })}

      {workspaces.length === 0 && <div className='px-12px py-8px text-13px text-t-tertiary'>{t('workspace.noWorkspaces')}</div>}

      <hr className='my-4px border-b-1px border-border' />

      {/* Create workspace action */}
      <Menu.Item key='create' className='flex items-center gap-8px' onClick={() => setCreateModalVisible(true)}>
        <Plus theme='outline' size='16' fill={iconColors.primary} />
        <span className='text-primary'>{t('workspace.create')}</span>
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Dropdown droplist={droplist} trigger='click' position='bl'>
        <Tooltip disabled={!collapsed} content={displayName} position='right'>
          <div className='flex items-center justify-start gap-8px px-12px py-6px hover:bg-hover rd-0.5rem cursor-pointer shrink-0 min-w-0'>
            <span className='flex-shrink-0 text-16px'>{displayIcon}</span>
            <span className='collapsed-hidden flex-1 truncate text-14px font-medium text-t-primary min-w-0'>{displayName}</span>
            <Down theme='outline' size='14' className='collapsed-hidden flex-shrink-0 text-t-secondary' />
          </div>
        </Tooltip>
      </Dropdown>

      <CreateWorkspaceModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} />

      {settingsWorkspace && <WorkspaceSettingsPopover workspace={settingsWorkspace} onClose={() => setSettingsWorkspace(null)} />}
    </>
  );
};

export default WorkspaceSelector;
