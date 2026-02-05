/**
 * PluginsMarketplace - Main plugin marketplace page
 *
 * Features:
 * - Browse/search plugins with advanced filtering
 * - Install from npm/GitHub/local
 * - View plugin details
 * - Organized by category with collapse groups
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Button, Collapse, Input, Select, Message } from '@arco-design/web-react';
import { IconPlus, IconSearch, IconRefresh, IconClose } from '@arco-design/web-react/icon';
import { usePlugins, usePluginActions } from '@/renderer/hooks/usePlugins';
import PluginCard from '@/renderer/components/plugins/PluginCard';
import PluginDetailModal from '@/renderer/components/plugins/PluginDetailModal';
import PluginInstallDialog from '@/renderer/components/plugins/PluginInstallDialog';
import SettingsPageWrapper from './components/SettingsPageWrapper';
import type { PluginRegistryEntry } from '@/plugin/types';

type CategoryFilter = 'all' | 'document' | 'productivity' | 'ai-tools' | 'code-analysis' | 'integration' | 'other' | 'installed';
type SortOption = 'name-asc' | 'name-desc' | 'category';

const PluginsMarketplace: React.FC = () => {
  const { plugins, loading, error, refetch } = usePlugins();
  const { activate, deactivate } = usePluginActions();

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginRegistryEntry | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  // Category definitions
  const categories: Array<{ id: CategoryFilter; label: string; count?: number }> = useMemo(() => {
    const installed = plugins.filter((p) => p.state !== 'error').length;
    const byCat = plugins.reduce(
      (acc, p) => {
        const cat = (p.manifest.category || 'other') as CategoryFilter;
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      },
      {} as Record<CategoryFilter, number>
    );

    return [
      { id: 'all', label: 'All Plugins', count: plugins.length },
      { id: 'installed', label: 'Installed', count: installed },
      { id: 'document', label: 'Document', count: byCat.document || 0 },
      { id: 'productivity', label: 'Productivity', count: byCat.productivity || 0 },
      { id: 'ai-tools', label: 'AI Tools', count: byCat['ai-tools'] || 0 },
      { id: 'code-analysis', label: 'Code Analysis', count: byCat['code-analysis'] || 0 },
      { id: 'integration', label: 'Integration', count: byCat.integration || 0 },
      { id: 'other', label: 'Other', count: byCat.other || 0 },
    ];
  }, [plugins]);

  // Filtered and sorted plugins
  const filteredPlugins = useMemo(() => {
    let result = plugins;

    // Category filter
    if (selectedCategory === 'installed') {
      result = result.filter((p) => p.state !== 'error');
    } else if (selectedCategory !== 'all') {
      result = result.filter((p) => (p.manifest.category || 'other') === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.manifest.displayName.toLowerCase().includes(query) || p.manifest.description.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
    }

    // Sort
    if (sortBy === 'name-asc') {
      result = [...result].sort((a, b) => a.manifest.displayName.localeCompare(b.manifest.displayName));
    } else if (sortBy === 'name-desc') {
      result = [...result].sort((a, b) => b.manifest.displayName.localeCompare(a.manifest.displayName));
    } else if (sortBy === 'category') {
      result = [...result].sort((a, b) => {
        const catA = a.manifest.category || 'other';
        const catB = b.manifest.category || 'other';
        if (catA === catB) return a.manifest.displayName.localeCompare(b.manifest.displayName);
        return catA.localeCompare(catB);
      });
    }

    return result;
  }, [plugins, selectedCategory, searchQuery, sortBy]);

  // Group plugins by category for collapse view
  const groupedPlugins = useMemo(() => {
    const groups: Record<string, PluginRegistryEntry[]> = {};

    if (selectedCategory === 'all' && !searchQuery.trim()) {
      // Group by category when showing all
      filteredPlugins.forEach((plugin) => {
        const cat = plugin.manifest.category || 'other';
        const categoryLabel = categories.find((c) => c.id === cat)?.label || 'Other';
        if (!groups[categoryLabel]) groups[categoryLabel] = [];
        groups[categoryLabel].push(plugin);
      });
    } else {
      // Single group when filtered
      const groupName = selectedCategory === 'installed' ? 'Installed Plugins' : categories.find((c) => c.id === selectedCategory)?.label || 'Filtered Plugins';
      groups[groupName] = filteredPlugins;
    }

    return groups;
  }, [filteredPlugins, selectedCategory, searchQuery, categories]);

  const handlePluginAction = useCallback(
    async (plugin: PluginRegistryEntry, action: 'activate' | 'deactivate') => {
      try {
        if (action === 'activate') {
          await activate(plugin.id);
          Message.success('Plugin activated');
        } else {
          await deactivate(plugin.id);
          Message.success('Plugin deactivated');
        }
        await refetch();
      } catch (err) {
        Message.error((err as Error).message);
      }
    },
    [activate, deactivate, refetch]
  );

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      Message.success('Plugins refreshed');
    } catch (err) {
      Message.error('Failed to refresh plugins');
    }
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSortBy('name-asc');
  }, []);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (searchQuery.trim()) count++;
    if (sortBy !== 'name-asc') count++;
    return count;
  }, [selectedCategory, searchQuery, sortBy]);

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
          <div className='p-16px bg-red-500/10 border border-red-500/20 rd-8px text-red-600 dark:text-red-400'>Error loading plugins: {error}</div>
        </div>
      </SettingsPageWrapper>
    );
  }

  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      <div className='p-20px'>
        {/* Header */}
        <div className='mb-24px flex items-center justify-between'>
          <div>
            <h2 className='text-24px font-600 mb-8px'>Plugin Marketplace</h2>
            <p className='text-14px text-t-secondary'>Browse and install plugins to extend AionUi functionality</p>
          </div>
          <Button type='primary' icon={<IconPlus />} onClick={() => setShowInstallDialog(true)} size='large'>
            Install Plugin
          </Button>
        </div>

        {/* Filter Bar */}
        <div className='mb-24px p-20px bg-aou-1 rd-12px border border-border'>
          <div className='flex flex-wrap items-center gap-12px mb-12px'>
            {/* Search */}
            <Input prefix={<IconSearch />} placeholder='Search plugins...' value={searchQuery} onChange={setSearchQuery} allowClear className='flex-1 min-w-240px' />

            {/* Category Filter */}
            <Select value={selectedCategory} onChange={(value) => setSelectedCategory(value as CategoryFilter)} className='w-180px' placeholder='Category'>
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.label} {cat.count !== undefined ? `(${cat.count})` : ''}
                </Select.Option>
              ))}
            </Select>

            {/* Sort */}
            <Select value={sortBy} onChange={(value) => setSortBy(value as SortOption)} className='w-160px' placeholder='Sort by'>
              <Select.Option value='name-asc'>Name (A-Z)</Select.Option>
              <Select.Option value='name-desc'>Name (Z-A)</Select.Option>
              <Select.Option value='category'>Category</Select.Option>
            </Select>

            {/* Refresh */}
            <Button icon={<IconRefresh />} onClick={handleRefresh} loading={loading}>
              Refresh
            </Button>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className='flex items-center gap-8px flex-wrap'>
              <span className='text-12px text-t-tertiary'>Active filters:</span>
              {selectedCategory !== 'all' && (
                <div className='inline-flex items-center gap-4px px-8px py-4px bg-primary/10 text-primary rd-6px text-12px'>
                  <span>Category: {categories.find((c) => c.id === selectedCategory)?.label}</span>
                  <IconClose className='cursor-pointer' onClick={() => setSelectedCategory('all')} />
                </div>
              )}
              {searchQuery.trim() && (
                <div className='inline-flex items-center gap-4px px-8px py-4px bg-primary/10 text-primary rd-6px text-12px'>
                  <span>Search: "{searchQuery}"</span>
                  <IconClose className='cursor-pointer' onClick={() => setSearchQuery('')} />
                </div>
              )}
              {sortBy !== 'name-asc' && (
                <div className='inline-flex items-center gap-4px px-8px py-4px bg-primary/10 text-primary rd-6px text-12px'>
                  <span>Sort: {sortBy === 'name-desc' ? 'Z-A' : 'Category'}</span>
                  <IconClose className='cursor-pointer' onClick={() => setSortBy('name-asc')} />
                </div>
              )}
              <Button size='mini' type='text' onClick={handleClearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Plugin Groups */}
        {filteredPlugins.length > 0 ? (
          <Collapse defaultActiveKey={Object.keys(groupedPlugins)} className='bg-transparent'>
            {Object.entries(groupedPlugins).map(([groupName, groupPlugins]) => (
              <Collapse.Item
                key={groupName}
                header={
                  <div className='flex items-center justify-between flex-1 pr-8px'>
                    <span className='text-16px font-500'>{groupName}</span>
                    <span className='text-14px text-t-secondary'>
                      {groupPlugins.length} plugin{groupPlugins.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                }
                name={groupName}
              >
                <div className='flex flex-col gap-12px'>
                  {groupPlugins.map((plugin) => (
                    <PluginCard key={plugin.id} plugin={plugin} onActivate={() => handlePluginAction(plugin, 'activate')} onDeactivate={() => handlePluginAction(plugin, 'deactivate')} onViewDetails={() => setSelectedPlugin(plugin)} showInlineToggle compact />
                  ))}
                </div>
              </Collapse.Item>
            ))}
          </Collapse>
        ) : (
          <div className='text-center py-60px'>
            <div className='text-48px mb-16px opacity-20'>📦</div>
            <h3 className='text-18px font-500 mb-8px'>No plugins found</h3>
            <p className='text-14px text-t-secondary mb-20px'>{searchQuery ? `No plugins match "${searchQuery}"` : selectedCategory === 'installed' ? 'You have no installed plugins yet' : `No plugins in the "${categories.find((c) => c.id === selectedCategory)?.label}" category`}</p>
            {activeFilterCount > 0 ? (
              <Button onClick={handleClearFilters}>Clear All Filters</Button>
            ) : (
              <Button type='primary' onClick={() => setShowInstallDialog(true)}>
                Install a Plugin
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPlugin && (
        <PluginDetailModal
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
          onPluginUpdated={() => {
            void refetch();
            setSelectedPlugin(null);
          }}
        />
      )}

      {/* Install Dialog */}
      <PluginInstallDialog
        visible={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        onInstalled={() => {
          void refetch();
          setShowInstallDialog(false);
        }}
      />
    </SettingsPageWrapper>
  );
};

export default PluginsMarketplace;
