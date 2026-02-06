/**
 * Bot detail page - renders the Guid (chat) interface within a BotContext.
 * Conversations created here are tagged with botId in metadata,
 * distinguishing them from regular assistant conversations.
 */

import type { IMezonBotConfig } from '@/channels/types';
import { ConfigStorage } from '@/common/storage';
import { BotContext } from '@/renderer/context/BotContext';
import Guid from '@/renderer/pages/guid';
import { Empty, Spin } from '@arco-design/web-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const BotDetailPage: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const [bot, setBot] = useState<IMezonBotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    setLoading(true);
    ConfigStorage.get('mezon.bots')
      .then((bots) => {
        const found = (bots || []).find((b: IMezonBotConfig) => b.id === botId);
        setBot(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [botId]);

  if (loading) {
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

  return (
    <BotContext.Provider value={{ botId, botName: bot.name, assistantId: bot.assistantId }}>
      <Guid />
    </BotContext.Provider>
  );
};

export default BotDetailPage;
