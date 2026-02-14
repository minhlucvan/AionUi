/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConversationProvider } from '@/renderer/context/ConversationContext';
import type { AcpBackend } from '@/types/acpTypes';
import FlexFullContainer from '@renderer/components/FlexFullContainer';
import MessageList from '@renderer/messages/MessageList';
import { beforeUpdateMessageList, MessageListProvider, useMessageLstCache } from '@renderer/messages/hooks';
import HOC from '@renderer/utils/HOC';
import React, { useEffect } from 'react';
import { useTeamMonitor } from '@/renderer/context/TeamMonitorContext';
import type { TMessage } from '@/common/chatLib';
import ConversationChatConfirm from '../components/ConversationChatConfirm';
import AcpSendBox from './AcpSendBox';

const AcpChat: React.FC<{
  conversation_id: string;
  workspace?: string;
  backend: AcpBackend;
}> = ({ conversation_id, workspace, backend }) => {
  useMessageLstCache(conversation_id);
  const teamMonitor = useTeamMonitor();

  // Filter out team coordination messages in team mode
  // Only show team lead's main conversation, hide subagent spawning/management
  useEffect(() => {
    if (!teamMonitor.isTeamActive) return;

    const cleanup = beforeUpdateMessageList((messages: TMessage[]) => {
      return messages.filter((msg) => {
        // Filter out team-related tool calls (Task spawning, team coordination)
        if (msg.type === 'acp_tool_call' || msg.type === 'tool_call') {
          const toolName = (msg.type === 'acp_tool_call' && msg.content?.update?.title) || (msg.type === 'tool_call' && msg.content?.name) || '';

          const lowerName = toolName.toLowerCase();

          // Hide team coordination tools from main chat
          if (lowerName.includes('task') || lowerName.includes('teammate') || lowerName.includes('spawn') || lowerName.includes('send_message') || lowerName.includes('mailbox')) {
            return false; // Hide team coordination messages
          }
        }

        return true; // Show all other messages
      });
    });

    return cleanup;
  }, [teamMonitor.isTeamActive]);

  return (
    <ConversationProvider value={{ conversationId: conversation_id, workspace, type: 'acp' }}>
      <div className='flex-1 flex flex-col px-20px'>
        <FlexFullContainer>
          <MessageList className='flex-1'></MessageList>
        </FlexFullContainer>
        <ConversationChatConfirm conversation_id={conversation_id}>
          <AcpSendBox conversation_id={conversation_id} backend={backend}></AcpSendBox>
        </ConversationChatConfirm>
      </div>
    </ConversationProvider>
  );
};

export default HOC(MessageListProvider)(AcpChat);
