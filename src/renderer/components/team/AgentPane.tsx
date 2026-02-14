/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentOutput, TeamMember } from '@/common/teamMonitor';
import React from 'react';
import { MessageListProvider } from '@/renderer/messages/hooks';
import MessageList from '@/renderer/messages/MessageList';
import FlexFullContainer from '@/renderer/components/FlexFullContainer';

// Exact same structure as AcpChat - no wrapper, no border, just the chat
const AgentPane: React.FC<{
  member: TeamMember;
  output?: AgentOutput;
  isSelected?: boolean;
  onSelect?: () => void;
}> = ({ output }) => {
  // Each agent gets its own MessageListProvider instance with its own messages
  const messages = (output?.messages || []) as Array<Record<string, unknown>>;

  return (
    <MessageListProvider value={messages}>
      <div className='flex-1 flex flex-col px-20px'>
        <FlexFullContainer>
          <MessageList className='flex-1' />
        </FlexFullContainer>
      </div>
    </MessageListProvider>
  );
};

export default AgentPane;
