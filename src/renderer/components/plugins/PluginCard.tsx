/**
 * PluginCard - Individual plugin card component
 *
 * Displays plugin information with install/uninstall/activate actions
 * Enhanced with checkbox selection and inline activation switch
 */

import React from 'react';
import { Checkbox, Switch } from '@arco-design/web-react';
import type { PluginRegistryEntry } from '@/plugin/types';

interface PluginCardProps {
  plugin: PluginRegistryEntry;
  onInstall?: () => void;
  onUninstall?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
  // New bulk selection props
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  // New inline toggle prop
  showInlineToggle?: boolean;
}

const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  onInstall,
  onUninstall,
  onActivate,
  onDeactivate,
  onViewDetails,
  compact = false,
  selectable = false,
  selected = false,
  onSelect,
  showInlineToggle = false,
}) => {
  const { manifest, isActive, error } = plugin;
  const isInstalled = plugin.state !== 'available';
  const hasError = !!error;

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
    const source = plugin.source || 'local';
    const badges: Record<string, { label: string; color: string }> = {
      npm: { label: 'npm', color: 'text-t-secondary' },
      github: { label: 'GitHub', color: 'text-t-secondary' },
      local: { label: 'Local', color: 'text-t-secondary' },
    };
    return badges[source] || badges.local;
  };

  const handleToggleActive = (checked: boolean, e: Event) => {
    e.stopPropagation();
    console.log('[PluginCard] Toggle:', { pluginId: plugin.id, checked, currentIsActive: isActive });
    // Only trigger action if the state is actually changing
    if (checked !== isActive) {
      console.log('[PluginCard] State changing, calling handler');
      if (checked && onActivate) {
        onActivate();
      } else if (!checked && onDeactivate) {
        onDeactivate();
      }
    } else {
      console.log('[PluginCard] State unchanged, skipping');
    }
  };

  const handleCheckboxChange = (checked: boolean, e: Event) => {
    e.stopPropagation();
    onSelect?.(checked);
  };

  return (
    <div
      className={`
        relative bg-aou-1 rd-8px border-1 border-border
        hover:border-[var(--color-border-2)] transition-all cursor-pointer
        ${compact ? 'p-8px' : 'p-16px min-h-180px'}
        ${selected ? 'border-[var(--color-border-3)] bg-[var(--color-fill-2)]' : ''}
      `}
      onClick={onViewDetails}
    >
      {/* Selection Checkbox (top-left corner) */}
      {selectable && (
        <div className={`absolute z-10 ${compact ? 'top-8px left-8px' : 'top-12px left-12px'}`} onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onChange={handleCheckboxChange} />
        </div>
      )}

      {/* Header */}
      <div className={`flex items-start justify-between ${compact ? 'mb-0' : 'mb-12px'} ${selectable ? 'ml-28px' : ''}`}>
        <div className={`flex items-center flex-1 min-w-0 ${compact ? 'gap-8px' : 'gap-12px'}`}>
          {/* Icon/Avatar */}
          <div className={`bg-aou-3 rd-6px flex items-center justify-center flex-shrink-0 ${compact ? 'w-32px h-32px text-16px' : 'w-40px h-40px text-20px'}`}>
            {manifest.icon ? (
              <img src={manifest.icon} alt='' className='w-full h-full object-cover rd-6px' />
            ) : (
              <span>📦</span>
            )}
          </div>

          {/* Title & Meta */}
          <div className='flex-1 min-w-0'>
            <h3 className={`font-600 truncate ${compact ? 'text-14px' : 'text-16px'}`}>{manifest.name || manifest.displayName}</h3>
            <div className={`flex items-center gap-6px ${compact ? 'mt-0' : 'mt-2px'}`}>
              <span className='text-11px text-t-secondary'>v{manifest.version}</span>
            </div>
          </div>
        </div>

        {/* Status Badge or Toggle */}
        <div className='flex-shrink-0 ml-8px flex items-center gap-8px' onClick={(e) => e.stopPropagation()}>
          {isInstalled && showInlineToggle ? (
            /* Inline activation toggle */
            <>
              <span className={`text-t-secondary ${compact ? 'text-11px' : 'text-12px'}`}>Active</span>
              <Switch checked={isActive} onChange={handleToggleActive} size={compact ? 'small' : 'default'} />
            </>
          ) : hasError ? (
            <span className={`bg-red-500/20 text-red-600 dark:text-red-400 rd-4px font-500 ${compact ? 'px-6px py-2px text-11px' : 'px-8px py-4px text-12px'}`}>
              Error
            </span>
          ) : isActive ? (
            <span className={`bg-green-500/20 text-green-600 dark:text-green-400 rd-4px font-500 ${compact ? 'px-6px py-2px text-11px' : 'px-8px py-4px text-12px'}`}>
              Active
            </span>
          ) : isInstalled ? (
            <span className={`bg-gray-500/20 text-gray-600 dark:text-gray-400 rd-4px font-500 ${compact ? 'px-6px py-2px text-11px' : 'px-8px py-4px text-12px'}`}>
              Installed
            </span>
          ) : (
            <span className={`bg-aou-2 text-t-secondary rd-4px font-500 ${compact ? 'px-6px py-2px text-11px' : 'px-8px py-4px text-12px'}`}>
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
          {plugin.categories && plugin.categories.map((category) => (
            <span key={category} className={`px-8px py-4px rd-6px text-12px font-500 ${getCategoryBadgeColor(category)}`}>
              {category}
            </span>
          ))}

          {/* Capability badges */}
          {plugin.capabilities?.tools && plugin.capabilities.tools.length > 0 && (
            <span className='px-8px py-4px bg-aou-2 rd-6px text-12px text-t-secondary'>
              {plugin.capabilities.tools.length} tool{plugin.capabilities.tools.length > 1 ? 's' : ''}
            </span>
          )}
          {plugin.capabilities?.skills && plugin.capabilities.skills.length > 0 && (
            <span className='px-8px py-4px bg-aou-2 rd-6px text-12px text-t-secondary'>
              {plugin.capabilities.skills.length} skill{plugin.capabilities.skills.length > 1 ? 's' : ''}
            </span>
          )}
          {plugin.capabilities?.agents && plugin.capabilities.agents.length > 0 && (
            <span className='px-8px py-4px bg-aou-2 rd-6px text-12px text-t-secondary'>
              {plugin.capabilities.agents.length} agent{plugin.capabilities.agents.length > 1 ? 's' : ''}
            </span>
          )}
          {plugin.capabilities?.mcpServers && plugin.capabilities.mcpServers.length > 0 && (
            <span className='px-8px py-4px bg-aou-2 rd-6px text-12px text-t-secondary'>
              {plugin.capabilities.mcpServers.length} MCP
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center mt-auto ${compact ? 'gap-6px pt-0' : 'gap-8px pt-8px'}`} onClick={(e) => e.stopPropagation()}>
        {/* Source Badge */}
        <span className={`text-11px font-400 px-6px py-2px bg-transparent border-1 border-border rd-4px ${getSourceBadge().color}`}>
          {getSourceBadge().label}
        </span>

        {!showInlineToggle && (
          <>
            {isInstalled ? (
              <>
                {isActive ? (
                  <button
                    onClick={onDeactivate}
                    className={`bg-aou-3 hover:bg-aou-4 rd-4px transition-colors ${compact ? 'px-8px py-3px text-12px' : 'px-12px py-6px text-14px'}`}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={onActivate}
                    className={`bg-aou-3 hover:bg-aou-4 rd-4px transition-colors ${compact ? 'px-8px py-3px text-12px' : 'px-12px py-6px text-14px'}`}
                  >
                    Activate
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={onInstall}
                className={`bg-aou-3 hover:bg-aou-4 rd-4px transition-colors ${compact ? 'px-8px py-3px text-12px' : 'px-12px py-6px text-14px'}`}
              >
                Install
              </button>
            )}
          </>
        )}

        {isInstalled && !showInlineToggle && (
          <button
            onClick={onUninstall}
            className={`bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rd-4px transition-colors ${compact ? 'px-8px py-3px text-12px' : 'px-12px py-6px text-14px'}`}
          >
            Uninstall
          </button>
        )}

        <button
          onClick={onViewDetails}
          className={`ml-auto bg-aou-3 hover:bg-aou-4 rd-4px transition-colors ${compact ? 'px-8px py-3px text-12px' : 'px-12px py-6px text-14px'}`}
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
