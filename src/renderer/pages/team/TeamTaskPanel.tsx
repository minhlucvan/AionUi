/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITeamTask, TeamTaskStatus } from '@/common/team';
import { Button, Drawer, Input, Select, Empty } from '@arco-design/web-react';
import { Plus } from '@icon-park/react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTeamContext } from '@/renderer/context/TeamContext';

const STATUS_ICONS: Record<TeamTaskStatus, string> = {
  pending: '⬜',
  in_progress: '🔄',
  completed: '✅',
  blocked: '🚫',
};

const TaskItem: React.FC<{
  task: ITeamTask;
  onStatusChange: (taskId: string, status: TeamTaskStatus) => void;
}> = ({ task, onStatusChange }: { task: ITeamTask; onStatusChange: (taskId: string, status: TeamTaskStatus) => void }) => {
  return (
    <div className='flex items-start gap-8px p-8px rounded-6px hover:bg-[var(--color-fill-1)] transition-colors'>
      <span className='text-16px mt-2px'>{STATUS_ICONS[task.status]}</span>
      <div className='flex-1 min-w-0'>
        <div className={`text-13px ${task.status === 'completed' ? 'line-through text-[var(--color-text-4)]' : 'text-[var(--color-text-1)]'}`}>{task.title}</div>
        {task.description && <div className='text-12px text-[var(--color-text-3)] mt-2px'>{task.description}</div>}
        {task.assigneeId && <div className='text-11px text-[var(--color-text-4)] mt-2px'>→ {task.assigneeId}</div>}
      </div>
      <Select
        size='mini'
        value={task.status}
        onChange={(v: string) => onStatusChange(task.id, v as TeamTaskStatus)}
        style={{ width: 110 }}
        triggerProps={{ autoAlignPopupWidth: false }}
      >
        <Select.Option value='pending'>Pending</Select.Option>
        <Select.Option value='in_progress'>In Progress</Select.Option>
        <Select.Option value='completed'>Completed</Select.Option>
        <Select.Option value='blocked'>Blocked</Select.Option>
      </Select>
    </div>
  );
};

type TeamTaskPanelProps = {
  visible: boolean;
  onClose: () => void;
};

const TeamTaskPanel: React.FC<TeamTaskPanelProps> = ({ visible, onClose }: TeamTaskPanelProps) => {
  const { t } = useTranslation();
  const { tasks, addTask, updateTask, definition } = useTeamContext();
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState<string | undefined>();

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    await addTask(newTitle.trim(), undefined, newAssignee);
    setNewTitle('');
    setNewAssignee(undefined);
  }, [newTitle, newAssignee, addTask]);

  const handleStatusChange = useCallback(
    async (taskId: string, status: TeamTaskStatus) => {
      await updateTask(taskId, { status });
    },
    [updateTask]
  );

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'blocked');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <Drawer width={360} title={t('teams.sharedTasks', { defaultValue: 'Shared Tasks' })} visible={visible} onCancel={onClose} footer={null} mask={false}>
      {/* Add task form */}
      <div className='flex gap-8px mb-16px'>
        <Input className='flex-1' value={newTitle} onChange={setNewTitle} placeholder={t('teams.newTaskPlaceholder', { defaultValue: 'Add a task...' })} onPressEnter={handleAdd} />
        <Select value={newAssignee} onChange={setNewAssignee} placeholder='Assign' allowClear style={{ width: 120 }}>
          {definition.members.map((m) => (
            <Select.Option key={m.id} value={m.id}>
              {m.name}
            </Select.Option>
          ))}
        </Select>
        <Button type='primary' icon={<Plus theme='outline' size='12' />} onClick={handleAdd} disabled={!newTitle.trim()} />
      </div>

      {tasks.length === 0 ? (
        <Empty description={t('teams.noTasks', { defaultValue: 'No tasks yet' })} />
      ) : (
        <div className='flex flex-col gap-12px'>
          {inProgressTasks.length > 0 && (
            <div>
              <div className='text-12px font-500 text-[var(--color-text-3)] mb-4px uppercase'>In Progress ({inProgressTasks.length})</div>
              {inProgressTasks.map((task) => (
                <TaskItem key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}

          {pendingTasks.length > 0 && (
            <div>
              <div className='text-12px font-500 text-[var(--color-text-3)] mb-4px uppercase'>Pending ({pendingTasks.length})</div>
              {pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <div className='text-12px font-500 text-[var(--color-text-3)] mb-4px uppercase'>Completed ({completedTasks.length})</div>
              {completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};

export default TeamTaskPanel;
