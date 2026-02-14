/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentOutput, TeamMember } from '@/common/teamMonitor';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AgentPane from './AgentPane';

/**
 * tmux-like split view showing all agents in a grid layout.
 * Each agent gets its own pane with a terminal-style output view.
 */
const AgentSplitView: React.FC<{
  members: TeamMember[];
  agentOutputs: Map<string, AgentOutput>;
  selectedAgent: string | null;
  onSelectAgent: (name: string | null) => void;
}> = ({ members, agentOutputs, selectedAgent, onSelectAgent }) => {
  const { t } = useTranslation();

  // Filter out team-lead (runs in main session, not as subagent)
  const subagentMembers = useMemo(() => {
    return members.filter((m) => m.agentType !== 'team-lead' && m.name !== 'team-lead');
  }, [members]);

  // Calculate grid layout based on member count
  const gridStyle = useMemo(() => {
    const count = subagentMembers.length;
    if (count <= 1) return { gridTemplateColumns: '1fr' };
    if (count <= 2) return { gridTemplateColumns: '1fr 1fr' };
    if (count <= 4) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(2, 1fr)' };
    if (count <= 6) return { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'repeat(2, 1fr)' };
    return { gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: `repeat(${Math.ceil(count / 3)}, 1fr)` };
  }, [subagentMembers.length]);

  if (subagentMembers.length === 0) {
    return <div className='text-center text-t-tertiary text-13px py-24px'>{t('teamMonitor.noAgents')}</div>;
  }

  return (
    <div
      className='grid gap-4px p-4px overflow-auto'
      style={{
        ...gridStyle,
        height: '100%',
      }}
    >
      {subagentMembers.map((member) => {
        // Try multiple key formats for finding agent output
        const output = agentOutputs.get(member.name) || agentOutputs.get(member.agentId || '') || Array.from(agentOutputs.values()).find((o) => o.agentName.toLowerCase().includes(member.name.toLowerCase()));

        return <AgentPane key={member.agentId || member.name} member={member} output={output} isSelected={selectedAgent === member.name} onSelect={() => onSelectAgent(selectedAgent === member.name ? null : member.name)} />;
      })}
    </div>
  );
};

export default AgentSplitView;
