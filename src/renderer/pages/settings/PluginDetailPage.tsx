/**
 * PluginDetailPage - Full-page detailed view for a single plugin
 *
 * Features:
 * - Breadcrumb navigation
 * - Comprehensive tabs: Overview, Capabilities, Permissions, Settings
 * - Large icons and detailed descriptions
 * - Inline activation toggle
 * - Action buttons (Uninstall, Update)
 * - Metadata display (version, author, license, etc.)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Switch, Tabs, Badge, Modal, Message } from '@arco-design/web-react';
import { IconLeft, IconDelete, IconRefresh } from '@arco-design/web-react/icon';
import { usePlugins, usePluginActions } from '@/renderer/hooks/usePlugins';
import type { PluginRegistryEntry } from '@/plugin/types';

const PluginDetailPage: React.FC = () => {
  const { pluginId } = useParams<{ pluginId: string }>();
  const navigate = useNavigate();
  const { plugins, loading, refetch } = usePlugins();
  const { activate, deactivate, uninstall, loading: actionLoading } = usePluginActions();
  const [modal, contextHolder] = Modal.useModal();

  const plugin = plugins.find((p) => p.id === pluginId);

  useEffect(() => {
    if (!loading && !plugin) {
      Message.error('Plugin not found');
      navigate('/settings/plugins');
    }
  }, [plugin, loading, navigate]);

  if (loading || !plugin) {
    return (
      <div className='p-40px'>
        <div className='text-center py-60px'>
          <div className='text-48px mb-16px'>📦</div>
          <div className='text-16px text-t-secondary'>Loading plugin details...</div>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/settings/plugins');
  };

  const handleToggleActive = async (checked: boolean) => {
    try {
      if (checked) {
        await activate(plugin.id);
        Message.success(`${plugin.manifest.name} activated`);
      } else {
        await deactivate(plugin.id);
        Message.success(`${plugin.manifest.name} deactivated`);
      }
      refetch();
    } catch (err) {
      Message.error((err as Error).message);
    }
  };

  const handleUninstall = () => {
    modal.confirm({
      title: 'Uninstall Plugin',
      content: (
        <div>
          <p className='mb-12px'>Are you sure you want to uninstall <strong>{plugin.manifest.name}</strong>?</p>
          <p className='text-13px text-red-600 dark:text-red-400'>This action cannot be undone.</p>
        </div>
      ),
      okText: 'Uninstall',
      cancelText: 'Cancel',
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        try {
          await uninstall(plugin.id);
          Message.success(`${plugin.manifest.name} uninstalled`);
          navigate('/settings/plugins');
        } catch (err) {
          Message.error((err as Error).message);
        }
      },
    });
  };

  const getStatusColor = () => {
    if (plugin.error) return 'text-red-600 dark:text-red-400';
    if (plugin.isActive) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getStatusText = () => {
    if (plugin.error) return 'Error';
    if (plugin.isActive) return 'Active';
    return 'Inactive';
  };

  return (
    <>
      {contextHolder}
      <div className='p-24px md:p-40px max-w-1200px mx-auto'>
        {/* Breadcrumb Navigation */}
        <div className='mb-24px'>
          <button
            onClick={handleBack}
            className='flex items-center gap-8px text-14px text-t-secondary hover:text-t-primary transition-colors'
          >
            <IconLeft />
            <span>Back to Plugins</span>
          </button>
        </div>

        {/* Plugin Header */}
        <div className='bg-aou-1 rd-16px p-24px mb-24px'>
          <div className='flex items-start gap-20px'>
            {/* Plugin Icon */}
            <div className='text-64px bg-aou-2 rd-16px w-96px h-96px flex items-center justify-center flex-shrink-0'>
              {plugin.manifest.icon || '📦'}
            </div>

            {/* Plugin Info */}
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-12px mb-8px flex-wrap'>
                <h1 className='text-24px font-600 m-0'>{plugin.manifest.name}</h1>
                <Badge status={plugin.isActive ? 'success' : 'default'} text={getStatusText()} />
                <span className='text-14px text-t-secondary'>v{plugin.manifest.version}</span>
              </div>

              <p className='text-14px text-t-secondary mb-16px'>{plugin.manifest.description}</p>

              <div className='flex items-center gap-12px flex-wrap text-13px text-t-tertiary'>
                {plugin.manifest.author && <span>By {plugin.manifest.author}</span>}
                {plugin.manifest.license && <span>• {plugin.manifest.license}</span>}
                {plugin.categories && plugin.categories.length > 0 && (
                  <span>• {plugin.categories.join(', ')}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className='flex items-center gap-12px flex-shrink-0'>
              <div className='flex items-center gap-8px'>
                <span className='text-14px text-t-secondary'>Active</span>
                <Switch checked={plugin.isActive} onChange={handleToggleActive} loading={actionLoading} />
              </div>
              <Button icon={<IconDelete />} status='danger' onClick={handleUninstall} loading={actionLoading}>
                Uninstall
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {plugin.error && (
            <div className='mt-16px p-12px bg-red-500/10 border border-red-500/20 rd-8px'>
              <div className='text-13px text-red-600 dark:text-red-400 font-500 mb-4px'>Error</div>
              <div className='text-13px text-t-secondary'>{plugin.error}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultActiveTab='overview'>
          <Tabs.TabPane key='overview' title='Overview'>
            <div className='space-y-20px'>
              {/* Installation Details */}
              <div className='bg-aou-1 rd-12px p-20px'>
                <h3 className='text-16px font-600 mb-16px'>Installation Details</h3>
                <div className='space-y-8px text-14px'>
                  <div className='flex justify-between'>
                    <span className='text-t-secondary'>Plugin ID</span>
                    <span className='font-mono text-13px'>{plugin.id}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-t-secondary'>Version</span>
                    <span>{plugin.manifest.version}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-t-secondary'>Location</span>
                    <span className='font-mono text-13px text-t-tertiary truncate max-w-400px' title={plugin.path}>
                      {plugin.path}
                    </span>
                  </div>
                  {plugin.installedAt && (
                    <div className='flex justify-between'>
                      <span className='text-t-secondary'>Installed</span>
                      <span>{new Date(plugin.installedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {(plugin.manifest.homepage || plugin.manifest.repository || plugin.manifest.bugs) && (
                <div className='bg-aou-1 rd-12px p-20px'>
                  <h3 className='text-16px font-600 mb-16px'>Links</h3>
                  <div className='space-y-8px text-14px'>
                    {plugin.manifest.homepage && (
                      <div className='flex justify-between'>
                        <span className='text-t-secondary'>Homepage</span>
                        <a
                          href={plugin.manifest.homepage}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-primary hover:underline'
                        >
                          {plugin.manifest.homepage}
                        </a>
                      </div>
                    )}
                    {plugin.manifest.repository && (
                      <div className='flex justify-between'>
                        <span className='text-t-secondary'>Repository</span>
                        <a
                          href={typeof plugin.manifest.repository === 'string' ? plugin.manifest.repository : plugin.manifest.repository.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-primary hover:underline'
                        >
                          View on GitHub
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane key='capabilities' title='Capabilities'>
            <div className='space-y-20px'>
              {/* Tools */}
              {plugin.capabilities?.tools && plugin.capabilities.tools.length > 0 && (
                <div className='bg-aou-1 rd-12px p-20px'>
                  <h3 className='text-16px font-600 mb-16px flex items-center gap-8px'>
                    <span>🔧</span> Tools ({plugin.capabilities.tools.length})
                  </h3>
                  <div className='space-y-12px'>
                    {plugin.capabilities.tools.map((tool) => (
                      <div key={tool.name} className='p-12px bg-aou-2 rd-8px'>
                        <div className='text-14px font-500 mb-4px'>{tool.name}</div>
                        <div className='text-13px text-t-secondary'>{tool.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {plugin.capabilities?.skills && plugin.capabilities.skills.length > 0 && (
                <div className='bg-aou-1 rd-12px p-20px'>
                  <h3 className='text-16px font-600 mb-16px flex items-center gap-8px'>
                    <span>⚡</span> Skills ({plugin.capabilities.skills.length})
                  </h3>
                  <div className='space-y-12px'>
                    {plugin.capabilities.skills.map((skill) => (
                      <div key={skill.name} className='p-12px bg-aou-2 rd-8px'>
                        <div className='text-14px font-500 mb-4px'>{skill.name}</div>
                        <div className='text-13px text-t-secondary'>{skill.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agents */}
              {plugin.capabilities?.agents && plugin.capabilities.agents.length > 0 && (
                <div className='bg-aou-1 rd-12px p-20px'>
                  <h3 className='text-16px font-600 mb-16px flex items-center gap-8px'>
                    <span>🤖</span> Agents ({plugin.capabilities.agents.length})
                  </h3>
                  <div className='space-y-12px'>
                    {plugin.capabilities.agents.map((agent) => (
                      <div key={agent.name} className='p-12px bg-aou-2 rd-8px'>
                        <div className='text-14px font-500 mb-4px'>{agent.name}</div>
                        <div className='text-13px text-t-secondary'>{agent.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MCP Servers */}
              {plugin.capabilities?.mcpServers && plugin.capabilities.mcpServers.length > 0 && (
                <div className='bg-aou-1 rd-12px p-20px'>
                  <h3 className='text-16px font-600 mb-16px flex items-center gap-8px'>
                    <span>🔌</span> MCP Servers ({plugin.capabilities.mcpServers.length})
                  </h3>
                  <div className='space-y-12px'>
                    {plugin.capabilities.mcpServers.map((server) => (
                      <div key={server.name} className='p-12px bg-aou-2 rd-8px'>
                        <div className='text-14px font-500 mb-4px'>{server.name}</div>
                        <div className='text-13px text-t-secondary'>{server.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Capabilities */}
              {(!plugin.capabilities ||
                ((!plugin.capabilities.tools || plugin.capabilities.tools.length === 0) &&
                  (!plugin.capabilities.skills || plugin.capabilities.skills.length === 0) &&
                  (!plugin.capabilities.agents || plugin.capabilities.agents.length === 0) &&
                  (!plugin.capabilities.mcpServers || plugin.capabilities.mcpServers.length === 0))) && (
                <div className='text-center py-60px'>
                  <div className='text-48px mb-16px opacity-20'>📦</div>
                  <div className='text-14px text-t-secondary'>This plugin does not expose any capabilities</div>
                </div>
              )}
            </div>
          </Tabs.TabPane>

          <Tabs.TabPane key='permissions' title='Permissions'>
            <div className='bg-aou-1 rd-12px p-20px'>
              <h3 className='text-16px font-600 mb-16px'>Requested Permissions</h3>
              {plugin.manifest.permissions && plugin.manifest.permissions.length > 0 ? (
                <div className='space-y-12px'>
                  {plugin.manifest.permissions.map((perm) => (
                    <div key={perm} className='p-12px bg-aou-2 rd-8px flex items-start gap-12px'>
                      <span className='text-20px'>🔐</span>
                      <div className='flex-1'>
                        <div className='text-14px font-500 mb-4px'>{perm}</div>
                        <div className='text-13px text-t-secondary'>
                          {/* Add permission descriptions */}
                          Permission description would go here
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-40px'>
                  <div className='text-14px text-t-secondary'>This plugin does not request any permissions</div>
                </div>
              )}
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </>
  );
};

export default PluginDetailPage;
