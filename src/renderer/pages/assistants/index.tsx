/**
 * Assistants page - lists agents grouped by backend with their conversations.
 * Users can click an agent card to expand/collapse its conversations,
 * then click a conversation to navigate to it.
 */

import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/storage';
import { addEventListener } from '@/renderer/utils/emitter';
import { ACP_BACKENDS_ALL } from '@/types/acpTypes';
import type { AcpBackend } from '@/types/acpTypes';
import { Empty } from '@arco-design/web-react';
import { Down, MessageOne, Robot } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import AuggieLogo from '@/renderer/assets/logos/auggie.svg';
import ClaudeLogo from '@/renderer/assets/logos/claude.svg';
import CodexLogo from '@/renderer/assets/logos/codex.svg';
import GeminiLogo from '@/renderer/assets/logos/gemini.svg';
import GitHubLogo from '@/renderer/assets/logos/github.svg';
import GooseLogo from '@/renderer/assets/logos/goose.svg';
import IflowLogo from '@/renderer/assets/logos/iflow.svg';
import KimiLogo from '@/renderer/assets/logos/kimi.svg';
import OpenCodeLogo from '@/renderer/assets/logos/opencode.svg';
import QoderLogo from '@/renderer/assets/logos/qoder.png';
import QwenLogo from '@/renderer/assets/logos/qwen.svg';

const AGENT_LOGO_MAP: Partial<Record<AcpBackend | 'gemini', string>> = {
  claude: ClaudeLogo,
  gemini: GeminiLogo,
  qwen: QwenLogo,
  codex: CodexLogo,
  iflow: IflowLogo,
  goose: GooseLogo,
  auggie: AuggieLogo,
  kimi: KimiLogo,
  opencode: OpenCodeLogo,
  copilot: GitHubLogo,
  qoder: QoderLogo,
};

type AgentKey = string;

interface AgentGroup {
  key: AgentKey;
  name: string;
  logo?: string;
  emoji?: string;
  conversations: TChatConversation[];
  runningCount: number;
}

function resolveAgentKey(conv: TChatConversation): AgentKey {
  if (conv.type === 'gemini') {
    return conv.extra?.presetAssistantId || 'gemini';
  }
  if (conv.type === 'acp') {
    return conv.extra?.presetAssistantId || conv.extra?.customAgentId || conv.extra?.backend || 'acp';
  }
  if (conv.type === 'codex') {
    return conv.extra?.presetAssistantId || 'codex';
  }
  return 'unknown';
}

function resolveAgentName(conv: TChatConversation): string {
  if (conv.type === 'acp') {
    const backend = conv.extra?.backend;
    const agentName = conv.extra?.agentName;
    if (agentName) return agentName;
    if (backend && backend !== 'custom') {
      return ACP_BACKENDS_ALL[backend as keyof typeof ACP_BACKENDS_ALL]?.name || backend;
    }
    return backend || 'Agent';
  }
  if (conv.type === 'gemini') return 'Gemini';
  if (conv.type === 'codex') return 'Codex';
  return 'Agent';
}

function resolveAgentLogo(conv: TChatConversation): { logo?: string; emoji?: string } {
  if (conv.type === 'gemini') return { logo: AGENT_LOGO_MAP.gemini };
  if (conv.type === 'codex') return { logo: AGENT_LOGO_MAP.codex };
  if (conv.type === 'acp') {
    const backend = conv.extra?.backend;
    if (backend && AGENT_LOGO_MAP[backend as AcpBackend]) {
      return { logo: AGENT_LOGO_MAP[backend as AcpBackend] };
    }
  }
  return {};
}

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

function groupConversationsByAgent(conversations: TChatConversation[]): AgentGroup[] {
  const groups = new Map<AgentKey, AgentGroup>();

  for (const conv of conversations) {
    const key = resolveAgentKey(conv);
    if (!groups.has(key)) {
      const { logo, emoji } = resolveAgentLogo(conv);
      groups.set(key, {
        key,
        name: resolveAgentName(conv),
        logo,
        emoji,
        conversations: [],
        runningCount: 0,
      });
    }
    const group = groups.get(key)!;
    group.conversations.push(conv);
    if (conv.status === 'running') {
      group.runningCount++;
    }
  }

  const result = Array.from(groups.values());
  result.sort((a, b) => {
    if (a.runningCount > 0 && b.runningCount === 0) return -1;
    if (a.runningCount === 0 && b.runningCount > 0) return 1;
    const aLatest = Math.max(...a.conversations.map((c) => c.modifyTime || c.createTime));
    const bLatest = Math.max(...b.conversations.map((c) => c.modifyTime || c.createTime));
    return bLatest - aLatest;
  });

  return result;
}

const AgentCard: React.FC<{
  group: AgentGroup;
  expanded: boolean;
  onToggle: () => void;
  onSelectConversation: (conv: TChatConversation) => void;
  activeConversationId?: string;
}> = ({ group, expanded, onToggle, onSelectConversation, activeConversationId }) => {
  const { t } = useTranslation();

  const sortedConversations = useMemo(
    () => [...group.conversations].sort((a, b) => (b.modifyTime || b.createTime) - (a.modifyTime || a.createTime)),
    [group.conversations]
  );

  return (
    <div className='assistants-agent-card'>
      <div className='assistants-agent-card__header' onClick={onToggle}>
        <div className='assistants-agent-card__avatar'>
          {group.logo ? (
            <img src={group.logo} alt={group.name} className='size-full object-contain' />
          ) : group.emoji ? (
            <span className='text-20px lh-1'>{group.emoji}</span>
          ) : (
            <Robot theme='outline' size='20' fill='currentColor' />
          )}
        </div>
        <div className='assistants-agent-card__info'>
          <div className='assistants-agent-card__name'>{group.name}</div>
          <div className='assistants-agent-card__meta'>
            {group.runningCount > 0 && (
              <span className='assistants-agent-card__status assistants-agent-card__status--running'>
                {t('assistants.running', { defaultValue: 'Running', count: group.runningCount })}
              </span>
            )}
            <span className='text-[var(--color-text-3)] text-12px'>
              {t('assistants.conversationCount', { defaultValue: '{{count}} conversations', count: group.conversations.length })}
            </span>
          </div>
        </div>
        <div className={classNames('assistants-agent-card__chevron', { 'assistants-agent-card__chevron--expanded': expanded })}>
          <Down theme='outline' size='14' fill='currentColor' />
        </div>
      </div>
      {expanded && (
        <div className='assistants-agent-card__conversations'>
          {sortedConversations.map((conv) => (
            <div
              key={conv.id}
              className={classNames('assistants-conversation-item', {
                'assistants-conversation-item--active': conv.id === activeConversationId,
              })}
              onClick={() => onSelectConversation(conv)}
            >
              <MessageOne theme='outline' size='16' className='shrink-0 lh-0' style={{ color: 'var(--color-text-3)' }} />
              <span className='truncate flex-1 text-[var(--color-text-1)]'>{conv.name || t('assistants.untitled', { defaultValue: 'Untitled' })}</span>
              <span className='shrink-0 text-11px text-[var(--color-text-4)]'>{formatRelativeTime(conv.modifyTime || conv.createTime)}</span>
              {conv.status === 'running' && <span className='assistants-conversation-item__badge' />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AssistantsPage: React.FC = () => {
  const [conversations, setConversations] = useState<TChatConversation[]>([]);
  const [expandedAgents, setExpandedAgents] = useState<Set<AgentKey>>(new Set());
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: activeConversationId } = useParams();

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
        console.error('[AssistantsPage] Failed to load conversations:', error);
        setConversations([]);
      });
  }, []);

  useEffect(() => {
    loadConversations();
    return addEventListener('chat.history.refresh', loadConversations);
  }, [loadConversations]);

  const agentGroups = useMemo(() => groupConversationsByAgent(conversations), [conversations]);

  // Auto-expand agents with running conversations
  useEffect(() => {
    const runningKeys = agentGroups.filter((g) => g.runningCount > 0).map((g) => g.key);
    if (runningKeys.length > 0) {
      setExpandedAgents((prev) => {
        const next = new Set(prev);
        for (const key of runningKeys) {
          next.add(key);
        }
        return next;
      });
    }
  }, [agentGroups]);

  const handleToggleAgent = (key: AgentKey) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectConversation = (conv: TChatConversation) => {
    Promise.resolve(navigate(`/conversation/${conv.id}`)).catch((error) => {
      console.error('Navigation failed:', error);
    });
  };

  return (
    <div className='assistants-page size-full flex flex-col'>
      <div className='assistants-page__content flex-1 overflow-y-auto'>
        <div
          className='mx-auto py-24px px-16px'
          style={{ width: 'clamp(var(--app-min-width, 360px), calc(100% - 32px), 680px)', maxWidth: '100%' }}
        >
          <div className='mb-20px'>
            <h2 className='text-18px font-600 text-[var(--color-text-1)] m-0'>{t('assistants.title', { defaultValue: 'Assistants' })}</h2>
            <p className='text-13px text-[var(--color-text-3)] mt-4px mb-0'>{t('assistants.subtitle', { defaultValue: 'Active agents and their conversations' })}</p>
          </div>
          {agentGroups.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-60px'>
              <Empty
                description={
                  <span className='text-[var(--color-text-3)]'>
                    {t('assistants.empty', { defaultValue: 'No conversations yet' })}
                  </span>
                }
              />
            </div>
          ) : (
            <div className='flex flex-col gap-10px'>
              {agentGroups.map((group) => (
                <AgentCard
                  key={group.key}
                  group={group}
                  expanded={expandedAgents.has(group.key)}
                  onToggle={() => handleToggleAgent(group.key)}
                  onSelectConversation={handleSelectConversation}
                  activeConversationId={activeConversationId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantsPage;
