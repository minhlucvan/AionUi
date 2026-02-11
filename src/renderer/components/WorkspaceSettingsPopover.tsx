/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { IProvider } from '@/common/storage';
import type { IWorkspace } from '@/common/types/workspace';
import { useWorkspaceContext } from '@/renderer/context/WorkspaceContext';
import { Drawer, Input, Message, Select, Switch } from '@arco-design/web-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

type WorkspaceSettingsPopoverProps = {
  workspace: IWorkspace;
  onClose: () => void;
};

const WorkspaceSettingsPopover: React.FC<WorkspaceSettingsPopoverProps> = ({ workspace, onClose }) => {
  const { t } = useTranslation();
  const { updateWorkspace, setDefaultWorkspace, defaultWorkspace } = useWorkspaceContext();

  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [selectedAgent, setSelectedAgent] = useState(workspace.config?.defaultAgent || '');
  const [selectedModel, setSelectedModel] = useState(workspace.config?.defaultModel?.useModel || '');
  const isDefault = workspace.config?.isDefault === true;

  // Fetch available agents
  const { data: agents } = useSWR('workspace.settings.agents', async () => {
    const result = await ipcBridge.acpConversation.getAvailableAgents.invoke();
    if (result.success) {
      return result.data.filter((agent) => !(agent.backend === 'gemini' && agent.cliPath));
    }
    return [];
  });

  // Fetch model config
  const { data: modelConfig } = useSWR('workspace.settings.models', () => {
    return ipcBridge.mode.getModelConfig.invoke().then((data) => {
      return (data || []).filter((platform: IProvider) => !!platform.model.length);
    });
  });

  // Build flat model options from providers
  const modelOptions = useMemo(() => {
    if (!modelConfig) return [];
    const options: Array<{ value: string; label: string; group: string }> = [];
    for (const provider of modelConfig) {
      for (const model of provider.model) {
        options.push({ value: model, label: model, group: provider.name });
      }
    }
    return options;
  }, [modelConfig]);

  // Reset fields when workspace changes
  useEffect(() => {
    setName(workspace.name);
    setDescription(workspace.description || '');
    setSelectedAgent(workspace.config?.defaultAgent || '');
    setSelectedModel(workspace.config?.defaultModel?.useModel || '');
  }, [workspace]);

  const handleSave = useCallback(
    async (field: string, value: unknown) => {
      const updates: Record<string, unknown> = {};

      if (field === 'name') {
        updates.name = value;
      } else if (field === 'description') {
        updates.description = value;
      } else if (field === 'defaultAgent') {
        updates.config = { ...workspace.config, defaultAgent: value as string };
      } else if (field === 'defaultModel') {
        const modelValue = value as string;
        // Find the provider for this model
        const provider = modelConfig?.find((p: IProvider) => p.model.includes(modelValue));
        updates.config = {
          ...workspace.config,
          defaultModel: modelValue ? { id: provider?.id || '', useModel: modelValue } : undefined,
        };
      }

      try {
        await updateWorkspace({ id: workspace.id, updates });
      } catch (error: any) {
        Message.error(error?.message || 'Failed to save');
      }
    },
    [workspace, updateWorkspace, modelConfig]
  );

  const handleToggleDefault = useCallback(async () => {
    if (isDefault) return; // Cannot unset default from here
    try {
      await setDefaultWorkspace(workspace.id);
      Message.success(t('workspace.setAsDefault'));
    } catch (error: any) {
      Message.error(error?.message || 'Failed to set default');
    }
  }, [isDefault, setDefaultWorkspace, workspace.id, t]);

  return (
    <Drawer
      visible
      title={t('workspace.settings')}
      placement='right'
      width={360}
      onCancel={onClose}
      footer={null}
      unmountOnExit
    >
      <div className='flex flex-col gap-20px'>
        {/* Workspace name */}
        <div>
          <div className='text-13px text-t-secondary mb-4px'>{t('workspace.name')}</div>
          <Input
            value={name}
            onChange={(v) => setName(v)}
            onBlur={() => {
              if (name.trim() && name !== workspace.name) {
                handleSave('name', name.trim());
              }
            }}
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <div className='text-13px text-t-secondary mb-4px'>{t('workspace.description')}</div>
          <Input.TextArea
            value={description}
            onChange={(v) => setDescription(v)}
            onBlur={() => {
              if (description !== (workspace.description || '')) {
                handleSave('description', description.trim());
              }
            }}
            maxLength={500}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </div>

        {/* Folder path (read-only) */}
        <div>
          <div className='text-13px text-t-secondary mb-4px'>{t('workspace.folder')}</div>
          <Input value={workspace.path} readOnly />
        </div>

        {/* Default agent */}
        <div>
          <div className='text-13px text-t-secondary mb-4px'>{t('workspace.defaultAgent')}</div>
          <Select
            value={selectedAgent || undefined}
            placeholder={t('workspace.defaultAgent')}
            allowClear
            onChange={(v) => {
              setSelectedAgent(v || '');
              handleSave('defaultAgent', v || '');
            }}
          >
            {agents?.map((agent) => (
              <Select.Option key={agent.backend} value={agent.backend}>
                {agent.avatar ? `${agent.avatar} ` : ''}
                {agent.name}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* Default model */}
        <div>
          <div className='text-13px text-t-secondary mb-4px'>{t('workspace.defaultModel')}</div>
          <Select
            value={selectedModel || undefined}
            placeholder={t('workspace.defaultModel')}
            allowClear
            showSearch
            onChange={(v) => {
              setSelectedModel(v || '');
              handleSave('defaultModel', v || '');
            }}
          >
            {modelOptions.map((opt) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* Set as default */}
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-13px text-t-primary'>{t('workspace.default')}</div>
            <div className='text-12px text-t-tertiary'>{t('workspace.defaultDescription')}</div>
          </div>
          <Switch checked={isDefault} onChange={handleToggleDefault} disabled={isDefault} />
        </div>
      </div>
    </Drawer>
  );
};

export default WorkspaceSettingsPopover;
