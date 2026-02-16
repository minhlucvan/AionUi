/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { useResearchTeam } from '@/renderer/context/ResearchTeamContext';
import { Tag, Tabs, Input } from '@arco-design/web-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TeamFeedView from './TeamFeedView';
import TeamTaskBoardView from './TeamTaskBoardView';

type TabKey = 'board' | 'feed';

/**
 * ResearchTeamPanel — Main container for the research team feedback loop UI.
 *
 * Two views:
 * 1. Board — shows each agent as a card with task state, feedback loop connections,
 *    and message counts. Agents process tasks and feed results to each other.
 * 2. Feed — chronological stream of all events and commands between agents.
 *    Real-time view of the feedback loop in action.
 */
const ResearchTeamPanel: React.FC = () => {
  const { t } = useTranslation();
  const { session, feed, isActive, sendMessage } = useResearchTeam();
  const [activeTab, setActiveTab] = useState<TabKey>('board');
  const [messageTarget, setMessageTarget] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const runningCount = useMemo(() => session?.agents.filter((a) => a.status === 'running').length ?? 0, [session]);
  const feedCount = feed.length;

  // Filter out high-frequency agent_output for the main feed view
  const significantFeed = useMemo(() => {
    return feed.filter((e) => e.type !== 'agent_output');
  }, [feed]);

  const handleSendMessage = useCallback(
    (agentId: string) => {
      setMessageTarget(agentId);
    },
    []
  );

  const handleSubmitMessage = useCallback(async () => {
    if (!messageTarget || !messageInput.trim()) return;
    await sendMessage(messageTarget, messageInput.trim());
    setMessageInput('');
    setMessageTarget(null);
  }, [messageTarget, messageInput, sendMessage]);

  const targetAgentName = useMemo(() => {
    if (!messageTarget || !session) return '';
    const agent = session.agents.find((a) => a.id === messageTarget);
    return agent?.name ?? messageTarget.slice(0, 8);
  }, [messageTarget, session]);

  return (
    <div className='flex flex-col h-full overflow-hidden'>
      {/* Header */}
      <div className='flex items-center gap-8px px-12px py-6px border-b border-[var(--bg-3)] shrink-0'>
        <span className='text-14px font-medium text-t-primary'>{t('researchTeam.title')}</span>
        <div className='flex items-center gap-4px ml-auto'>
          {isActive && (
            <Tag size='small' color='green'>
              {t('researchTeam.active')}
            </Tag>
          )}
          {session && (
            <Tag size='small' color='arcoblue'>
              {session.agents.length} {t('researchTeam.agents')}
            </Tag>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs activeTab={activeTab} onChange={(key) => setActiveTab(key as TabKey)} size='small' className='team-panel-tabs'>
        <Tabs.TabPane
          key='board'
          title={
            <span className='flex items-center gap-4px'>
              {t('researchTeam.taskBoard')}
              {runningCount > 0 && (
                <Tag size='small' color='arcoblue'>
                  {runningCount}
                </Tag>
              )}
            </span>
          }
        >
          <div className='overflow-y-auto p-8px' style={{ height: 'calc(100% - 8px)' }}>
            <TeamTaskBoardView session={session} feed={feed} onSendMessage={handleSendMessage} />
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane
          key='feed'
          title={
            <span className='flex items-center gap-4px'>
              {t('researchTeam.feed')}
              {feedCount > 0 && (
                <Tag size='small' color='gray'>
                  {significantFeed.length}
                </Tag>
              )}
            </span>
          }
        >
          <div className='overflow-hidden p-4px' style={{ height: 'calc(100% - 8px)' }}>
            <TeamFeedView feed={significantFeed} session={session} autoScroll />
          </div>
        </Tabs.TabPane>
      </Tabs>

      {/* Inline message input (shown when sending a message to an agent) */}
      {messageTarget && (
        <div className='flex items-center gap-8px px-12px py-8px border-t border-[var(--bg-3)] shrink-0 bg-[var(--bg-2)]'>
          <span className='text-12px text-t-secondary shrink-0'>
            {t('researchTeam.messageTo', { agent: targetAgentName })}
          </span>
          <Input
            size='small'
            className='flex-1'
            value={messageInput}
            onChange={setMessageInput}
            onPressEnter={handleSubmitMessage}
            placeholder={t('researchTeam.messageInputPlaceholder')}
            autoFocus
          />
          <button className='text-12px text-[rgb(var(--arcoblue-6))] bg-transparent border-none cursor-pointer p-0 shrink-0' onClick={handleSubmitMessage}>
            {t('researchTeam.send')}
          </button>
          <button
            className='text-12px text-t-tertiary bg-transparent border-none cursor-pointer p-0 shrink-0'
            onClick={() => {
              setMessageTarget(null);
              setMessageInput('');
            }}
          >
            {t('researchTeam.cancel')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ResearchTeamPanel;
