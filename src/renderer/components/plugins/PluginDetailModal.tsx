/**
 * PluginDetailModal - Detailed plugin information modal
 *
 * Shows comprehensive plugin information including:
 * - Description and metadata
 * - Tools, skills, and agents
 * - Required permissions
 * - Install/uninstall actions
 */

import React, { useState } from 'react';
import type { PluginRegistryEntry } from '@/plugin/types';
import { usePluginActions } from '@/renderer/hooks/usePlugins';
import PluginInstallDialog from './PluginInstallDialog';

interface PluginDetailModalProps {
  plugin: PluginRegistryEntry | null;
  onClose: () => void;
  onPluginUpdated?: () => void;
}

const PluginDetailModal: React.FC<PluginDetailModalProps> = ({ plugin, onClose, onPluginUpdated }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'capabilities'>('overview');
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const { activate, deactivate, uninstall, loading } = usePluginActions();

  if (!plugin) return null;

  const { manifest, state, version, source, sourceRef } = plugin;
  const isActive = state === 'active';
  const isInstalled = state !== 'error';

  const handleActivate = async () => {
    const result = await activate(plugin.id);
    if (result.success) {
      onPluginUpdated?.();
    }
  };

  const handleDeactivate = async () => {
    const result = await deactivate(plugin.id);
    if (result.success) {
      onPluginUpdated?.();
    }
  };

  const handleUninstall = async () => {
    if (!confirm(`Are you sure you want to uninstall "${manifest.displayName}"?`)) {
      return;
    }
    const result = await uninstall(plugin.id);
    if (result.success) {
      onPluginUpdated?.();
      onClose();
    }
  };

  const getCategoryColor = (category?: string) => {
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

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      'fs:read': 'Read Files',
      'fs:write': 'Write Files',
      'fs:global': 'Access Files Outside Workspace',
      'network:fetch': 'Network Access',
      'shell:execute': 'Execute Shell Commands',
      'ui:panel': 'Show UI Panels',
      'ui:overlay': 'Show Overlays',
      'clipboard': 'Access Clipboard',
      'mcp:server': 'Run MCP Servers',
    };
    return labels[permission] || permission;
  };

  const getPermissionDescription = (permission: string) => {
    const descriptions: Record<string, string> = {
      'fs:read': 'Read files from the workspace',
      'fs:write': 'Create and modify files in the workspace',
      'fs:global': 'Access files anywhere on your system (use with caution)',
      'network:fetch': 'Make HTTP requests to external services',
      'shell:execute': 'Run shell commands and scripts',
      'ui:panel': 'Display custom UI panels',
      'ui:overlay': 'Show overlay windows',
      'clipboard': 'Read from and write to the clipboard',
      'mcp:server': 'Start and manage MCP server processes',
    };
    return descriptions[permission] || 'Permission not documented';
  };

  return (
    <div
      className='fixed inset-0 z-1000 flex items-center justify-center bg-black/50 p-20px'
      onClick={onClose}
    >
      <div
        className='w-full max-w-900px max-h-90vh bg-aou-0 rd-16px shadow-xl overflow-hidden flex flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='px-24px py-20px border-b border-border flex-shrink-0'>
          <div className='flex items-start gap-16px'>
            {/* Icon */}
            <div className='w-64px h-64px bg-aou-3 rd-12px flex items-center justify-center text-32px flex-shrink-0'>
              {manifest.icon ? (
                <img src={manifest.icon} alt='' className='w-full h-full object-cover rd-12px' />
              ) : (
                <span>📦</span>
              )}
            </div>

            {/* Title & Meta */}
            <div className='flex-1 min-w-0'>
              <h2 className='text-24px font-600'>{manifest.displayName}</h2>
              <div className='flex items-center gap-12px mt-8px flex-wrap'>
                <span className='text-14px text-t-secondary'>v{version}</span>
                {manifest.category && (
                  <span className={`px-8px py-4px rd-6px text-12px font-500 ${getCategoryColor(manifest.category)}`}>
                    {manifest.category}
                  </span>
                )}
                {isActive && (
                  <span className='px-8px py-4px bg-green-500/20 text-green-600 dark:text-green-400 rd-6px text-12px font-500'>
                    Active
                  </span>
                )}
              </div>
              <p className='text-14px text-t-secondary mt-8px'>{manifest.description}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className='w-32px h-32px flex items-center justify-center rd-8px hover:bg-aou-3 transition-colors flex-shrink-0'
            >
              ✕
            </button>
          </div>

          {/* Source Info */}
          <div className='mt-16px pt-16px border-t border-border flex items-center gap-16px text-14px'>
            <div>
              <span className='text-t-secondary'>Source: </span>
              <span className='font-500'>{source}</span>
            </div>
            <div>
              <span className='text-t-secondary'>Reference: </span>
              <span className='font-mono text-12px'>{sourceRef}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-border flex-shrink-0'>
          {[
            { id: 'overview' as const, label: 'Overview' },
            { id: 'capabilities' as const, label: 'Capabilities' },
            { id: 'permissions' as const, label: 'Permissions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-24px py-12px text-14px font-500 transition-colors
                ${activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-t-secondary hover:text-t-primary border-b-2 border-transparent'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto px-24px py-20px'>
          {activeTab === 'overview' && (
            <div className='space-y-20px'>
              <div>
                <h3 className='text-16px font-600 mb-12px'>Description</h3>
                <p className='text-14px text-t-secondary leading-relaxed'>{manifest.description}</p>
              </div>

              {manifest.minHostVersion && (
                <div>
                  <h3 className='text-16px font-600 mb-12px'>Requirements</h3>
                  <div className='p-12px bg-aou-1 rd-8px'>
                    <div className='text-14px'>
                      <span className='text-t-secondary'>Minimum AionUi version: </span>
                      <span className='font-mono'>{manifest.minHostVersion}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className='text-16px font-600 mb-12px'>Installation Details</h3>
                <div className='space-y-8px'>
                  <div className='p-12px bg-aou-1 rd-8px'>
                    <div className='text-14px font-500 mb-4px'>Install Path</div>
                    <div className='text-12px text-t-secondary font-mono'>{plugin.installPath}</div>
                  </div>
                  <div className='p-12px bg-aou-1 rd-8px'>
                    <div className='text-14px font-500 mb-4px'>Installed At</div>
                    <div className='text-12px text-t-secondary'>{new Date(plugin.installedAt).toLocaleString()}</div>
                  </div>
                  <div className='p-12px bg-aou-1 rd-8px'>
                    <div className='text-14px font-500 mb-4px'>Last Updated</div>
                    <div className='text-12px text-t-secondary'>{new Date(plugin.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'capabilities' && (
            <div className='space-y-24px'>
              {/* Tools */}
              {manifest.tools && manifest.tools.length > 0 && (
                <div>
                  <h3 className='text-16px font-600 mb-12px'>Tools ({manifest.tools.length})</h3>
                  <div className='space-y-8px'>
                    {manifest.tools.map((tool, idx) => (
                      <div key={idx} className='p-12px bg-aou-1 rd-8px'>
                        <div className='font-500 text-14px'>{tool.name}</div>
                        <div className='text-12px text-t-secondary mt-4px'>{tool.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {manifest.skills && (
                <div>
                  <h3 className='text-16px font-600 mb-12px'>
                    Skills ({Array.isArray(manifest.skills) ? manifest.skills.length : 1})
                  </h3>
                  <div className='space-y-8px'>
                    {Array.isArray(manifest.skills) ? (
                      manifest.skills.map((skill, idx) => (
                        <div key={idx} className='p-12px bg-aou-1 rd-8px'>
                          <div className='font-500 text-14px'>{skill.name}</div>
                          <div className='text-12px text-t-secondary mt-4px'>{skill.description}</div>
                        </div>
                      ))
                    ) : (
                      <div className='p-12px bg-aou-1 rd-8px'>
                        <div className='text-14px text-t-secondary'>Skills loaded from: {manifest.skills}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Agents */}
              {manifest.agents && manifest.agents.length > 0 && (
                <div>
                  <h3 className='text-16px font-600 mb-12px'>Agents ({manifest.agents.length})</h3>
                  <div className='space-y-8px'>
                    {manifest.agents.map((agent, idx) => (
                      <div key={idx} className='p-12px bg-aou-1 rd-8px'>
                        <div className='flex items-center gap-8px'>
                          {agent.avatar && <span className='text-20px'>{agent.avatar}</span>}
                          <div className='font-500 text-14px'>{agent.name}</div>
                        </div>
                        <div className='text-12px text-t-secondary mt-4px'>{agent.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MCP Servers */}
              {manifest.mcpServers && manifest.mcpServers.length > 0 && (
                <div>
                  <h3 className='text-16px font-600 mb-12px'>MCP Servers ({manifest.mcpServers.length})</h3>
                  <div className='space-y-8px'>
                    {manifest.mcpServers.map((server, idx) => (
                      <div key={idx} className='p-12px bg-aou-1 rd-8px'>
                        <div className='font-500 text-14px'>{server.name}</div>
                        {server.description && (
                          <div className='text-12px text-t-secondary mt-4px'>{server.description}</div>
                        )}
                        <div className='text-12px text-t-tertiary mt-4px'>Transport: {server.transport}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!manifest.tools && !manifest.skills && !manifest.agents && !manifest.mcpServers && (
                <div className='text-center text-t-secondary py-40px'>
                  No capabilities declared in manifest
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className='space-y-16px'>
              {manifest.permissions && manifest.permissions.length > 0 ? (
                <>
                  <p className='text-14px text-t-secondary'>
                    This plugin requires the following permissions to function:
                  </p>
                  <div className='space-y-8px'>
                    {manifest.permissions.map((permission, idx) => (
                      <div key={idx} className='p-12px bg-aou-1 rd-8px'>
                        <div className='font-500 text-14px'>{getPermissionLabel(permission)}</div>
                        <div className='text-12px text-t-secondary mt-4px'>
                          {getPermissionDescription(permission)}
                        </div>
                        <div className='text-12px text-t-tertiary mt-4px font-mono'>{permission}</div>
                      </div>
                    ))}
                  </div>
                  {plugin.grantedPermissions && plugin.grantedPermissions.length > 0 && (
                    <div className='mt-16px p-12px bg-green-500/10 rd-8px'>
                      <div className='text-14px text-green-600 dark:text-green-400'>
                        Granted: {plugin.grantedPermissions.join(', ')}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className='text-center text-t-secondary py-40px'>No special permissions required</div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className='px-24px py-16px border-t border-border flex items-center justify-end gap-12px flex-shrink-0'>
          {isInstalled ? (
            <>
              {isActive ? (
                <button
                  onClick={handleDeactivate}
                  className='px-16px py-8px bg-aou-3 hover:bg-aou-4 rd-8px text-14px transition-colors disabled:opacity-50'
                  disabled={loading}
                >
                  {loading ? 'Deactivating...' : 'Deactivate'}
                </button>
              ) : (
                <button
                  onClick={handleActivate}
                  className='px-16px py-8px bg-primary hover:bg-primary/80 text-white rd-8px text-14px transition-colors disabled:opacity-50'
                  disabled={loading}
                >
                  {loading ? 'Activating...' : 'Activate'}
                </button>
              )}
              <button
                onClick={handleUninstall}
                className='px-16px py-8px bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rd-8px text-14px transition-colors disabled:opacity-50'
                disabled={loading}
              >
                {loading ? 'Uninstalling...' : 'Uninstall'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowInstallDialog(true)}
              className='px-16px py-8px bg-primary hover:bg-primary/80 text-white rd-8px text-14px transition-colors'
            >
              Install
            </button>
          )}
        </div>
      </div>

      {/* Install Dialog (if needed) */}
      {showInstallDialog && (
        <PluginInstallDialog
          visible={showInstallDialog}
          onClose={() => setShowInstallDialog(false)}
          onInstalled={() => {
            onPluginUpdated?.();
            setShowInstallDialog(false);
          }}
        />
      )}
    </div>
  );
};

export default PluginDetailModal;
