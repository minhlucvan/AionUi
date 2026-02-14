/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { TEAM_TAB_TASKS, useTeamMonitor } from '@/renderer/context/TeamMonitorContext';
import React from 'react';
import AgentPane from './AgentPane';
import TaskListView from './TaskListView';

/**
 * TeamTabContent renders the content for the active team tab.
 * - Tasks tab → full-size TaskListView
 * - Agent tab → full-size AgentPane for the selected agent
 *
 * The "Chat" tab does NOT use this component — it renders the normal chat.
 */
const TeamTabContent: React.FC = () => {
  const { activeTab, members, tasks, agentOutputs, setActiveTab } = useTeamMonitor();

  if (activeTab === TEAM_TAB_TASKS) {
    return (
      <div className='flex flex-col h-full overflow-y-auto px-20px py-12px'>
        <TaskListView tasks={tasks} />
      </div>
    );
  }

  // Active tab is an agent ID/name — find the member
  const member = members.find((m) => (m.agentId || m.name) === activeTab);
  if (!member) {
    // Tab refers to an unknown agent — fall back to task view
    return (
      <div className='flex flex-col h-full overflow-y-auto px-20px py-12px'>
        <TaskListView tasks={tasks} />
      </div>
    );
  }

  const output = agentOutputs.get(member.name) || agentOutputs.get(member.agentId || '') || Array.from(agentOutputs.values()).find((o) => o.agentName.toLowerCase().includes(member.name.toLowerCase()));

  return (
    <div className='flex flex-col h-full overflow-hidden px-12px py-8px'>
      <AgentPane key={member.agentId || member.name} member={member} output={output} isSelected onSelect={() => setActiveTab(activeTab)} />
    </div>
  );
};

export default TeamTabContent;
