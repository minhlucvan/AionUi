/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITeamDefinition, ITeamMemberDefinition } from '@/common/team';
import { TEAM_PRESETS } from '@/common/presets/teamPresets';
import { uuid } from '@/common/utils';
import { Button, Drawer, Input, Select, Space, Tag, Divider } from '@arco-design/web-react';
import { Delete, Plus } from '@icon-park/react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

const TextArea = Input.TextArea;

type TeamCreateDialogProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (team: ITeamDefinition) => void;
};

const emptyMember = (): ITeamMemberDefinition => ({
  id: uuid(8),
  name: '',
  role: 'member',
  systemPrompt: '',
});

const TeamCreateDialog: React.FC<TeamCreateDialogProps> = ({ visible, onClose, onConfirm }: TeamCreateDialogProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [members, setMembers] = useState<ITeamMemberDefinition[]>([
    { id: 'lead', name: 'Lead', role: 'lead', systemPrompt: '' },
    emptyMember(),
  ]);

  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = TEAM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setName(preset.name);
    setDescription(preset.description || '');
    setIcon(preset.icon || '');
    setMembers(preset.members.map((m) => ({ ...m })));
  }, []);

  const addMember = useCallback(() => {
    setMembers((prev: ITeamMemberDefinition[]) => [...prev, emptyMember()]);
  }, []);

  const removeMember = useCallback((id: string) => {
    setMembers((prev: ITeamMemberDefinition[]) => prev.filter((m: ITeamMemberDefinition) => m.id !== id));
  }, []);

  const updateMember = useCallback((id: string, updates: Partial<ITeamMemberDefinition>) => {
    setMembers((prev: ITeamMemberDefinition[]) => prev.map((m: ITeamMemberDefinition) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;
    if (members.length < 2) return;

    const team: ITeamDefinition = {
      id: uuid(12),
      name: name.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
      members,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onConfirm(team);
  }, [name, description, icon, members, onConfirm]);

  const isValid = name.trim() && members.length >= 2 && members.every((m: ITeamMemberDefinition) => m.name.trim() && m.systemPrompt.trim());

  return (
    <Drawer
      width={560}
      title={t('teams.createTeam', { defaultValue: 'Create Team' })}
      visible={visible}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
          <Button type='primary' disabled={!isValid} onClick={handleSubmit}>
            {t('common.create', { defaultValue: 'Create' })}
          </Button>
        </Space>
      }
    >
      {/* Preset templates */}
      <div className='mb-16px'>
        <div className='text-13px font-500 text-[var(--color-text-2)] mb-8px'>{t('teams.usePreset', { defaultValue: 'Start from template' })}</div>
        <div className='flex gap-8px flex-wrap'>
          {TEAM_PRESETS.map((preset) => (
            <Tag
              key={preset.id}
              className='cursor-pointer'
              color='arcoblue'
              onClick={() => handlePresetSelect(preset.id)}
            >
              {preset.icon} {preset.name}
            </Tag>
          ))}
        </div>
      </div>

      <Divider />

      {/* Team basics */}
      <div className='mb-16px'>
        <div className='text-13px font-500 text-[var(--color-text-2)] mb-4px'>{t('teams.teamName', { defaultValue: 'Team Name' })}</div>
        <Input value={name} onChange={setName} placeholder={t('teams.teamNamePlaceholder', { defaultValue: 'e.g., Full-Stack Dev Team' })} />
      </div>

      <div className='mb-16px'>
        <div className='text-13px font-500 text-[var(--color-text-2)] mb-4px'>{t('teams.description', { defaultValue: 'Description' })}</div>
        <Input value={description} onChange={setDescription} placeholder={t('teams.descriptionPlaceholder', { defaultValue: 'What does this team do?' })} />
      </div>

      <div className='mb-16px'>
        <div className='text-13px font-500 text-[var(--color-text-2)] mb-4px'>{t('teams.icon', { defaultValue: 'Icon (emoji)' })}</div>
        <Input value={icon} onChange={setIcon} placeholder='e.g., 👥' style={{ width: 80 }} />
      </div>

      <Divider />

      {/* Members */}
      <div className='mb-16px'>
        <div className='flex items-center justify-between mb-8px'>
          <div className='text-14px font-600 text-[var(--color-text-1)]'>
            {t('teams.members', { defaultValue: 'Members' })} ({members.length})
          </div>
          <Button size='small' type='text' icon={<Plus theme='outline' size='12' />} onClick={addMember}>
            {t('teams.addMember', { defaultValue: 'Add' })}
          </Button>
        </div>

        <div className='flex flex-col gap-12px'>
          {members.map((member: ITeamMemberDefinition, _index: number) => (
            <div key={member.id} className='p-12px rounded-8px bg-[var(--color-fill-1)] border border-[var(--color-border)]'>
              <div className='flex items-center gap-8px mb-8px'>
                <Input className='flex-1' value={member.name} onChange={(v: string) => updateMember(member.id, { name: v })} placeholder={t('teams.memberName', { defaultValue: 'Member name' })} />
                <Select value={member.role} onChange={(v: string) => updateMember(member.id, { role: v as 'lead' | 'member' })} style={{ width: 100 }}>
                  <Select.Option value='lead'>Lead</Select.Option>
                  <Select.Option value='member'>Member</Select.Option>
                </Select>
                {members.length > 2 && (
                  <Button size='small' type='text' status='danger' icon={<Delete theme='outline' size='14' />} onClick={() => removeMember(member.id)} />
                )}
              </div>
              <TextArea
                value={member.systemPrompt}
                onChange={(v: string) => updateMember(member.id, { systemPrompt: v })}
                placeholder={t('teams.systemPromptPlaceholder', { defaultValue: 'Instructions for this team member...' })}
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
};

export default TeamCreateDialog;
