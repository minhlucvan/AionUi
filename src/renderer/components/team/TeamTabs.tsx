/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { TEAM_TAB_CHAT, TEAM_TAB_TASKS, useTeamMonitor } from '@/renderer/context/TeamMonitorContext';
import { iconColors } from '@/renderer/theme/colors';
import { Tag, Tooltip } from '@arco-design/web-react';
import { Peoples, ListView } from '@icon-park/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TabFadeState {
  left: boolean;
  right: boolean;
}

const TAB_OVERFLOW_THRESHOLD = 10;

/**
 * TeamTabs displays team member + task tabs in the ConversationTabs style.
 * When team mode is active, this replaces or supplements the conversation tab bar.
 *
 * Tabs: [Chat] [Agent1] [Agent2] ... [Tasks]
 */
const TeamTabs: React.FC = () => {
  const { t } = useTranslation();
  const { teamName, members, tasks, activeTab, setActiveTab } = useTeamMonitor();
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [tabFadeState, setTabFadeState] = useState<TabFadeState>({ left: false, right: false });

  const updateTabOverflow = useCallback(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const hasOverflow = scrollWidth > clientWidth + 1;

    const nextState: TabFadeState = {
      left: hasOverflow && scrollLeft > TAB_OVERFLOW_THRESHOLD,
      right: hasOverflow && scrollLeft + clientWidth < scrollWidth - TAB_OVERFLOW_THRESHOLD,
    };

    setTabFadeState((prev) => {
      if (prev.left === nextState.left && prev.right === nextState.right) return prev;
      return nextState;
    });
  }, []);

  useEffect(() => {
    updateTabOverflow();
  }, [updateTabOverflow, members.length]);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleScroll = () => updateTabOverflow();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateTabOverflow);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateTabOverflow());
      resizeObserver.observe(container);
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateTabOverflow);
      resizeObserver?.disconnect();
    };
  }, [updateTabOverflow]);

  const inProgressCount = tasks.filter((t) => t.state === 'in_progress').length;
  const { left: showLeftFade, right: showRightFade } = tabFadeState;

  const tabClass = (tabId: string) => `flex items-center gap-6px px-12px h-full flex-1 cursor-pointer transition-all duration-200 border-r border-[color:var(--border-base)] ${tabId === activeTab ? 'bg-1 text-[color:var(--color-text-1)] font-medium' : 'bg-2 text-[color:var(--color-text-3)] hover:text-[color:var(--color-text-2)] border-b border-[color:var(--border-base)]'}`;

  return (
    <div className='relative shrink-0 bg-2 min-h-36px'>
      <div className='relative flex items-center h-36px w-full border-t border-x border-solid border-[color:var(--border-base)]'>
        {/* Tabs scrolling area */}
        <div ref={tabsContainerRef} className='flex items-center h-full flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'>
          {/* Chat tab (always first) */}
          <Tooltip content={teamName || t('teamMonitor.team')} position='bottom'>
            <div className={tabClass(TEAM_TAB_CHAT)} style={{ borderRight: '1px solid var(--border-base)' }} onClick={() => setActiveTab(TEAM_TAB_CHAT)}>
              <Peoples theme='outline' size='14' fill={activeTab === TEAM_TAB_CHAT ? iconColors.primary : iconColors.secondary} />
              <span className='text-13px whitespace-nowrap overflow-hidden text-ellipsis select-none'>{t('teamMonitor.chatTab')}</span>
            </div>
          </Tooltip>

          {/* Agent member tabs */}
          {members.map((member) => {
            const tabId = member.agentId || member.name;
            const statusColor = member.status === 'active' ? 'rgb(var(--arcoblue-6))' : member.status === 'finished' ? 'rgb(var(--green-6))' : 'rgb(var(--gray-6))';
            return (
              <Tooltip key={tabId} content={`${member.name} (${member.role || member.status})`} position='bottom'>
                <div className={tabClass(tabId)} style={{ borderRight: '1px solid var(--border-base)' }} onClick={() => setActiveTab(tabId)}>
                  <span className='inline-block w-6px h-6px rounded-full shrink-0' style={{ backgroundColor: statusColor }} />
                  <span className='text-13px whitespace-nowrap overflow-hidden text-ellipsis select-none'>{member.name}</span>
                  {member.role === 'lead' && (
                    <Tag size='small' color='gold' className='shrink-0'>
                      {t('teamMonitor.lead')}
                    </Tag>
                  )}
                </div>
              </Tooltip>
            );
          })}

          {/* Tasks tab (always last) */}
          <Tooltip content={t('teamMonitor.taskList')} position='bottom'>
            <div className={tabClass(TEAM_TAB_TASKS)} style={{ borderRight: '1px solid var(--border-base)' }} onClick={() => setActiveTab(TEAM_TAB_TASKS)}>
              <ListView theme='outline' size='14' fill={activeTab === TEAM_TAB_TASKS ? iconColors.primary : iconColors.secondary} />
              <span className='text-13px whitespace-nowrap overflow-hidden text-ellipsis select-none'>{t('teamMonitor.taskList')}</span>
              {inProgressCount > 0 && (
                <Tag size='small' color='arcoblue' className='shrink-0'>
                  {inProgressCount}
                </Tag>
              )}
            </div>
          </Tooltip>
        </div>

        {/* Fade indicators */}
        {showLeftFade && <div className='pointer-events-none absolute left-0 top-0 bottom-0 w-32px [background:linear-gradient(90deg,var(--bg-2)_0%,transparent_100%)]' />}
        {showRightFade && <div className='pointer-events-none absolute right-0 top-0 bottom-0 w-32px [background:linear-gradient(270deg,var(--bg-2)_0%,transparent_100%)]' />}
      </div>
    </div>
  );
};

export default TeamTabs;
