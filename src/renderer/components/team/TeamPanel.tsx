/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTeamMonitor } from '@/renderer/context/TeamMonitorContext';
import { Tag, Tabs } from '@arco-design/web-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AgentSplitView from './AgentSplitView';
import TaskListView from './TaskListView';

type TabKey = 'tasks' | 'agents';

/**
 * TeamPanel is the main container for agent team monitoring.
 * It provides two tabs:
 * 1. Task List - shows the shared team task list with progress
 * 2. Agent View - tmux-like split pane showing each agent's output
 */
const TeamPanel: React.FC = () => {
  const { t } = useTranslation();
  const { teamName, members, tasks, agentOutputs, selectedAgent, setSelectedAgent } = useTeamMonitor();
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');

  const inProgressCount = tasks.filter((t) => t.state === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.state === 'completed').length;
  const activeMembers = members.filter((m) => m.status === 'active').length;

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {/* Team header */}
      <div className='flex items-center gap-8px px-12px py-6px border-b border-[var(--bg-3)] shrink-0'>
        <span className='text-14px font-medium text-t-primary'>{teamName || t('teamMonitor.team')}</span>
        <div className='flex items-center gap-4px ml-auto'>
          <Tag size='small' color='arcoblue'>
            {members.length} {t('teamMonitor.agents')}
          </Tag>
          {tasks.length > 0 && (
            <Tag size='small' color='green'>
              {completedCount}/{tasks.length}
            </Tag>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs activeTab={activeTab} onChange={(key) => setActiveTab(key as TabKey)} size='small' className='team-panel-tabs'>
        <Tabs.TabPane
          key='tasks'
          title={
            <span className='flex items-center gap-4px'>
              {t('teamMonitor.taskList')}
              {inProgressCount > 0 && (
                <Tag size='small' color='arcoblue'>
                  {inProgressCount}
                </Tag>
              )}
            </span>
          }
        >
          <div className='overflow-y-auto p-4px' style={{ height: 'calc(100% - 8px)' }}>
            <TaskListView tasks={tasks} />
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane
          key='agents'
          title={
            <span className='flex items-center gap-4px'>
              {t('teamMonitor.agentView')}
              {activeMembers > 0 && (
                <Tag size='small' color='arcoblue'>
                  {activeMembers}
                </Tag>
              )}
            </span>
          }
        >
          <AgentSplitView members={members} agentOutputs={agentOutputs} selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default TeamPanel;
