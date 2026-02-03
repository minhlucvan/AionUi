/**
 * PluginCard - Individual plugin card component
 *
 * Displays plugin information with install/uninstall/activate actions
 */

import React from 'react';
import type { PluginRegistryEntry } from '@/plugin/types';

interface PluginCardProps {
  plugin: PluginRegistryEntry;
  onInstall?: () => void;
  onUninstall?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
}

const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  onInstall,
  onUninstall,
  onActivate,
  onDeactivate,
  onViewDetails,
  compact = false,
}) => {
  const { manifest, state, version, source } = plugin;
  const isActive = state === 'active';
  const isInstalled = state !== 'error';
  const hasError = state === 'error';

  const getCategoryBadgeColor = (category?: string) => {
    const colors: Record<string, string> = {
      'document': 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      'productivity': 'bg-green-500/20 text-green-600 dark:text-green-400',
      'ai-tools': 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
      'code-analysis': 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
      'integration': 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
      'other': 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
    };
    return colors[category || 'other'] || colors.other;
  };

  const getSourceBadge = () => {
    const badges: Record<typeof source, { label: string; color: string }> = {
      npm: { label: 'npm', color: 'text-red-600 dark:text-red-400' },
      github: { label: 'GitHub', color: 'text-gray-600 dark:text-gray-400' },
      local: { label: 'Local', color: 'text-blue-600 dark:text-blue-400' },
    };
    return badges[source];
  };

  return (
    <div
      className={`
        relative p-16px bg-aou-1 rd-12px border-1 border-border
        hover:border-primary/50 transition-all cursor-pointer
        ${compact ? '' : 'min-h-180px'}
      `}
      onClick={onViewDetails}
    >
      {/* Header */}
      <div className='flex items-start justify-between mb-12px'>
        <div className='flex items-center gap-12px flex-1 min-w-0'>
          {/* Icon/Avatar */}
          <div className='w-40px h-40px bg-aou-3 rd-8px flex items-center justify-center text-20px flex-shrink-0'>
            {manifest.icon ? (
              <img src={manifest.icon} alt='' className='w-full h-full object-cover rd-8px' />
            ) : (
              <span>📦</span>
            )}
          </div>

          {/* Title & Meta */}
          <div className='flex-1 min-w-0'>
            <h3 className='text-16px font-600 truncate'>{manifest.displayName}</h3>
            <div className='flex items-center gap-8px mt-2px'>
              <span className='text-12px text-t-secondary'>v{version}</span>
              <span className='text-12px text-t-secondary'>•</span>
              <span className={`text-12px font-500 ${getSourceBadge().color}`}>
                {getSourceBadge().label}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className='flex-shrink-0 ml-8px'>
          {hasError ? (
            <span className='px-8px py-4px bg-red-500/20 text-red-600 dark:text-red-400 rd-6px text-12px font-500'>
              Error
            </span>
          ) : isActive ? (
            <span className='px-8px py-4px bg-green-500/20 text-green-600 dark:text-green-400 rd-6px text-12px font-500'>
              Active
            </span>
          ) : isInstalled ? (
            <span className='px-8px py-4px bg-gray-500/20 text-gray-600 dark:text-gray-400 rd-6px text-12px font-500'>
              Installed
            </span>
          ) : (
            <span className='px-8px py-4px bg-blue-500/20 text-blue-600 dark:text-blue-400 rd-6px text-12px font-500'>
              Available
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {!compact && (
        <p className='text-14px text-t-secondary line-clamp-2 mb-12px'>{manifest.description}</p>
      )}

      {/* Tags */}
      {!compact && (
        <div className='flex items-center gap-8px flex-wrap mb-12px'>
          {manifest.category && (
            <span className={`px-8px py-4px rd-6px text-12px font-500 ${getCategoryBadgeColor(manifest.category)}`}>
              {manifest.category}
            </span>
          )}

          {/* Capability badges */}
          {manifest.tools && manifest.tools.length > 0 && (
            <span className='px-8px py-4px bg-aou-2 rd-6px text-12px text-t-secondary'>
              {manifest.tools.length} tool{manifest.tools.length > 1 ? 's' : ''}
            </span>
          )}
          {manifest.skills && (
            <span className='px-8px py-4px bg-aou-2 rd-6px text-12px text-t-secondary'>
              {Array.isArray(manifest.skills) ? manifest.skills.length : 1} skill{Array.isArray(manifest.skills) && manifest.skills.length > 1 ? 's' : ''}
            </span>
          )}
          {manifest.agents && manifest.agents.length > 0 && (
            <span className='px-8px py-4px bg-aou-2 rd-6px text-12px text-t-secondary'>
              {manifest.agents.length} agent{manifest.agents.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className='flex items-center gap-8px mt-auto pt-8px' onClick={(e) => e.stopPropagation()}>
        {isInstalled ? (
          <>
            {isActive ? (
              <button
                onClick={onDeactivate}
                className='px-12px py-6px bg-aou-3 hover:bg-aou-4 rd-6px text-14px transition-colors'
              >
                Deactivate
              </button>
            ) : (
              <button
                onClick={onActivate}
                className='px-12px py-6px bg-primary hover:bg-primary/80 text-white rd-6px text-14px transition-colors'
              >
                Activate
              </button>
            )}
            <button
              onClick={onUninstall}
              className='px-12px py-6px bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rd-6px text-14px transition-colors'
            >
              Uninstall
            </button>
          </>
        ) : (
          <button
            onClick={onInstall}
            className='px-12px py-6px bg-primary hover:bg-primary/80 text-white rd-6px text-14px transition-colors'
          >
            Install
          </button>
        )}
        <button
          onClick={onViewDetails}
          className='ml-auto px-12px py-6px bg-aou-3 hover:bg-aou-4 rd-6px text-14px transition-colors'
        >
          Details
        </button>
      </div>

      {/* Error message */}
      {hasError && plugin.error && (
        <div className='mt-8px p-8px bg-red-500/10 rd-6px'>
          <p className='text-12px text-red-600 dark:text-red-400'>{plugin.error}</p>
        </div>
      )}
    </div>
  );
};

export default PluginCard;
