/**
 * PluginInstallDialog - Installation dialog with source selection
 *
 * Supports installing plugins from:
 * - npm packages
 * - GitHub repositories
 * - Local folders/zip files
 */

import React, { useState } from 'react';
import { dialog } from '@/common/ipcBridge';
import { usePluginInstall } from '@/renderer/hooks/usePlugins';

interface PluginInstallDialogProps {
  visible: boolean;
  onClose: () => void;
  onInstalled?: (pluginId: string) => void;
}

type InstallSource = 'npm' | 'github' | 'local';

const PluginInstallDialog: React.FC<PluginInstallDialogProps> = ({ visible, onClose, onInstalled }) => {
  const [activeTab, setActiveTab] = useState<InstallSource>('npm');
  const [npmPackage, setNpmPackage] = useState('');
  const [npmVersion, setNpmVersion] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubRef, setGithubRef] = useState('');
  const [localPath, setLocalPath] = useState('');

  const { installFromNpm, installFromGithub, installFromLocal, installing, error } = usePluginInstall();

  const handleSelectFolder = async () => {
    try {
      const result = await dialog.showOpen.invoke({
        properties: ['openDirectory'],
      });
      if (result && result.length > 0) {
        setLocalPath(result[0]);
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  };

  const handleInstall = async () => {
    let result;

    switch (activeTab) {
      case 'npm':
        if (!npmPackage.trim()) {
          alert('Please enter a package name');
          return;
        }
        result = await installFromNpm(npmPackage.trim(), npmVersion.trim() || undefined);
        break;

      case 'github':
        if (!githubRepo.trim()) {
          alert('Please enter a GitHub repository');
          return;
        }
        result = await installFromGithub(githubRepo.trim(), githubRef.trim() || undefined);
        break;

      case 'local':
        if (!localPath.trim()) {
          alert('Please select a folder');
          return;
        }
        result = await installFromLocal(localPath.trim());
        break;
    }

    if (result?.success) {
      // Installation successful - trigger refresh by calling with empty string
      // The parent component should refetch the plugin list
      onInstalled?.('');
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setNpmPackage('');
    setNpmVersion('');
    setGithubRepo('');
    setGithubRef('');
    setLocalPath('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!visible) return null;

  return (
    <div
      className='fixed inset-0 z-1000 flex items-center justify-center bg-black/50'
      onClick={handleClose}
    >
      <div
        className='w-full max-w-600px bg-aou-0 rd-16px shadow-xl overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='px-24px py-20px border-b border-border'>
          <h2 className='text-20px font-600'>Install Plugin</h2>
          <p className='text-14px text-t-secondary mt-4px'>Choose an installation source</p>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-border'>
          {[
            { id: 'npm' as const, label: 'npm Package', icon: '📦' },
            { id: 'github' as const, label: 'GitHub', icon: '🐙' },
            { id: 'local' as const, label: 'Local Folder', icon: '📁' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 px-16px py-12px text-14px font-500 transition-colors
                ${activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-t-secondary hover:text-t-primary border-b-2 border-transparent'
                }
              `}
            >
              <span className='mr-8px'>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className='px-24px py-20px min-h-200px'>
          {activeTab === 'npm' && (
            <div className='space-y-16px'>
              <div>
                <label className='block text-14px font-500 mb-8px'>
                  Package Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={npmPackage}
                  onChange={(e) => setNpmPackage(e.target.value)}
                  placeholder='@aionui/plugin-example or aionui-plugin-example'
                  className='w-full px-12px py-8px bg-aou-1 border border-border rd-8px focus:outline-none focus:border-primary'
                  disabled={installing}
                />
                <p className='text-12px text-t-secondary mt-4px'>
                  Enter npm package name. Can be scoped (@aionui/*) or unscoped.
                </p>
              </div>

              <div>
                <label className='block text-14px font-500 mb-8px'>Version (Optional)</label>
                <input
                  type='text'
                  value={npmVersion}
                  onChange={(e) => setNpmVersion(e.target.value)}
                  placeholder='1.0.0 or latest'
                  className='w-full px-12px py-8px bg-aou-1 border border-border rd-8px focus:outline-none focus:border-primary'
                  disabled={installing}
                />
                <p className='text-12px text-t-secondary mt-4px'>
                  Leave empty to install the latest version.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className='space-y-16px'>
              <div>
                <label className='block text-14px font-500 mb-8px'>
                  Repository <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder='owner/repo'
                  className='w-full px-12px py-8px bg-aou-1 border border-border rd-8px focus:outline-none focus:border-primary'
                  disabled={installing}
                />
                <p className='text-12px text-t-secondary mt-4px'>
                  Format: owner/repo (e.g., aionui/plugin-example)
                </p>
              </div>

              <div>
                <label className='block text-14px font-500 mb-8px'>Branch/Tag/Commit (Optional)</label>
                <input
                  type='text'
                  value={githubRef}
                  onChange={(e) => setGithubRef(e.target.value)}
                  placeholder='main or v1.0.0 or commit-sha'
                  className='w-full px-12px py-8px bg-aou-1 border border-border rd-8px focus:outline-none focus:border-primary'
                  disabled={installing}
                />
                <p className='text-12px text-t-secondary mt-4px'>
                  Leave empty to use the default branch.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'local' && (
            <div className='space-y-16px'>
              <div>
                <label className='block text-14px font-500 mb-8px'>
                  Plugin Folder <span className='text-red-500'>*</span>
                </label>
                <div className='flex gap-8px'>
                  <input
                    type='text'
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    placeholder='Select a folder containing package.json'
                    className='flex-1 px-12px py-8px bg-aou-1 border border-border rd-8px focus:outline-none focus:border-primary'
                    disabled={installing}
                  />
                  <button
                    onClick={handleSelectFolder}
                    className='px-16px py-8px bg-aou-3 hover:bg-aou-4 rd-8px text-14px transition-colors whitespace-nowrap'
                    disabled={installing}
                  >
                    Browse...
                  </button>
                </div>
                <p className='text-12px text-t-secondary mt-4px'>
                  Select a folder containing a valid plugin (must have package.json with "aionui" field).
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className='mt-16px p-12px bg-red-500/10 border border-red-500/20 rd-8px'>
              <p className='text-14px text-red-600 dark:text-red-400'>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='px-24px py-16px border-t border-border flex items-center justify-end gap-12px'>
          <button
            onClick={handleClose}
            className='px-16px py-8px bg-aou-3 hover:bg-aou-4 rd-8px text-14px transition-colors'
            disabled={installing}
          >
            Cancel
          </button>
          <button
            onClick={handleInstall}
            className='px-16px py-8px bg-primary hover:bg-primary/80 text-white rd-8px text-14px transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            disabled={installing}
          >
            {installing ? 'Installing...' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PluginInstallDialog;
