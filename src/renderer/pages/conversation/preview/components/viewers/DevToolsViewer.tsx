/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DevTools session analysis viewer — displays Claude Code session insights
 * including token attribution, compaction events, tool usage, and timing data.
 * Inspired by claude-devtools (https://github.com/matt1398/claude-devtools).
 */

import { ipcBridge } from '@/common';
import type { IDevToolsSessionAnalysis, IDevToolsCompactionEvent, IDevToolsToolSummary } from '@/common/ipcBridge';
import { Progress, Spin, Statistic, Tag, Timeline, Tooltip, Typography, Empty } from '@arco-design/web-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DevToolsViewerProps = {
  /** JSON-encoded metadata: { sessionId, workspace } */
  content: string;
};

type TokenCategory = 'user' | 'assistant' | 'thinking' | 'tool_input' | 'tool_output' | 'system' | 'claude_md';

const TOKEN_COLORS: Record<TokenCategory, string> = {
  user: '#3491FA',
  assistant: '#0FC6C2',
  thinking: '#F7BA1E',
  tool_input: '#722ED1',
  tool_output: '#9FDB1D',
  system: '#86909C',
  claude_md: '#F77234',
};

const TOKEN_LABELS: Record<TokenCategory, string> = {
  user: 'User Input',
  assistant: 'Assistant Output',
  thinking: 'Thinking',
  tool_input: 'Tool Input',
  tool_output: 'Tool Output',
  system: 'System',
  claude_md: 'CLAUDE.md',
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1_000);
  return `${mins}m ${secs}s`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

// ==================== Sub-components ====================

/** Overview metrics cards */
const MetricsOverview: React.FC<{ analysis: IDevToolsSessionAnalysis }> = ({ analysis }) => {
  const { metrics, messageCount, model } = analysis;

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-12px mb-20px'>
      <div className='p-12px bg-bg-2 rd-8px'>
        <Statistic title='Total Tokens' value={metrics.totalTokens} groupSeparator=',' suffix={<span className='text-12px text-t-tertiary ml-4px'>({formatTokens(metrics.totalTokens)})</span>} />
      </div>
      <div className='p-12px bg-bg-2 rd-8px'>
        <Statistic title='Duration' value={formatDuration(metrics.durationMs)} groupSeparator='' />
      </div>
      <div className='p-12px bg-bg-2 rd-8px'>
        <Statistic title='Messages' value={messageCount} groupSeparator=',' />
      </div>
      <div className='p-12px bg-bg-2 rd-8px'>
        <Statistic
          title='Model'
          value={model || 'Unknown'}
          groupSeparator=''
          valueStyle={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        />
      </div>
      {metrics.cacheReadTokens > 0 && (
        <div className='p-12px bg-bg-2 rd-8px'>
          <Statistic title='Cache Read' value={metrics.cacheReadTokens} groupSeparator=',' suffix={<span className='text-12px text-t-tertiary ml-4px'>tokens</span>} />
        </div>
      )}
      {metrics.cacheCreationTokens > 0 && (
        <div className='p-12px bg-bg-2 rd-8px'>
          <Statistic title='Cache Create' value={metrics.cacheCreationTokens} groupSeparator=',' suffix={<span className='text-12px text-t-tertiary ml-4px'>tokens</span>} />
        </div>
      )}
    </div>
  );
};

/** Token attribution breakdown with progress bars */
const TokenAttribution: React.FC<{ attribution: IDevToolsSessionAnalysis['tokenAttribution'] }> = ({ attribution }) => {
  const total = useMemo(() => {
    return Object.values(attribution).reduce((sum, v) => sum + v, 0);
  }, [attribution]);

  if (total === 0) return null;

  const categories = (Object.entries(attribution) as [TokenCategory, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className='mb-20px'>
      <Typography.Title heading={6} className='mb-12px'>
        Token Attribution
      </Typography.Title>

      {/* Stacked bar */}
      <div className='flex h-24px rd-4px overflow-hidden mb-12px'>
        {categories.map(([category, value]) => (
          <Tooltip key={category} content={`${TOKEN_LABELS[category]}: ${formatTokens(value)} (${((value / total) * 100).toFixed(1)}%)`}>
            <div
              style={{
                width: `${(value / total) * 100}%`,
                backgroundColor: TOKEN_COLORS[category],
                minWidth: value > 0 ? '2px' : 0,
              }}
              className='h-full transition-all'
            />
          </Tooltip>
        ))}
      </div>

      {/* Legend */}
      <div className='flex flex-wrap gap-12px'>
        {categories.map(([category, value]) => (
          <div key={category} className='flex items-center gap-6px text-13px'>
            <div className='w-10px h-10px rd-2px' style={{ backgroundColor: TOKEN_COLORS[category] }} />
            <span className='text-t-secondary'>{TOKEN_LABELS[category]}</span>
            <span className='text-t-tertiary'>{formatTokens(value)}</span>
            <span className='text-t-quaternary'>({((value / total) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Compaction events timeline */
const CompactionTimeline: React.FC<{ events: IDevToolsCompactionEvent[] }> = ({ events }) => {
  if (events.length === 0) return null;

  return (
    <div className='mb-20px'>
      <Typography.Title heading={6} className='mb-12px'>
        Compaction Events ({events.length})
      </Typography.Title>

      <Timeline>
        {events.map((event) => (
          <Timeline.Item
            key={event.index}
            label={formatTime(event.timestamp)}
            dotColor={event.delta < 0 ? '#F53F3F' : '#00B42A'}
          >
            <div className='text-13px'>
              <div className='flex items-center gap-8px mb-4px'>
                <Tag size='small' color={event.delta < 0 ? 'red' : 'green'}>
                  {event.delta < 0 ? '' : '+'}
                  {formatTokens(event.delta)} tokens
                </Tag>
                <span className='text-t-tertiary'>
                  {formatTokens(event.tokensBefore)} → {formatTokens(event.tokensAfter)}
                </span>
              </div>
              <div className='text-t-secondary text-12px line-clamp-2'>{event.text}</div>
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  );
};

/** Tool usage summary table */
const ToolUsageSummary: React.FC<{ tools: IDevToolsToolSummary[] }> = ({ tools }) => {
  if (tools.length === 0) return null;

  const totalCalls = tools.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className='mb-20px'>
      <Typography.Title heading={6} className='mb-12px'>
        Tool Usage ({totalCalls} calls)
      </Typography.Title>

      <div className='space-y-8px'>
        {tools.map((tool) => {
          const pct = totalCalls > 0 ? (tool.count / totalCalls) * 100 : 0;
          return (
            <div key={tool.toolName} className='flex items-center gap-12px'>
              <div className='w-100px text-13px text-t-primary font-mono truncate' title={tool.toolName}>
                {tool.toolName}
              </div>
              <div className='flex-1'>
                <Progress percent={pct} showText={false} size='small' color='#3491FA' />
              </div>
              <div className='flex items-center gap-8px min-w-120px justify-end'>
                <span className='text-13px text-t-secondary'>{tool.count}x</span>
                {tool.totalDurationMs > 0 && <span className='text-12px text-t-tertiary'>({formatDuration(tool.totalDurationMs)})</span>}
                {tool.errorCount > 0 && (
                  <Tag size='small' color='red'>
                    {tool.errorCount} err
                  </Tag>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Session timing info */
const SessionTiming: React.FC<{ analysis: IDevToolsSessionAnalysis }> = ({ analysis }) => {
  return (
    <div className='mb-20px'>
      <Typography.Title heading={6} className='mb-12px'>
        Session Info
      </Typography.Title>
      <div className='grid grid-cols-2 gap-8px text-13px'>
        <div className='flex items-center gap-8px'>
          <span className='text-t-tertiary'>Started:</span>
          <span className='text-t-secondary'>{new Date(analysis.startTime).toLocaleString()}</span>
        </div>
        <div className='flex items-center gap-8px'>
          <span className='text-t-tertiary'>Ended:</span>
          <span className='text-t-secondary'>{new Date(analysis.endTime).toLocaleString()}</span>
        </div>
        <div className='flex items-center gap-8px'>
          <span className='text-t-tertiary'>Session ID:</span>
          <span className='text-t-secondary font-mono text-12px truncate' title={analysis.sessionId}>
            {analysis.sessionId}
          </span>
        </div>
        <div className='flex items-center gap-8px'>
          <span className='text-t-tertiary'>Project:</span>
          <span className='text-t-secondary font-mono text-12px truncate' title={analysis.projectPath}>
            {analysis.projectPath}
          </span>
        </div>
      </div>
    </div>
  );
};

// ==================== Main Component ====================

const DevToolsViewer: React.FC<DevToolsViewerProps> = ({ content }) => {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<IDevToolsSessionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse the content to get sessionId and workspace
  const params = useMemo(() => {
    try {
      return JSON.parse(content) as { sessionId: string; workspace?: string };
    } catch {
      return null;
    }
  }, [content]);

  useEffect(() => {
    if (!params?.sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await ipcBridge.devtools.analyzeSession.invoke({
          sessionId: params.sessionId,
          workspace: params.workspace,
        });

        if (cancelled) return;

        if (result.success && result.data) {
          setAnalysis(result.data);
        } else {
          setError(result.msg || 'Failed to analyze session');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unexpected error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [params?.sessionId, params?.workspace]);

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center'>
        <Spin size={32} tip='Analyzing session...' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='h-full flex items-center justify-center p-20px'>
        <Empty description={error} />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className='h-full flex items-center justify-center'>
        <Empty description={t('common.noData', { defaultValue: 'No data available' })} />
      </div>
    );
  }

  return (
    <div className='h-full overflow-auto p-20px'>
      <div className='max-w-800px mx-auto'>
        <Typography.Title heading={5} className='mb-16px flex items-center gap-8px'>
          Session Insights
          <Tag size='small' color='arcoblue'>
            claude-devtools
          </Tag>
        </Typography.Title>

        <MetricsOverview analysis={analysis} />
        <TokenAttribution attribution={analysis.tokenAttribution} />
        <ToolUsageSummary tools={analysis.toolExecutionSummary} />
        <CompactionTimeline events={analysis.compactionEvents} />
        <SessionTiming analysis={analysis} />
      </div>
    </div>
  );
};

export default DevToolsViewer;
