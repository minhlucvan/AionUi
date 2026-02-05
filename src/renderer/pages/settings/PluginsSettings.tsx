/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PluginsSettings - Comprehensive plugin management page
 *
 * Features:
 * - Enhanced statistics with capability metrics
 * - Advanced search and filtering
 * - Bulk operations (activate, deactivate, uninstall)
 * - Grouping by status with Collapse pattern
 * - Sorting options
 * - Full-page detail view instead of modal
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Collapse, Message, Button } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { usePlugins, usePluginActions } from '@/renderer/hooks/usePlugins';
import PluginCard from '@/renderer/components/plugins/PluginCard';
import PluginFilterBar, { type FilterOptions } from '@/renderer/components/plugins/PluginFilterBar';
import SettingsPageWrapper from './components/SettingsPageWrapper';
import type { PluginRegistryEntry } from '@/plugin/types';

const PluginsSettings: React.FC = () => {
  const navigate = useNavigate();
  const { plugins, loading, error, refetch } = usePlugins();
  const { activate, deactivate, uninstall, loading: actionLoading } = usePluginActions();

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    statusFilter: 'all',
    capabilityFilter: 'all',
    categoryFilter: 'all',
    sortBy: 'name-asc',
  });

  // Filter plugins based on search and filters
  const filteredPlugins = useMemo(() => {
    let result = [...plugins];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.manifest.name?.toLowerCase().includes(query) ||
          p.manifest.displayName?.toLowerCase().includes(query) ||
          p.manifest.description?.toLowerCase().includes(query) ||
          p.manifest.author?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filters.statusFilter !== 'all') {
      result = result.filter((p) => {
        if (filters.statusFilter === 'active') return p.isActive;
        if (filters.statusFilter === 'inactive') return !p.isActive && !p.error;
        if (filters.statusFilter === 'error') return !!p.error;
        return true;
      });
    }

    // Capability filter
    if (filters.capabilityFilter !== 'all') {
      result = result.filter((p) => {
        if (filters.capabilityFilter === 'tools') return (p.capabilities?.tools?.length ?? 0) > 0;
        if (filters.capabilityFilter === 'skills') return (p.capabilities?.skills?.length ?? 0) > 0;
        if (filters.capabilityFilter === 'agents') return (p.capabilities?.agents?.length ?? 0) > 0;
        if (filters.capabilityFilter === 'mcp') return (p.capabilities?.mcpServers?.length ?? 0) > 0;
        return true;
      });
    }

    // Category filter
    if (filters.categoryFilter !== 'all') {
      result = result.filter((p) => p.categories?.includes(filters.categoryFilter));
    }

    // Sort
    if (filters.sortBy === 'name-asc') {
      result.sort((a, b) => (a.manifest.name || '').localeCompare(b.manifest.name || ''));
    } else if (filters.sortBy === 'name-desc') {
      result.sort((a, b) => (b.manifest.name || '').localeCompare(a.manifest.name || ''));
    } else if (filters.sortBy === 'status') {
      result.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return 0;
      });
    } else if (filters.sortBy === 'date') {
      result.sort((a, b) => {
        const dateA = a.installedAt ? new Date(a.installedAt).getTime() : 0;
        const dateB = b.installedAt ? new Date(b.installedAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (filters.sortBy === 'capabilities') {
      result.sort((a, b) => {
        const countA =
          (a.capabilities?.tools?.length ?? 0) +
          (a.capabilities?.skills?.length ?? 0) +
          (a.capabilities?.agents?.length ?? 0) +
          (a.capabilities?.mcpServers?.length ?? 0);
        const countB =
          (b.capabilities?.tools?.length ?? 0) +
          (b.capabilities?.skills?.length ?? 0) +
          (b.capabilities?.agents?.length ?? 0) +
          (b.capabilities?.mcpServers?.length ?? 0);
        return countB - countA;
      });
    }

    return result;
  }, [plugins, filters]);

  // Group plugins by status (errors only)
  const groupedPlugins = useMemo(() => {
    const installed = filteredPlugins.filter((p) => !p.error);
    const errors = filteredPlugins.filter((p) => !!p.error);

    return { installed, errors };
  }, [filteredPlugins]);

  // Plugin action handlers
  const handleActivate = useCallback(
    async (pluginId: string) => {
      try {
        console.log('[PluginsSettings] Activating plugin:', pluginId);
        await activate(pluginId);
        console.log('[PluginsSettings] Plugin activated, refetching...');
        Message.success('Plugin activated');
        await refetch();
        console.log('[PluginsSettings] Refetch complete');
      } catch (err) {
        console.error('[PluginsSettings] Activate error:', err);
        Message.error((err as Error).message);
      }
    },
    [activate, refetch]
  );

  const handleDeactivate = useCallback(
    async (pluginId: string) => {
      try {
        console.log('[PluginsSettings] Deactivating plugin:', pluginId);
        await deactivate(pluginId);
        console.log('[PluginsSettings] Plugin deactivated, refetching...');
        Message.success('Plugin deactivated');
        await refetch();
        console.log('[PluginsSettings] Refetch complete');
      } catch (err) {
        console.error('[PluginsSettings] Deactivate error:', err);
        Message.error((err as Error).message);
      }
    },
    [deactivate, refetch]
  );

  const handleUninstall = useCallback(
    async (pluginId: string) => {
      try {
        await uninstall(pluginId);
        Message.success('Plugin uninstalled');
        void refetch();
      } catch (err) {
        Message.error((err as Error).message);
      }
    },
    [uninstall, refetch]
  );

  const handleViewDetails = useCallback(
    (pluginId: string) => {
      navigate(`/settings/plugins/${pluginId}`);
    },
    [navigate]
  );

  // Render plugin group
  const renderPluginGroup = (plugins: PluginRegistryEntry[], title: string, count: number, defaultExpanded = true) => {
    if (count === 0) return null;

    return (
      <Collapse.Item
        key={title}
        header={
          <div className='flex items-center justify-between flex-1 pr-8px'>
            <span className='text-16px font-500'>{title}</span>
            <span className='text-14px text-t-secondary'>{count} plugin{count !== 1 ? 's' : ''}</span>
          </div>
        }
        name={title}
      >
        <div className='flex flex-col gap-12px'>
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onActivate={() => handleActivate(plugin.id)}
              onDeactivate={() => handleDeactivate(plugin.id)}
              onUninstall={() => handleUninstall(plugin.id)}
              onViewDetails={() => handleViewDetails(plugin.id)}
              showInlineToggle
              compact
            />
          ))}
        </div>
      </Collapse.Item>
    );
  };

  if (loading && plugins.length === 0) {
    return (
      <SettingsPageWrapper contentClassName='max-w-1200px'>
        <div className='p-20px text-center text-t-secondary'>Loading plugins...</div>
      </SettingsPageWrapper>
    );
  }

  if (error && plugins.length === 0) {
    return (
      <SettingsPageWrapper contentClassName='max-w-1200px'>
        <div className='p-20px'>
          <div className='p-16px bg-red-500/10 border border-red-500/20 rd-8px text-red-600 dark:text-red-400'>
            Error loading plugins: {error}
          </div>
        </div>
      </SettingsPageWrapper>
    );
  }

  const hasPlugins = plugins.length > 0;

  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      <div className='p-20px'>
        {/* Header */}
        <div className='mb-24px flex items-center justify-between'>
          <div>
            <h2 className='text-24px font-600 mb-8px'>Plugin Management</h2>
            <p className='text-14px text-t-secondary'>Manage, configure, and organize your installed plugins</p>
          </div>
          <Button
            type='primary'
            icon={<IconPlus />}
            onClick={() => navigate('/settings/plugins/marketplace')}
            size='large'
          >
            Install Plugin
          </Button>
        </div>

        {hasPlugins && (
          <>
            {/* Filter Bar */}
            <PluginFilterBar
              filters={filters}
              onFiltersChange={setFilters}
              onRefresh={refetch}
              plugins={plugins}
              isLoading={loading}
            />

            {/* Plugin Groups */}
            {filteredPlugins.length > 0 ? (
              <Collapse defaultActiveKey={['Installed Plugins']} className='bg-transparent'>
                {renderPluginGroup(groupedPlugins.installed, 'Installed Plugins', groupedPlugins.installed.length)}
                {renderPluginGroup(groupedPlugins.errors, 'Plugins with Errors', groupedPlugins.errors.length, false)}
              </Collapse>
            ) : (
              <div className='text-center py-60px'>
                <div className='text-48px mb-16px opacity-20'>🔍</div>
                <h3 className='text-18px font-500 mb-8px'>No plugins found</h3>
                <p className='text-14px text-t-secondary mb-20px'>
                  Try adjusting your search or filters
                </p>
                <Button onClick={() => setFilters({
                  searchQuery: '',
                  statusFilter: 'all',
                  capabilityFilter: 'all',
                  categoryFilter: 'all',
                  sortBy: 'name-asc',
                })}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!hasPlugins && (
          <div className='text-center py-60px'>
            <div className='text-48px mb-16px opacity-20'>📦</div>
            <h3 className='text-18px font-500 mb-8px'>No plugins installed</h3>
            <p className='text-14px text-t-secondary mb-20px'>
              Browse the marketplace to find and install plugins
            </p>
            <Button
              type='primary'
              size='large'
              onClick={() => navigate('/settings/plugins/marketplace')}
            >
              Browse Marketplace
            </Button>
          </div>
        )}
      </div>
    </SettingsPageWrapper>
  );
};

export default PluginsSettings;
