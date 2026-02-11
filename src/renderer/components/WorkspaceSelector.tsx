/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IWorkspace } from '@/common/types/workspace';
import { useWorkspaceContext } from '@/renderer/context/WorkspaceContext';
import { iconColors } from '@/renderer/theme/colors';
import { Dropdown, Menu, Popconfirm, Tooltip } from '@arco-design/web-react';
import { AllApplication, DeleteOne, Down, FolderOpen, Pin, Plus } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CreateWorkspaceModal from './CreateWorkspaceModal';

type WorkspaceSelectorProps = {
  collapsed?: boolean;
};

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ collapsed = false }) => {
  const { t } = useTranslation();
  const { workspaces, activeWorkspace, setActiveWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaceContext();
  const [createModalVisible, setCreateModalVisible] = useState(false);

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

  const handleDelete = useCallback(
    async (wsId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await deleteWorkspace(wsId);
    },
    [deleteWorkspace]
  );

  const droplist = (
    <Menu className='max-h-400px overflow-y-auto min-w-200px'>
      {/* All Conversations option */}
      <Menu.Item
        key='all'
        className={classNames('flex items-center gap-8px', { '!bg-active': !activeWorkspace })}
        onClick={() => handleWorkspaceSelect(null)}
      >
        <AllApplication theme='outline' size='16' />
        <span>{t('workspace.allConversations')}</span>
      </Menu.Item>

      {workspaces.length > 0 && <hr className='my-4px border-b-1px border-border' />}

      {/* Workspace list - pinned first */}
      {workspaces.map((ws) => (
        <Menu.Item
          key={ws.id}
          className={classNames('flex items-center gap-8px group', { '!bg-active': activeWorkspace?.id === ws.id })}
          onClick={() => handleWorkspaceSelect(ws)}
        >
          <span className='flex-shrink-0'>{ws.icon || '📁'}</span>
          <span className='flex-1 truncate min-w-0'>{ws.name}</span>
          <span className='hidden group-hover:flex items-center gap-4px flex-shrink-0'>
            <span
              className='cursor-pointer'
              onClick={(e) => handleTogglePin(ws, e)}
              title={ws.pinned ? t('workspace.unpin') : t('workspace.pin')}
            >
              <Pin theme={ws.pinned ? 'filled' : 'outline'} size='14' />
            </span>
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
          </span>
        </Menu.Item>
      ))}

      {workspaces.length === 0 && (
        <div className='px-12px py-8px text-13px text-t-tertiary'>{t('workspace.noWorkspaces')}</div>
      )}

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
        <Tooltip disabled={!collapsed} content={activeWorkspace?.name || t('workspace.allConversations')} position='right'>
          <div className='flex items-center justify-start gap-8px px-12px py-6px hover:bg-hover rd-0.5rem cursor-pointer shrink-0 min-w-0'>
            <span className='flex-shrink-0'>
              {activeWorkspace ? (
                <span className='text-16px'>{activeWorkspace.icon || '📁'}</span>
              ) : (
                <FolderOpen theme='outline' size='20' fill={iconColors.primary} className='flex' />
              )}
            </span>
            <span className='collapsed-hidden flex-1 truncate text-14px font-medium text-t-primary min-w-0'>
              {activeWorkspace?.name || t('workspace.allConversations')}
            </span>
            <Down theme='outline' size='14' className='collapsed-hidden flex-shrink-0 text-t-secondary' />
          </div>
        </Tooltip>
      </Dropdown>

      <CreateWorkspaceModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </>
  );
};

export default WorkspaceSelector;
