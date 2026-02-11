/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { useWorkspaceContext } from '@/renderer/context/WorkspaceContext';
import { Button, Input, Modal, Message } from '@arco-design/web-react';
import { FolderOpen } from '@icon-park/react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

type CreateWorkspaceModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ visible, onClose, onCreated }) => {
  const { t } = useTranslation();
  const { createWorkspace, setActiveWorkspace } = useWorkspaceContext();
  const [name, setName] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSelectFolder = useCallback(async () => {
    const result = await ipcBridge.dialog.showOpen.invoke({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result && result.length > 0) {
      setFolderPath(result[0]);
      // Auto-fill name from folder name if empty
      if (!name) {
        const parts = result[0].replace(/[\\/]+$/, '').split(/[\\/]/);
        setName(parts[parts.length - 1] || '');
      }
    }
  }, [name]);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !folderPath.trim()) return;

    setCreating(true);
    try {
      const ws = await createWorkspace({
        name: name.trim(),
        path: folderPath.trim(),
        description: description.trim() || undefined,
      });
      setActiveWorkspace(ws);
      setName('');
      setFolderPath('');
      setDescription('');
      onClose();
      onCreated?.();
    } catch (error: any) {
      console.error('[CreateWorkspaceModal] Failed to create workspace:', error);
      Message.error(error?.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  }, [name, folderPath, description, createWorkspace, setActiveWorkspace, onClose, onCreated]);

  const handleCancel = useCallback(() => {
    setName('');
    setFolderPath('');
    setDescription('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} title={t('workspace.create')} onCancel={handleCancel} footer={null} unmountOnExit autoFocus>
      <div className='flex flex-col gap-16px'>
        {/* Workspace name */}
        <div>
          <div className='text-13px text-t-secondary mb-4px'>{t('workspace.name')}</div>
          <Input value={name} onChange={setName} placeholder={t('workspace.name')} maxLength={100} />
        </div>

        {/* Folder picker */}
        <div>
          <div className='text-13px text-t-secondary mb-4px'>{t('workspace.folder')}</div>
          <div className='flex gap-8px'>
            <Input value={folderPath} onChange={setFolderPath} placeholder={t('workspace.selectFolder')} className='flex-1' readOnly />
            <Button icon={<FolderOpen theme='outline' size='16' />} onClick={handleSelectFolder}>
              {t('workspace.selectFolder')}
            </Button>
          </div>
        </div>

        {/* Description (optional) */}
        <div>
          <div className='text-13px text-t-secondary mb-4px'>
            {t('workspace.description')} <span className='text-t-tertiary'>({t('common.optional') || 'Optional'})</span>
          </div>
          <Input.TextArea value={description} onChange={setDescription} placeholder={t('workspace.description')} maxLength={500} autoSize={{ minRows: 2, maxRows: 4 }} />
        </div>

        {/* Actions */}
        <div className='flex justify-end gap-8px mt-8px'>
          <Button onClick={handleCancel}>{t('common.cancel')}</Button>
          <Button type='primary' onClick={handleCreate} loading={creating} disabled={!name.trim() || !folderPath.trim()}>
            {t('workspace.create')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateWorkspaceModal;
