/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IAgentTeamMemberDefinition } from '@/common/agentTeam';
import React from 'react';

const ROLE_ICONS: Record<string, string> = {
  lead: '🎯',
  member: '🔧',
};

type AgentTeamMemberTabsProps = {
  members: IAgentTeamMemberDefinition[];
  activeMemberId: string;
  onSwitchMember: (memberId: string) => void;
};

const AgentTeamMemberTabs: React.FC<AgentTeamMemberTabsProps> = ({ members, activeMemberId, onSwitchMember }: AgentTeamMemberTabsProps) => {
  return (
    <div className='flex items-center gap-2px overflow-x-auto px-12px py-6px border-b border-[var(--color-border)]' style={{ scrollbarWidth: 'none' }}>
      {members.map((member: IAgentTeamMemberDefinition) => {
        const isActive = member.id === activeMemberId;
        const icon = ROLE_ICONS[member.role] || ROLE_ICONS.member;

        return (
          <button
            key={member.id}
            className={`flex items-center gap-6px px-12px py-6px rounded-6px text-13px cursor-pointer border-none whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-[rgb(var(--primary-6))] text-white font-500'
                : 'bg-transparent text-[var(--color-text-2)] hover:bg-[var(--color-fill-2)]'
            }`}
            onClick={() => onSwitchMember(member.id)}
          >
            <span>{icon}</span>
            <span>{member.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default AgentTeamMemberTabs;
