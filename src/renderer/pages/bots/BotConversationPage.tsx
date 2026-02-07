/**
 * Bot conversation page - renders a conversation within a BotContext.
 */

import type { IMezonBotConfig } from '@/channels/types';
import { ConfigStorage } from '@/common/storage';
import { BotContext } from '@/renderer/context/BotContext';
import ChatConversation from '@/renderer/pages/conversation/ChatConversation';
import { Empty, Spin } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';
import { ipcBridge } from '@/common';

const BotConversationPage: React.FC = () => {
  const { botId, conversationId } = useParams<{ botId: string; conversationId: string }>();
  const [bot, setBot] = useState<IMezonBotConfig | null>(null);
  const [loadingBot, setLoadingBot] = useState(true);
  const { t } = useTranslation();

  // Load bot config
  useEffect(() => {
    setLoadingBot(true);
    ConfigStorage.get('mezon.bots')
      .then((bots) => {
        const found = (bots || []).find((b: IMezonBotConfig) => b.id === botId);
        setBot(found || null);
      })
      .catch(console.error)
      .finally(() => setLoadingBot(false));
  }, [botId]);

  // Load conversation
  const { data: conversation, isLoading: loadingConversation } = useSWR(conversationId ? `conversation/${conversationId}` : null, () => {
    return ipcBridge.conversation.get.invoke({ id: conversationId! });
  });

  if (loadingBot || loadingConversation) {
    return (
      <div className='size-full flex items-center justify-center'>
        <Spin />
      </div>
    );
  }

  if (!bot || !botId) {
    return (
      <div className='size-full flex items-center justify-center'>
        <Empty description={<span className='text-[var(--color-text-3)]'>{t('bots.notFound', { defaultValue: 'Bot not found' })}</span>} />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className='size-full flex items-center justify-center'>
        <Empty description={<span className='text-[var(--color-text-3)]'>{t('conversation.notFound', { defaultValue: 'Conversation not found' })}</span>} />
      </div>
    );
  }

  return (
    <BotContext.Provider value={{ botId, botName: bot.name, assistantId: bot.assistantId }}>
      <ChatConversation conversation={conversation} />
    </BotContext.Provider>
  );
};

export default BotConversationPage;
