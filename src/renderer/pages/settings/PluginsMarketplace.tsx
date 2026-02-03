/**
 * PluginsMarketplace - Main plugin marketplace page
 *
 * Features:
 * - Hybrid navigation (category sidebar + search)
 * - Browse/search plugins
 * - Install from npm/GitHub/local
 * - View plugin details
 */

import React, { useMemo, useState } from 'react';
import { usePlugins, usePluginActions } from '@/renderer/hooks/usePlugins';
import PluginCard from '@/renderer/components/plugins/PluginCard';
import PluginDetailModal from '@/renderer/components/plugins/PluginDetailModal';
import PluginInstallDialog from '@/renderer/components/plugins/PluginInstallDialog';
import SettingsPageWrapper from './components/SettingsPageWrapper';
import type { PluginRegistryEntry } from '@/plugin/types';

type CategoryFilter = 'all' | 'document' | 'productivity' | 'ai-tools' | 'code-analysis' | 'integration' | 'other' | 'installed';

const PluginsMarketplace: React.FC = () => {
  const { plugins, loading, error, refetch } = usePlugins();
  const { activate, deactivate } = usePluginActions();

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginRegistryEntry | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  // Category definitions
  const categories: Array<{ id: CategoryFilter; label: string; icon: string; count?: number }> = useMemo(() => {
    const installed = plugins.filter(p => p.state !== 'error').length;
    const byCat = plugins.reduce((acc, p) => {
      const cat = (p.manifest.category || 'other') as CategoryFilter;
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<CategoryFilter, number>);

    return [
      { id: 'all', label: 'All Plugins', icon: '📦', count: plugins.length },
      { id: 'installed', label: 'Installed', icon: '✓', count: installed },
      { id: 'document', label: 'Document', icon: '📄', count: byCat.document || 0 },
      { id: 'productivity', label: 'Productivity', icon: '⚡', count: byCat.productivity || 0 },
      { id: 'ai-tools', label: 'AI Tools', icon: '🤖', count: byCat['ai-tools'] || 0 },
      { id: 'code-analysis', label: 'Code Analysis', icon: '🔍', count: byCat['code-analysis'] || 0 },
      { id: 'integration', label: 'Integration', icon: '🔗', count: byCat.integration || 0 },
      { id: 'other', label: 'Other', icon: '⋯', count: byCat.other || 0 },
    ];
  }, [plugins]);

  // Filtered plugins
  const filteredPlugins = useMemo(() => {
    let result = plugins;

    // Category filter
    if (selectedCategory === 'installed') {
      result = result.filter(p => p.state !== 'error');
    } else if (selectedCategory !== 'all') {
      result = result.filter(p => (p.manifest.category || 'other') === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.manifest.displayName.toLowerCase().includes(query) ||
        p.manifest.description.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [plugins, selectedCategory, searchQuery]);

  const handlePluginAction = async (plugin: PluginRegistryEntry, action: 'activate' | 'deactivate') => {
    if (action === 'activate') {
      await activate(plugin.id);
    } else {
      await deactivate(plugin.id);
    }
    refetch();
  };

  if (loading && plugins.length === 0) {
    return (
      <SettingsPageWrapper contentClassName='max-w-1400px'>
        <div className='p-20px text-center text-t-secondary'>
          Loading plugins...
        </div>
      </SettingsPageWrapper>
    );
  }

  if (error && plugins.length === 0) {
    return (
      <SettingsPageWrapper contentClassName='max-w-1400px'>
        <div className='p-20px'>
          <div className='p-16px bg-red-500/10 border border-red-500/20 rd-8px text-red-600 dark:text-red-400'>
            Error loading plugins: {error}
          </div>
        </div>
      </SettingsPageWrapper>
    );
  }

  return (
    <SettingsPageWrapper contentClassName='max-w-1400px'>
      <div className='flex h-full'>
        {/* Sidebar - Categories */}
        <aside className='w-240px border-r border-border flex-shrink-0 p-16px overflow-y-auto'>
          <div className='mb-16px'>
            <button
              onClick={() => setShowInstallDialog(true)}
              className='w-full px-12px py-8px bg-primary hover:bg-primary/80 text-white rd-8px text-14px font-500 transition-colors'
            >
              + Install Plugin
            </button>
          </div>

          <div className='space-y-4px'>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  w-full px-12px py-8px rd-8px text-14px text-left transition-colors
                  flex items-center justify-between
                  ${selectedCategory === category.id
                    ? 'bg-primary/10 text-primary font-500'
                    : 'hover:bg-aou-1 text-t-secondary'
                  }
                `}
              >
                <span>
                  <span className='mr-8px'>{category.icon}</span>
                  {category.label}
                </span>
                {category.count !== undefined && category.count > 0 && (
                  <span className='text-12px opacity-60'>{category.count}</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className='flex-1 overflow-y-auto'>
          <div className='p-20px'>
            {/* Header */}
            <div className='mb-20px'>
              <h2 className='text-24px font-600 mb-8px'>
                {categories.find(c => c.id === selectedCategory)?.label || 'Plugins'}
              </h2>
              <p className='text-14px text-t-secondary'>
                Browse and install plugins to extend AionUi functionality
              </p>
            </div>

            {/* Search Bar */}
            <div className='mb-20px'>
              <div className='relative'>
                <input
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Search plugins by name, description, or ID...'
                  className='w-full px-16px py-10px pl-40px bg-aou-1 border border-border rd-12px focus:outline-none focus:border-primary text-14px'
                />
                <span className='absolute left-16px top-50% -translate-y-50% text-t-tertiary'>
                  🔍
                </span>
              </div>
            </div>

            {/* Plugin Grid */}
            {filteredPlugins.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16px'>
                {filteredPlugins.map((plugin) => (
                  <PluginCard
                    key={plugin.id}
                    plugin={plugin}
                    onActivate={() => handlePluginAction(plugin, 'activate')}
                    onDeactivate={() => handlePluginAction(plugin, 'deactivate')}
                    onViewDetails={() => setSelectedPlugin(plugin)}
                  />
                ))}
              </div>
            ) : (
              <div className='text-center py-60px'>
                <div className='text-48px mb-16px opacity-20'>📦</div>
                <h3 className='text-18px font-500 mb-8px'>No plugins found</h3>
                <p className='text-14px text-t-secondary mb-20px'>
                  {searchQuery
                    ? `No plugins match "${searchQuery}"`
                    : selectedCategory === 'installed'
                    ? 'You have no installed plugins yet'
                    : `No plugins in the "${categories.find(c => c.id === selectedCategory)?.label}" category`
                  }
                </p>
                <button
                  onClick={() => setShowInstallDialog(true)}
                  className='px-20px py-10px bg-primary hover:bg-primary/80 text-white rd-8px text-14px transition-colors'
                >
                  Install a Plugin
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Detail Modal */}
      {selectedPlugin && (
        <PluginDetailModal
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
          onPluginUpdated={() => {
            refetch();
            setSelectedPlugin(null);
          }}
        />
      )}

      {/* Install Dialog */}
      <PluginInstallDialog
        visible={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        onInstalled={() => {
          refetch();
          setShowInstallDialog(false);
        }}
      />
    </SettingsPageWrapper>
  );
};

export default PluginsMarketplace;
