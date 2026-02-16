/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FeedEntry } from '@/common/ipcBridge';
import type { ResearchAgent, ResearchSession } from '@process/services/researchTeam/types';
import { Tag, Typography, Progress } from '@arco-design/web-react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS: Record<string, string> = {
  idle: 'gray',
  starting: 'gold',
  running: 'arcoblue',
  paused: 'orangered',
  finished: 'green',
  error: 'red',
};

const STATUS_ICONS: Record<string, string> = {
  idle: '\u25CB', // ○
  starting: '\u25D4', // ◔
  running: '\u25B6', // ▶
  paused: '\u23F8', // ⏸
  finished: '\u2713', // ✓
  error: '\u2717', // ✗
};

type AgentTask = {
  agentId: string;
  agentName: string;
  role: string;
  status: string;
  /** Number of messages this agent has processed */
  messagesProcessed: number;
  /** Number of messages this agent has sent */
  messagesSent: number;
  /** Latest activity summary */
  lastActivity?: string;
  /** Timestamp of last activity */
  lastActivityTime?: number;
  /** Which agents this agent is monitoring (feeding to) */
  feedsTo: string[];
  /** Which agents feed to this agent */
  feedsFrom: string[];
};

function buildAgentTasks(session: ResearchSession | null, feed: FeedEntry[]): AgentTask[] {
  if (!session) return [];

  return session.agents.map((agent) => {
    // Count messages processed (commands received by this agent)
    const inbound = feed.filter((e) => e.kind === 'command' && e.targetAgentId === agent.id);
    const outbound = feed.filter((e) => e.sourceAgentId === agent.id);

    // Find the latest activity
    const agentEntries = feed.filter((e) => e.sourceAgentId === agent.id || e.targetAgentId === agent.id);
    const lastEntry = agentEntries.length > 0 ? agentEntries[agentEntries.length - 1] : undefined;

    // Determine feedback relationships: who does this agent feed messages to?
    const feedsTo = new Set<string>();
    const feedsFrom = new Set<string>();

    for (const entry of feed) {
      if (entry.kind === 'command' && entry.type === 'send_message') {
        if (entry.sourceAgentId === agent.id && entry.targetAgentId) {
          feedsTo.add(entry.targetAgentId);
        }
        if (entry.targetAgentId === agent.id && entry.sourceAgentId) {
          feedsFrom.add(entry.sourceAgentId);
        }
      }
    }

    return {
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role,
      status: agent.status,
      messagesProcessed: inbound.length,
      messagesSent: outbound.length,
      lastActivity: lastEntry?.summary,
      lastActivityTime: lastEntry?.timestamp,
      feedsTo: [...feedsTo],
      feedsFrom: [...feedsFrom],
    };
  });
}

function getAgentNameById(agents: ResearchAgent[], id: string): string {
  const agent = agents.find((a) => a.id === id);
  return agent?.name ?? id.slice(0, 8);
}

const AgentTaskCard: React.FC<{
  task: AgentTask;
  agents: ResearchAgent[];
  onSendMessage?: (agentId: string) => void;
}> = ({ task, agents, onSendMessage }) => {
  const { t } = useTranslation();
  const statusColor = STATUS_COLORS[task.status] || 'gray';
  const statusIcon = STATUS_ICONS[task.status] || '\u25CB';

  return (
    <div className='border border-[var(--border-base)] rounded-8px p-12px bg-1 hover:shadow-sm transition-shadow'>
      {/* Agent header */}
      <div className='flex items-center gap-8px mb-8px'>
        <span className='text-16px' style={{ color: `rgb(var(--${statusColor}-6))` }}>
          {statusIcon}
        </span>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-6px'>
            <Typography.Text className='text-14px font-medium text-t-primary' ellipsis>
              {task.agentName}
            </Typography.Text>
            <Tag size='small' color={statusColor}>
              {t(`researchTeam.agentStatus.${task.status}`)}
            </Tag>
          </div>
          <span className='text-11px text-t-tertiary'>{task.role}</span>
        </div>
        {task.status === 'running' && onSendMessage && (
          <button className='text-11px text-[rgb(var(--arcoblue-6))] hover:underline bg-transparent border-none cursor-pointer p-0' onClick={() => onSendMessage(task.agentId)}>
            {t('researchTeam.sendMessage')}
          </button>
        )}
      </div>

      {/* Activity stats */}
      <div className='flex items-center gap-12px mb-8px text-12px text-t-secondary'>
        <span>
          {'\u2193'} {task.messagesProcessed} {t('researchTeam.received')}
        </span>
        <span>
          {'\u2191'} {task.messagesSent} {t('researchTeam.sent')}
        </span>
      </div>

      {/* Feedback loop connections */}
      {(task.feedsTo.length > 0 || task.feedsFrom.length > 0) && (
        <div className='flex flex-col gap-4px mb-8px'>
          {task.feedsTo.length > 0 && (
            <div className='flex items-center gap-4px flex-wrap'>
              <span className='text-11px text-t-quaternary'>{t('researchTeam.feedsTo')}:</span>
              {task.feedsTo.map((id) => (
                <Tag key={id} size='small' color='arcoblue'>
                  {getAgentNameById(agents, id)}
                </Tag>
              ))}
            </div>
          )}
          {task.feedsFrom.length > 0 && (
            <div className='flex items-center gap-4px flex-wrap'>
              <span className='text-11px text-t-quaternary'>{t('researchTeam.feedsFrom')}:</span>
              {task.feedsFrom.map((id) => (
                <Tag key={id} size='small' color='purple'>
                  {getAgentNameById(agents, id)}
                </Tag>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Latest activity */}
      {task.lastActivity && (
        <Typography.Text className='text-11px text-t-tertiary leading-16px block' ellipsis={{ rows: 2 }}>
          {task.lastActivity}
        </Typography.Text>
      )}
    </div>
  );
};

type TeamTaskBoardViewProps = {
  session: ResearchSession | null;
  feed: FeedEntry[];
  onSendMessage?: (agentId: string) => void;
};

const TeamTaskBoardView: React.FC<TeamTaskBoardViewProps> = ({ session, feed, onSendMessage }) => {
  const { t } = useTranslation();

  const agentTasks = useMemo(() => buildAgentTasks(session, feed), [session, feed]);

  const runningCount = agentTasks.filter((t) => t.status === 'running').length;
  const finishedCount = agentTasks.filter((t) => t.status === 'finished').length;
  const totalCount = agentTasks.length;

  // Detect feedback loops: agents that mutually feed each other
  const feedbackLoops = useMemo(() => {
    const loops: Array<[string, string]> = [];
    for (const task of agentTasks) {
      for (const targetId of task.feedsTo) {
        const target = agentTasks.find((t) => t.agentId === targetId);
        if (target && target.feedsTo.includes(task.agentId)) {
          // Check if we already recorded this pair
          const exists = loops.some(([a, b]) => (a === task.agentId && b === targetId) || (a === targetId && b === task.agentId));
          if (!exists) {
            loops.push([task.agentId, targetId]);
          }
        }
      }
    }
    return loops;
  }, [agentTasks]);

  if (!session || agentTasks.length === 0) {
    return <div className='text-center text-t-tertiary text-13px py-24px'>{t('researchTeam.noAgents')}</div>;
  }

  return (
    <div className='flex flex-col gap-12px h-full overflow-y-auto'>
      {/* Session header */}
      <div className='flex items-center gap-8px px-4px'>
        <Typography.Text className='text-13px text-t-secondary' ellipsis>
          {session.objective}
        </Typography.Text>
      </div>

      {/* Progress summary */}
      <div className='flex items-center gap-12px px-4px'>
        <span className='text-12px text-t-secondary'>
          {finishedCount}/{totalCount} {t('researchTeam.agentsCompleted')}
        </span>
        <div className='flex-1'>
          <Progress percent={totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0} size='small' color='rgb(var(--green-6))' />
        </div>
        {runningCount > 0 && (
          <Tag size='small' color='arcoblue'>
            {runningCount} {t('researchTeam.active')}
          </Tag>
        )}
      </div>

      {/* Feedback loop indicator */}
      {feedbackLoops.length > 0 && (
        <div className='flex items-center gap-6px px-4px py-4px bg-[var(--bg-2)] rounded-6px'>
          <span className='text-12px'>{'\u21C4'}</span>
          <span className='text-12px text-t-secondary'>{t('researchTeam.feedbackLoopsDetected', { count: feedbackLoops.length })}</span>
          {feedbackLoops.map(([a, b]) => (
            <Tag key={`${a}-${b}`} size='small' color='purple'>
              {getAgentNameById(session.agents, a)} {'\u21C4'} {getAgentNameById(session.agents, b)}
            </Tag>
          ))}
        </div>
      )}

      {/* Agent cards */}
      <div className='grid gap-8px' style={{ gridTemplateColumns: totalCount <= 2 ? '1fr' : 'repeat(2, 1fr)' }}>
        {agentTasks.map((task) => (
          <AgentTaskCard key={task.agentId} task={task} agents={session.agents} onSendMessage={onSendMessage} />
        ))}
      </div>
    </div>
  );
};

export default TeamTaskBoardView;
