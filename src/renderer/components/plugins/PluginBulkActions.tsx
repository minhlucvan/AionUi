/**
 * PluginBulkActions - Bulk operation toolbar for plugin management
 *
 * Features:
 * - Activate/Deactivate selected plugins
 * - Uninstall selected plugins (with confirmation)
 * - Select all / deselect all
 * - Shows count of selected items
 * - Only appears when items are selected
 */

import React from 'react';
import { Button, Modal } from '@arco-design/web-react';
import { IconCheckCircle, IconCloseCircle, IconDelete } from '@arco-design/web-react/icon';
import type { PluginRegistryEntry } from '@/plugin/types';

interface PluginBulkActionsProps {
  selectedPlugins: string[];
  plugins: PluginRegistryEntry[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onActivateSelected: () => Promise<void>;
  onDeactivateSelected: () => Promise<void>;
  onUninstallSelected: () => Promise<void>;
  isLoading?: boolean;
}

const PluginBulkActions: React.FC<PluginBulkActionsProps> = ({
  selectedPlugins,
  plugins,
  onSelectAll,
  onDeselectAll,
  onActivateSelected,
  onDeactivateSelected,
  onUninstallSelected,
  isLoading,
}) => {
  const [modal, contextHolder] = Modal.useModal();

  const selectedCount = selectedPlugins.length;
  const allSelected = plugins.length > 0 && selectedCount === plugins.length;
  const someSelected = selectedCount > 0 && !allSelected;

  // Get selected plugin objects
  const selectedPluginObjects = plugins.filter((p) => selectedPlugins.includes(p.id));
  const activeCount = selectedPluginObjects.filter((p) => p.isActive).length;
  const inactiveCount = selectedCount - activeCount;

  const handleUninstallClick = () => {
    const pluginNames = selectedPluginObjects.map((p) => p.manifest.name).join(', ');

    modal.confirm({
      title: 'Uninstall Selected Plugins',
      content: (
        <div>
          <p className='mb-12px'>
            Are you sure you want to uninstall {selectedCount} plugin{selectedCount > 1 ? 's' : ''}?
          </p>
          <p className='text-13px text-t-secondary mb-12px'>Plugins to be removed:</p>
          <div className='max-h-200px overflow-y-auto bg-aou-1 rd-8px p-12px'>
            <ul className='text-13px space-y-4px'>
              {selectedPluginObjects.map((p) => (
                <li key={p.id}>• {p.manifest.name}</li>
              ))}
            </ul>
          </div>
          <p className='text-13px text-red-600 dark:text-red-400 mt-12px'>
            This action cannot be undone.
          </p>
        </div>
      ),
      okText: 'Uninstall',
      cancelText: 'Cancel',
      okButtonProps: {
        status: 'danger',
      },
      onOk: async () => {
        await onUninstallSelected();
      },
    });
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {contextHolder}
      <div className='mb-20px p-16px bg-primary/10 border border-primary/20 rd-12px flex items-center justify-between'>
        <div className='flex items-center gap-16px'>
          <div className='text-14px font-500'>
            {selectedCount} plugin{selectedCount > 1 ? 's' : ''} selected
            {activeCount > 0 && <span className='text-t-secondary ml-8px'>({activeCount} active)</span>}
          </div>

          {!allSelected && (
            <Button size='small' type='text' onClick={onSelectAll}>
              Select All ({plugins.length})
            </Button>
          )}
          <Button size='small' type='text' onClick={onDeselectAll}>
            Deselect All
          </Button>
        </div>

        <div className='flex items-center gap-8px'>
          {inactiveCount > 0 && (
            <Button
              icon={<IconCheckCircle />}
              onClick={onActivateSelected}
              loading={isLoading}
              type='primary'
              status='success'
            >
              Activate ({inactiveCount})
            </Button>
          )}

          {activeCount > 0 && (
            <Button
              icon={<IconCloseCircle />}
              onClick={onDeactivateSelected}
              loading={isLoading}
            >
              Deactivate ({activeCount})
            </Button>
          )}

          <Button
            icon={<IconDelete />}
            onClick={handleUninstallClick}
            loading={isLoading}
            status='danger'
          >
            Uninstall ({selectedCount})
          </Button>
        </div>
      </div>
    </>
  );
};

export default PluginBulkActions;
