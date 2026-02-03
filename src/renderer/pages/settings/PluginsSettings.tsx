/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlugins, usePluginActions } from '@/renderer/hooks/usePlugins';
import PluginCard from '@/renderer/components/plugins/PluginCard';
import PluginDetailModal from '@/renderer/components/plugins/PluginDetailModal';
import SettingsPageWrapper from './components/SettingsPageWrapper';
import type { PluginRegistryEntry } from '@/plugin/types';

const PluginsSettings: React.FC = () => {
  const navigate = useNavigate();
  const { plugins, loading, error, refetch } = usePlugins();
  const { activate, deactivate, uninstall } = usePluginActions();
  const [selectedPlugin, setSelectedPlugin] = useState<PluginRegistryEntry | null>(null);

  const installedPlugins = plugins.filter(p => p.state !== 'error');
  const activePlugins = plugins.filter(p => p.state === 'active');

  const handlePluginAction = async (plugin: PluginRegistryEntry, action: 'activate' | 'deactivate' | 'uninstall') => {
    if (action === 'activate') {
      await activate(plugin.id);
    } else if (action === 'deactivate') {
      await deactivate(plugin.id);
    } else if (action === 'uninstall') {
      if (!confirm(`Are you sure you want to uninstall "${plugin.manifest.displayName}"?`)) {
        return;
      }
      await uninstall(plugin.id);
    }
    refetch();
  };

  if (loading && plugins.length === 0) {
    return (
      <SettingsPageWrapper contentClassName='max-w-1200px'>
        <div className='p-20px text-center text-t-secondary'>
          Loading plugins...
        </div>
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

  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      <div className='p-20px'>
        {/* Header */}
        <div className='mb-24px'>
          <h2 className='text-24px font-600 mb-8px'>Installed Plugins</h2>
          <p className='text-14px text-t-secondary'>
            Manage your installed plugins
          </p>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-3 gap-16px mb-24px'>
          <div className='p-16px bg-aou-1 rd-12px'>
            <div className='text-14px text-t-secondary mb-4px'>Total Plugins</div>
            <div className='text-28px font-600'>{installedPlugins.length}</div>
          </div>
          <div className='p-16px bg-aou-1 rd-12px'>
            <div className='text-14px text-t-secondary mb-4px'>Active</div>
            <div className='text-28px font-600 text-green-600 dark:text-green-400'>{activePlugins.length}</div>
          </div>
          <div className='p-16px bg-aou-1 rd-12px'>
            <div className='text-14px text-t-secondary mb-4px'>Inactive</div>
            <div className='text-28px font-600'>{installedPlugins.length - activePlugins.length}</div>
          </div>
        </div>

        {/* Actions */}
        <div className='mb-24px flex items-center gap-12px'>
          <button
            onClick={() => navigate('/settings/plugins/marketplace')}
            className='px-16px py-8px bg-primary hover:bg-primary/80 text-white rd-8px text-14px transition-colors'
          >
            Browse Marketplace
          </button>
          <button
            onClick={() => navigate('/settings/plugins/marketplace')}
            className='px-16px py-8px bg-aou-3 hover:bg-aou-4 rd-8px text-14px transition-colors'
          >
            + Install Plugin
          </button>
        </div>

        {/* Plugin List */}
        {installedPlugins.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-16px'>
            {installedPlugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                onActivate={() => handlePluginAction(plugin, 'activate')}
                onDeactivate={() => handlePluginAction(plugin, 'deactivate')}
                onUninstall={() => handlePluginAction(plugin, 'uninstall')}
                onViewDetails={() => setSelectedPlugin(plugin)}
              />
            ))}
          </div>
        ) : (
          <div className='text-center py-60px'>
            <div className='text-48px mb-16px opacity-20'>📦</div>
            <h3 className='text-18px font-500 mb-8px'>No plugins installed</h3>
            <p className='text-14px text-t-secondary mb-20px'>
              Browse the marketplace to find and install plugins
            </p>
            <button
              onClick={() => navigate('/settings/plugins/marketplace')}
              className='px-20px py-10px bg-primary hover:bg-primary/80 text-white rd-8px text-14px transition-colors'
            >
              Browse Marketplace
            </button>
          </div>
        )}
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
    </SettingsPageWrapper>
  );
};

export default PluginsSettings;
