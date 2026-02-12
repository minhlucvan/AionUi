/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentOutput, TeamMember } from '@/common/teamMonitor';
import { Tag, Typography } from '@arco-design/web-react';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const statusColors: Record<string, string> = {
  idle: 'gray',
  active: 'arcoblue',
  finished: 'green',
};

const AgentPane: React.FC<{
  member: TeamMember;
  output?: AgentOutput;
  isSelected?: boolean;
  onSelect?: () => void;
}> = ({ member, output, isSelected, onSelect }) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output?.entries.length]);

  return (
    <div
      className='flex flex-col border border-[var(--bg-3)] rounded-6px overflow-hidden cursor-pointer transition-all'
      style={{
        outline: isSelected ? '2px solid rgb(var(--arcoblue-6))' : 'none',
        minHeight: '120px',
        maxHeight: '100%',
      }}
      onClick={onSelect}
    >
      {/* Pane header - like a tmux pane title */}
      <div className='flex items-center gap-6px px-8px py-4px bg-[var(--bg-2)] border-b border-[var(--bg-3)] shrink-0'>
        <Tag size='small' color={member.role === 'lead' ? 'gold' : statusColors[member.status]}>
          {member.role === 'lead' ? t('teamMonitor.lead') : member.status}
        </Tag>
        <Typography.Text className='text-12px font-medium text-t-primary' ellipsis>
          {member.name}
        </Typography.Text>
        {member.currentTask && (
          <Typography.Text className='text-11px text-t-tertiary ml-auto' ellipsis>
            {member.currentTask}
          </Typography.Text>
        )}
      </div>

      {/* Pane content - terminal-like output */}
      <div
        ref={scrollRef}
        className='flex-1 overflow-y-auto p-6px font-mono text-12px leading-18px bg-[var(--bg-1)]'
        style={{ minHeight: '80px' }}
      >
        {output && output.entries.length > 0 ? (
          output.entries.slice(-50).map((entry, i) => (
            <div key={i} className={`py-1px ${entry.role === 'assistant' ? 'text-t-primary' : 'text-t-tertiary'}`}>
              {entry.toolName ? (
                <span className='text-[rgb(var(--arcoblue-6))]'>
                  {'\u25B6'} {entry.toolName}
                </span>
              ) : (
                <span>{entry.text.length > 300 ? `${entry.text.slice(0, 300)}...` : entry.text}</span>
              )}
            </div>
          ))
        ) : (
          <div className='text-t-tertiary text-center py-8px'>{t('teamMonitor.waitingForOutput')}</div>
        )}
      </div>
    </div>
  );
};

export default AgentPane;
