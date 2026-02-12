/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TeamTask } from '@/common/teamMonitor';
import { Tag, Typography } from '@arco-design/web-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const stateColors: Record<string, string> = {
  pending: 'gray',
  in_progress: 'arcoblue',
  completed: 'green',
};

const stateIcons: Record<string, string> = {
  pending: '\u25CB', // ○
  in_progress: '\u25D4', // ◔
  completed: '\u25CF', // ●
};

const TaskItem: React.FC<{ task: TeamTask }> = ({ task }) => {
  const { t } = useTranslation();

  return (
    <div className='flex items-start gap-8px py-6px px-8px rounded-4px hover:bg-[var(--bg-2)] transition-colors'>
      <span className='text-14px leading-20px shrink-0' style={{ color: `rgb(var(--${stateColors[task.state]}-6))` }}>
        {stateIcons[task.state]}
      </span>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-6px'>
          <Typography.Text className='text-13px leading-20px text-t-primary' ellipsis>
            {task.subject}
          </Typography.Text>
        </div>
        {task.description && (
          <Typography.Text className='text-11px text-t-tertiary leading-16px block' ellipsis={{ rows: 2 }}>
            {task.description}
          </Typography.Text>
        )}
        <div className='flex items-center gap-4px mt-2px'>
          <Tag size='small' color={stateColors[task.state]}>
            {t(`teamMonitor.taskState.${task.state}`)}
          </Tag>
          {task.assignee && (
            <Tag size='small' color='purple'>
              {task.assignee}
            </Tag>
          )}
        </div>
      </div>
    </div>
  );
};

const TaskListView: React.FC<{ tasks: TeamTask[] }> = ({ tasks }) => {
  const { t } = useTranslation();

  const pending = tasks.filter((t) => t.state === 'pending');
  const inProgress = tasks.filter((t) => t.state === 'in_progress');
  const completed = tasks.filter((t) => t.state === 'completed');

  if (tasks.length === 0) {
    return <div className='text-center text-t-tertiary text-13px py-16px'>{t('teamMonitor.noTasks')}</div>;
  }

  return (
    <div className='flex flex-col gap-4px'>
      {/* Progress summary */}
      <div className='flex items-center gap-8px px-8px py-4px text-12px text-t-secondary'>
        <span>
          {completed.length}/{tasks.length} {t('teamMonitor.completed')}
        </span>
        <div className='flex-1 h-4px rounded-2px bg-[var(--bg-3)] overflow-hidden'>
          <div
            className='h-full rounded-2px transition-all'
            style={{
              width: `${tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0}%`,
              background: 'rgb(var(--green-6))',
            }}
          />
        </div>
      </div>

      {/* In progress tasks first */}
      {inProgress.length > 0 && (
        <div className='flex flex-col'>
          {inProgress.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div className='flex flex-col'>
          {pending.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Completed tasks (collapsed by default if many) */}
      {completed.length > 0 && (
        <div className='flex flex-col'>
          {completed.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskListView;
