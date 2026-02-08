/**
 * Bots page - lists configured bots with their connection status.
 * Users can click a bot card to navigate to its detail page
 * which renders the Guid chat interface with botId context.
 */

import type { IChannelPluginStatus, IMezonBotConfig } from '@/channels/types';
import { ipcBridge } from '@/common';
import { channel } from '@/common/ipcBridge';
import type { TChatConversation } from '@/common/storage';
import { ConfigStorage } from '@/common/storage';
import { addEventListener } from '@/renderer/utils/emitter';
import { Button, Empty, Message, Switch } from '@arco-design/web-react';
import { Plus, Right, Robot } from '@icon-park/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface BotWithStatus extends IMezonBotConfig {
  pluginStatus?: IChannelPluginStatus;
  conversationCount: number;
}

const BotCard: React.FC<{
  bot: BotWithStatus;
  onClick: () => void;
  onStartStop: (botId: string, shouldStart: boolean) => Promise<void>;
}> = ({ bot, onClick, onStartStop }) => {
  const { t } = useTranslation();
  const [isToggling, setIsToggling] = useState(false);
  const isRunning = bot.pluginStatus?.status === 'running';

  return (
    <div className='bots-card' onClick={onClick}>
      <div className='bots-card__header'>
        <div className='bots-card__avatar'>
          <Robot theme='outline' size='20' fill='currentColor' />
        </div>
        <div className='bots-card__info'>
          <div className='bots-card__name'>{bot.name || t('bots.untitled', { defaultValue: 'Untitled Bot' })}</div>
          <div className='bots-card__meta'>
            {isRunning ? <span className='bots-card__status--running'>{t('bots.running', { defaultValue: 'Running' })}</span> : <span className='bots-card__status--stopped'>{t('bots.stopped', { defaultValue: 'Stopped' })}</span>}
            {bot.conversationCount > 0 && <span className='text-[var(--color-text-4)] text-12px'>{t('bots.conversationCount', { defaultValue: '{{count}} conversations', count: bot.conversationCount })}</span>}
          </div>
        </div>
        <div className='flex items-center gap-12px'>
          <Switch
            checked={isRunning}
            loading={isToggling}
            onChange={async (checked) => {
              setIsToggling(true);
              try {
                await onStartStop(bot.id, checked);
              } finally {
                setIsToggling(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className='bots-card__chevron'>
            <Right theme='outline' size='14' fill='currentColor' />
          </div>
        </div>
      </div>
    </div>
  );
};

function countBotConversations(conversations: TChatConversation[], botId: string): number {
  return conversations.filter((conv) => conv.extra?.botId === botId).length;
}

const BotsPage: React.FC = () => {
  const [bots, setBots] = useState<BotWithStatus[]>([]);
  const [conversations, setConversations] = useState<TChatConversation[]>([]);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Load conversations for counting
  const loadConversations = useCallback(() => {
    ipcBridge.database.getUserConversations
      .invoke({ page: 0, pageSize: 10000 })
      .then((data) => {
        setConversations(data && Array.isArray(data) ? data : []);
      })
      .catch(() => setConversations([]));
  }, []);

  useEffect(() => {
    loadConversations();
    return addEventListener('chat.history.refresh', loadConversations);
  }, [loadConversations]);

  const loadBots = useCallback(async () => {
    try {
      const savedBots = (await ConfigStorage.get('mezon.bots')) || [];
      let pluginStatuses: IChannelPluginStatus[] = [];
      try {
        const resp = await channel.getPluginStatus.invoke();
        if (resp?.data) {
          pluginStatuses = resp.data;
        }
      } catch {
        // Plugin status may not be available
      }

      const botsWithStatus: BotWithStatus[] = savedBots.map((bot: IMezonBotConfig) => {
        const pluginId = `mezon_${bot.id}`;
        const pluginStatus = pluginStatuses.find((p) => p.id === pluginId);
        return { ...bot, pluginStatus, conversationCount: 0 };
      });

      // Sort: enabled first, then by name
      botsWithStatus.sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setBots(botsWithStatus);
    } catch (error) {
      console.error('[BotsPage] Failed to load bots:', error);
      setBots([]);
    }
  }, []);

  useEffect(() => {
    loadBots().catch(console.error);
  }, [loadBots]);

  // Listen for plugin status changes
  useEffect(() => {
    const unsub = channel.pluginStatusChanged.on(() => {
      loadBots().catch(console.error);
    });
    return unsub;
  }, [loadBots]);

  // Merge conversation counts into bots
  const botsWithCounts = useMemo(() => {
    return bots.map((bot) => ({
      ...bot,
      conversationCount: countBotConversations(conversations, bot.id),
    }));
  }, [bots, conversations]);

  const handleBotClick = (bot: BotWithStatus) => {
    Promise.resolve(navigate(`/bots/${bot.id}`)).catch(console.error);
  };

  const handleStartStop = useCallback(
    async (botId: string, shouldStart: boolean) => {
      const pluginId = `mezon_${botId}`;
      try {
        if (shouldStart) {
          // Enable the plugin in the backend
          const result = await channel.enablePlugin.invoke({ pluginId, config: {} });
          if (!result.success) {
            if (result.msg && result.msg.includes('credential')) {
              Message.warning(t('bots.credentialsRequired', { defaultValue: 'Please configure credentials first' }));
            } else {
              Message.error(result.msg || t('bots.enableFailed', { defaultValue: 'Failed to enable bot' }));
            }
            return;
          }
        } else {
          // Disable the plugin in the backend
          const result = await channel.disablePlugin.invoke({ pluginId });
          if (!result.success) {
            Message.error(result.msg || t('bots.disableFailed', { defaultValue: 'Failed to disable bot' }));
            return;
          }
        }

        // Update config storage
        const savedBots = (await ConfigStorage.get('mezon.bots')) || [];
        const updatedBots = savedBots.map((bot: IMezonBotConfig) => (bot.id === botId ? { ...bot, enabled: shouldStart, updatedAt: Date.now() } : bot));
        await ConfigStorage.set('mezon.bots', updatedBots);

        Message.success(shouldStart ? t('bots.started', { defaultValue: 'Bot started' }) : t('bots.stopped', { defaultValue: 'Bot stopped' }));
        await loadBots(); // Reload to reflect changes
      } catch (error) {
        console.error('[BotsPage] Failed to toggle bot:', error);
        Message.error(t('bots.toggleError', { defaultValue: 'Failed to toggle bot' }));
      }
    },
    [loadBots, t]
  );

  return (
    <div className='bots-page size-full flex flex-col'>
      <div className='bots-page__content flex-1 overflow-y-auto'>
        <div className='mx-auto py-24px px-16px' style={{ width: 'clamp(var(--app-min-width, 360px), calc(100% - 32px), 680px)', maxWidth: '100%' }}>
          <div className='mb-20px flex items-center justify-between'>
            <div>
              <h2 className='text-18px font-600 text-[var(--color-text-1)] m-0'>{t('bots.title', { defaultValue: 'Bots' })}</h2>
              <p className='text-13px text-[var(--color-text-3)] mt-4px mb-0'>{t('bots.subtitle', { defaultValue: 'Auto-run assistants on messaging platforms' })}</p>
            </div>
            {botsWithCounts.length > 0 && (
              <Button type='outline' icon={<Plus theme='outline' size='14' />} shape='round' onClick={() => navigate('/settings/bots')}>
                {t('bots.addBot', { defaultValue: 'Add Bot' })}
              </Button>
            )}
          </div>
          {botsWithCounts.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-60px'>
              <Empty description={<span className='text-[var(--color-text-3)]'>{t('bots.empty', { defaultValue: 'No bots configured yet' })}</span>} />
              <Button type='outline' icon={<Plus theme='outline' size='14' />} shape='round' className='mt-16px' onClick={() => navigate('/settings/bots')}>
                {t('bots.addBot', { defaultValue: 'Add Bot' })}
              </Button>
            </div>
          ) : (
            <div className='flex flex-col gap-10px'>
              {botsWithCounts.map((bot) => (
                <BotCard key={bot.id} bot={bot} onClick={() => handleBotClick(bot)} onStartStop={handleStartStop} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BotsPage;
