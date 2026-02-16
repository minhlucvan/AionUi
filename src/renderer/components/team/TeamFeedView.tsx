/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FeedEntry } from '@/common/ipcBridge';
import type { ResearchSession } from '@process/services/researchTeam/types';
import { Tag, Typography } from '@arco-design/web-react';
import React, { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const EVENT_COLORS: Record<string, string> = {
  session_started: 'green',
  session_completed: 'green',
  session_error: 'red',
  agent_started: 'arcoblue',
  agent_output: 'gray',
  agent_finished: 'green',
  agent_error: 'red',
  agent_paused: 'orangered',
  agent_resumed: 'arcoblue',
  finding_reported: 'purple',
  progress_updated: 'cyan',
  send_message: 'arcoblue',
  assign_task: 'gold',
  request_review: 'purple',
  share_context: 'cyan',
  pause: 'orangered',
  resume: 'arcoblue',
  stop: 'red',
};

const EVENT_ICONS: Record<string, string> = {
  session_started: '\u25B6', // ▶
  session_completed: '\u2713', // ✓
  session_error: '\u2717', // ✗
  agent_started: '\u25B6', // ▶
  agent_output: '\u25CF', // ●
  agent_finished: '\u2713', // ✓
  agent_error: '\u2717', // ✗
  agent_paused: '\u23F8', // ⏸
  agent_resumed: '\u25B6', // ▶
  finding_reported: '\u2605', // ★
  progress_updated: '\u25D4', // ◔
  send_message: '\u2709', // ✉
  assign_task: '\u2794', // ➔
  request_review: '\u2606', // ☆
  share_context: '\u21C4', // ⇄
  pause: '\u23F8', // ⏸
  resume: '\u25B6', // ▶
  stop: '\u23F9', // ⏹
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getAgentName(agentId: string | null | undefined, session: ResearchSession | null): string {
  if (!agentId) return 'System';
  if (!session) return agentId.slice(0, 8);
  const agent = session.agents.find((a) => a.id === agentId);
  return agent?.name ?? agentId.slice(0, 8);
}

const FeedItem: React.FC<{ entry: FeedEntry; session: ResearchSession | null }> = ({ entry, session }) => {
  const icon = EVENT_ICONS[entry.type] || '\u25CF';
  const color = EVENT_COLORS[entry.type] || 'gray';
  const sourceName = getAgentName(entry.sourceAgentId, session);
  const targetName = entry.targetAgentId ? getAgentName(entry.targetAgentId, session) : null;

  // For agent_output entries, show the chunk preview
  const outputPreview = entry.type === 'agent_output' && entry.data && typeof entry.data === 'object' && 'chunk' in entry.data ? (entry.data as { chunk: string }).chunk : null;

  // Skip rendering raw output chunks unless they have substantial content
  if (outputPreview && outputPreview.trim().length < 2) return null;

  return (
    <div className='flex items-start gap-8px py-4px px-8px rounded-4px hover:bg-[var(--bg-2)] transition-colors group'>
      {/* Timeline dot */}
      <div className='flex flex-col items-center shrink-0 pt-2px'>
        <span className='text-12px' style={{ color: `rgb(var(--${color}-6))` }}>
          {icon}
        </span>
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-6px flex-wrap'>
          <Tag size='small' color={color}>
            {entry.type.replace(/_/g, ' ')}
          </Tag>
          <span className='text-11px text-t-tertiary'>{sourceName}</span>
          {targetName && (
            <>
              <span className='text-11px text-t-quaternary'>{'\u2192'}</span>
              <span className='text-11px text-t-tertiary'>{targetName}</span>
            </>
          )}
          <span className='text-10px text-t-quaternary ml-auto opacity-0 group-hover:opacity-100 transition-opacity'>{formatTime(entry.timestamp)}</span>
        </div>

        {entry.summary && (
          <Typography.Text className='text-12px text-t-secondary leading-18px block mt-2px' ellipsis={{ rows: 3 }}>
            {entry.summary}
          </Typography.Text>
        )}

        {outputPreview && (
          <pre className='text-11px text-t-tertiary leading-16px mt-2px whitespace-pre-wrap break-words max-h-60px overflow-hidden bg-[var(--bg-2)] rounded-4px px-6px py-4px m-0 font-mono'>{outputPreview.slice(0, 300)}</pre>
        )}
      </div>
    </div>
  );
};

type TeamFeedViewProps = {
  feed: FeedEntry[];
  session: ResearchSession | null;
  /** Filter to specific event types */
  filterTypes?: string[];
  /** Whether to auto-scroll to bottom */
  autoScroll?: boolean;
};

const TeamFeedView: React.FC<TeamFeedViewProps> = ({ feed, session, filterTypes, autoScroll = true }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  const filteredFeed = useMemo(() => {
    if (!filterTypes || filterTypes.length === 0) return feed;
    return feed.filter((e) => filterTypes.includes(e.type));
  }, [feed, filterTypes]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (!autoScroll || userScrolledRef.current) return;
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [filteredFeed.length, autoScroll]);

  // Detect user scroll-up to pause auto-scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      userScrolledRef.current = !isAtBottom;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  if (filteredFeed.length === 0) {
    return <div className='text-center text-t-tertiary text-13px py-24px'>{t('researchTeam.emptyFeed')}</div>;
  }

  return (
    <div ref={containerRef} className='flex flex-col gap-2px overflow-y-auto h-full'>
      {filteredFeed.map((entry) => (
        <FeedItem key={entry.id} entry={entry} session={session} />
      ))}
    </div>
  );
};

export default TeamFeedView;
