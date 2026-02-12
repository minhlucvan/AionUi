/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITeamDefinition, ITeamMemberDefinition, ITeamSession } from '@/common/team';
import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/storage';
import { resolveLocaleKey } from '@/common/utils';
import { TeamProvider, useTeamContext } from '@/renderer/context/TeamContext';
import type { AcpBackendConfig } from '@/types/acpTypes';
import { Empty, Spin } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import { useTranslation, getI18n } from 'react-i18next';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';
import ChatConversation from '../conversation/ChatConversation';
import TeamHeader from './TeamHeader';
import TeamMemberTabs from './TeamMemberTabs';

/**
 * Inner component that renders the active member's conversation
 * Must be inside TeamProvider to use useTeamContext
 */
const TeamConversationContent: React.FC = () => {
  const { definition, activeMemberId, activeConversationId, switchMember } = useTeamContext();

  // Load the active member's conversation
  const { data: conversation, isLoading } = useSWR(
    activeConversationId ? `team-conversation/${activeConversationId}` : null,
    () => ipcBridge.conversation.get.invoke({ id: activeConversationId }),
    { revalidateOnFocus: false }
  );

  return (
    <div className='flex flex-col size-full'>
      <TeamHeader />
      <TeamMemberTabs members={definition.members} activeMemberId={activeMemberId} onSwitchMember={switchMember} />
      <div className='flex-1 overflow-hidden'>
        {isLoading ? (
          <div className='size-full flex items-center justify-center'>
            <Spin />
          </div>
        ) : conversation ? (
          <ChatConversation key={activeConversationId} conversation={conversation} />
        ) : (
          <div className='size-full flex items-center justify-center'>
            <Empty description='Member conversation not available' />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Team conversation page - loads team session and definition,
 * then renders member tabs with chat conversations
 */
const TeamConversationPage: React.FC = () => {
  const { teamSessionId } = useParams<{ teamSessionId: string }>();
  const { t } = useTranslation();
  const [session, setSession] = useState<ITeamSession | null>(null);
  const [definition, setDefinition] = useState<ITeamDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamSessionId) {
      setLoading(false);
      setError('No team session ID');
      return;
    }

    const loadSession = async () => {
      setLoading(true);
      try {
        // Load session from backend
        const result = await ipcBridge.team.getSession.invoke({ sessionId: teamSessionId });
        if (!result.success || !result.data) {
          setError(t('teams.sessionNotFound', { defaultValue: 'Team session not found' }));
          return;
        }
        setSession(result.data);

        // Load team definition from custom agents (team assistants)
        const customAgents: AcpBackendConfig[] = (await ConfigStorage.get('acp.customAgents')) || [];
        const teamAgentId = result.data!.teamDefinitionId;
        const customAgent = customAgents.find((a: AcpBackendConfig) => a.id === teamAgentId);
        if (!customAgent?.teamMembers) {
          setError(t('teams.definitionNotFound', { defaultValue: 'Team definition not found' }));
          return;
        }
        const localeKey = resolveLocaleKey(getI18n().language || 'en-US');
        const teamDef: ITeamDefinition = {
          id: customAgent.id,
          name: customAgent.nameI18n?.[localeKey] || customAgent.name,
          icon: customAgent.avatar,
          description: customAgent.description,
          members: customAgent.teamMembers as ITeamMemberDefinition[],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setDefinition(teamDef);
      } catch (err) {
        console.error('[TeamConversationPage] Failed to load:', err);
        setError(t('teams.loadError', { defaultValue: 'Failed to load team session' }));
      } finally {
        setLoading(false);
      }
    };

    loadSession().catch(console.error);
  }, [teamSessionId, t]);

  if (loading) {
    return (
      <div className='size-full flex items-center justify-center'>
        <Spin size={32} />
      </div>
    );
  }

  if (error || !session || !definition) {
    return (
      <div className='size-full flex items-center justify-center'>
        <Empty description={<span className='text-[var(--color-text-3)]'>{error || 'Unknown error'}</span>} />
      </div>
    );
  }

  return (
    <TeamProvider session={session} definition={definition}>
      <TeamConversationContent />
    </TeamProvider>
  );
};

export default TeamConversationPage;
