/**
 * PluginStatsCards - Enhanced statistics display for plugin management
 *
 * Displays comprehensive stats including:
 * - Total/Active/Inactive plugin counts
 * - Capability metrics (tools, skills, agents, MCP servers)
 * - Visual cards with icons and color coding
 */

import React, { useMemo } from 'react';
import type { PluginRegistryEntry } from '@/plugin/types';

interface PluginStatsCardsProps {
  plugins: PluginRegistryEntry[];
}

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bgColor: string;
}

const PluginStatsCards: React.FC<PluginStatsCardsProps> = ({ plugins }) => {
  const stats = useMemo(() => {
    const activePlugins = plugins.filter((p) => p.isActive);
    const inactivePlugins = plugins.filter((p) => !p.isActive);

    // Calculate capability totals
    const totalTools = plugins.reduce((sum, p) => sum + (p.capabilities?.tools?.length || 0), 0);
    const totalSkills = plugins.reduce((sum, p) => sum + (p.capabilities?.skills?.length || 0), 0);
    const totalAgents = plugins.reduce((sum, p) => sum + (p.capabilities?.agents?.length || 0), 0);
    const totalMcpServers = plugins.reduce((sum, p) => sum + (p.capabilities?.mcpServers?.length || 0), 0);

    const cards: StatCard[] = [
      {
        label: 'Total Plugins',
        value: plugins.length,
        icon: '📦',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-500/10',
      },
      {
        label: 'Active',
        value: activePlugins.length,
        icon: '✓',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-500/10',
      },
      {
        label: 'Inactive',
        value: inactivePlugins.length,
        icon: '○',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-500/10',
      },
      {
        label: 'Tools',
        value: totalTools,
        icon: '🔧',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-500/10',
      },
      {
        label: 'Skills',
        value: totalSkills,
        icon: '⚡',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-500/10',
      },
      {
        label: 'Agents',
        value: totalAgents,
        icon: '🤖',
        color: 'text-cyan-600 dark:text-cyan-400',
        bgColor: 'bg-cyan-500/10',
      },
      {
        label: 'MCP Servers',
        value: totalMcpServers,
        icon: '🔌',
        color: 'text-pink-600 dark:text-pink-400',
        bgColor: 'bg-pink-500/10',
      },
    ];

    return cards;
  }, [plugins]);

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-12px mb-20px'>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className='bg-aou-2 rd-12px p-16px flex flex-col items-center text-center transition-all hover:bg-aou-3'
        >
          <div className={`text-32px mb-8px ${stat.bgColor} rd-12px w-56px h-56px flex items-center justify-center`}>
            {stat.icon}
          </div>
          <div className={`text-24px font-600 mb-4px ${stat.color}`}>{stat.value}</div>
          <div className='text-12px text-t-secondary'>{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default PluginStatsCards;
