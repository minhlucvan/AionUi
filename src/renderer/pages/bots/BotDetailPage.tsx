/**
 * Bot detail page - shows conversations filtered by a specific bot.
 * Matches conversations via the bot's assistantId linking to
 * conversation extra.presetAssistantId or extra.customAgentId.
 */

import type { IChannelPluginStatus, IMezonBotConfig } from '@/channels/types';
import { ipcBridge } from '@/common';
import { channel } from '@/common/ipcBridge';
import type { TChatConversation } from '@/common/storage';
import { ConfigStorage } from '@/common/storage';
import { addEventListener } from '@/renderer/utils/emitter';
import { Empty } from '@arco-design/web-react';
import { Left, MessageOne, Robot } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function matchesBotAssistant(conv: TChatConversation, assistantId: string): boolean {
  if (conv.type === 'acp') {
    return conv.extra?.presetAssistantId === assistantId || conv.extra?.customAgentId === assistantId;
  }
  if (conv.type === 'gemini') {
    return conv.extra?.presetAssistantId === assistantId;
  }
  if (conv.type === 'codex') {
    return conv.extra?.presetAssistantId === assistantId;
  }
  return false;
}

const BotDetailPage: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const [bot, setBot] = useState<IMezonBotConfig | null>(null);
  const [pluginStatus, setPluginStatus] = useState<IChannelPluginStatus | null>(null);
  const [conversations, setConversations] = useState<TChatConversation[]>([]);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Load bot config
  useEffect(() => {
    ConfigStorage.get('mezon.bots')
      .then((bots) => {
        const found = (bots || []).find((b: IMezonBotConfig) => b.id === botId);
        setBot(found || null);
      })
      .catch(console.error);
  }, [botId]);

  // Load plugin status
  const loadPluginStatus = useCallback(async () => {
    if (!botId) return;
    try {
      const resp = await channel.getPluginStatus.invoke();
      if (resp?.data) {
        const pluginId = `mezon_${botId}`;
        const status = resp.data.find((p) => p.id === pluginId);
        setPluginStatus(status || null);
      }
    } catch {
      // Plugin status may not be available
    }
  }, [botId]);

  useEffect(() => {
    loadPluginStatus().catch(console.error);
    const unsub = channel.pluginStatusChanged.on(() => {
      loadPluginStatus().catch(console.error);
    });
    return unsub;
  }, [loadPluginStatus]);

  // Load conversations
  const loadConversations = useCallback(() => {
    ipcBridge.database.getUserConversations
      .invoke({ page: 0, pageSize: 10000 })
      .then((data) => {
        if (data && Array.isArray(data)) {
          setConversations(data);
        } else {
          setConversations([]);
        }
      })
      .catch((error) => {
        console.error('[BotDetailPage] Failed to load conversations:', error);
        setConversations([]);
      });
  }, []);

  useEffect(() => {
    loadConversations();
    return addEventListener('chat.history.refresh', loadConversations);
  }, [loadConversations]);

  // Filter conversations by bot's assistant
  const filteredConversations = useMemo(() => {
    if (!bot?.assistantId) return [];
    return conversations
      .filter((conv) => matchesBotAssistant(conv, bot.assistantId!))
      .sort((a, b) => (b.modifyTime || b.createTime) - (a.modifyTime || a.createTime));
  }, [conversations, bot]);

  const isRunning = pluginStatus?.status === 'running';

  const handleSelectConversation = (conv: TChatConversation) => {
    Promise.resolve(navigate(`/conversation/${conv.id}`)).catch(console.error);
  };

  const handleBack = () => {
    Promise.resolve(navigate('/bots')).catch(console.error);
  };

  if (!bot) {
    return (
      <div className='size-full flex items-center justify-center'>
        <Empty description={<span className='text-[var(--color-text-3)]'>{t('bots.notFound', { defaultValue: 'Bot not found' })}</span>} />
      </div>
    );
  }

  return (
    <div className='bots-page size-full flex flex-col'>
      <div className='bots-page__content flex-1 overflow-y-auto'>
        <div
          className='mx-auto py-24px px-16px'
          style={{ width: 'clamp(var(--app-min-width, 360px), calc(100% - 32px), 680px)', maxWidth: '100%' }}
        >
          <button type='button' className='bots-detail__back' onClick={handleBack}>
            <Left theme='outline' size='14' fill='currentColor' />
            <span>{t('bots.backToList', { defaultValue: 'All Bots' })}</span>
          </button>

          <div className='bots-detail__hero'>
            <div className='bots-detail__hero-avatar'>
              <Robot theme='outline' size='24' fill='currentColor' />
            </div>
            <div className='flex-1 min-w-0'>
              <h2 className='text-18px font-600 text-[var(--color-text-1)] m-0'>{bot.name}</h2>
              <div className='flex items-center gap-8px mt-4px'>
                {isRunning ? (
                  <span className='bots-card__status--running'>
                    {t('bots.running', { defaultValue: 'Running' })}
                  </span>
                ) : (
                  <span className='bots-card__status--stopped'>
                    {t('bots.stopped', { defaultValue: 'Stopped' })}
                  </span>
                )}
                {pluginStatus?.botUsername && (
                  <span className='text-[var(--color-text-4)] text-12px'>@{pluginStatus.botUsername}</span>
                )}
              </div>
            </div>
          </div>

          <div className='mb-12px'>
            <span className='text-13px text-[var(--color-text-3)]'>
              {t('bots.conversationCount', { defaultValue: '{{count}} conversations', count: filteredConversations.length })}
            </span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-40px'>
              <Empty
                description={
                  <span className='text-[var(--color-text-3)]'>
                    {t('bots.noConversations', { defaultValue: 'No conversations yet' })}
                  </span>
                }
              />
            </div>
          ) : (
            <div className='flex flex-col gap-2px'>
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={classNames('bots-conversation-item')}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <MessageOne theme='outline' size='16' className='shrink-0 lh-0' style={{ color: 'var(--color-text-3)' }} />
                  <span className='truncate flex-1 text-[var(--color-text-1)]'>{conv.name || t('bots.untitled', { defaultValue: 'Untitled' })}</span>
                  <span className='shrink-0 text-11px text-[var(--color-text-4)]'>{formatRelativeTime(conv.modifyTime || conv.createTime)}</span>
                  {conv.status === 'running' && <span className='bots-conversation-item__badge' />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotDetailPage;
