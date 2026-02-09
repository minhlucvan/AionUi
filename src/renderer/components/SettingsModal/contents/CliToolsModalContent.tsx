/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import { iconColors } from '@/renderer/theme/colors';
import { Button, Message, Modal, Spin, Tag, Tooltip } from '@arco-design/web-react';
import { CheckOne, CloseOne, Copy, DownloadOne, LinkCloud, Refresh } from '@icon-park/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsViewMode } from '../settingsViewContext';

interface CliToolInfo {
  backend: string;
  name: string;
  installed: boolean;
  version?: string;
  cliCommand?: string;
  installCommand?: string;
  installUrl?: string;
}

/**
 * CLI Tools section component for embedding within the Tools settings page.
 * Shows installation status and version info for all supported CLI agent tools.
 * Provides install commands, one-click install, and links for tools that are not yet installed.
 */
export const CliToolsSection: React.FC<{ isPageMode?: boolean }> = ({ isPageMode }) => {
  const { t } = useTranslation();
  const [cliTools, setCliTools] = useState<CliToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingBackend, setInstallingBackend] = useState<string | null>(null);
  const [settingUpBackend, setSettingUpBackend] = useState<string | null>(null);
  const [message, messageContext] = Message.useMessage({ maxCount: 5 });
  const [modal, modalContext] = Modal.useModal();

  const fetchCliVersions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ipcBridge.acpConversation.getCliVersions.invoke();
      if (result.success && result.data) {
        setCliTools(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch CLI versions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCliVersions();
  }, [fetchCliVersions]);

  const handleCopyCommand = useCallback(
    (command: string) => {
      void navigator.clipboard.writeText(command).then(() => {
        message.success(t('settings.cliTools.copied', { defaultValue: 'Copied to clipboard' }));
      });
    },
    [message, t]
  );

  const handleOpenUrl = useCallback((url: string) => {
    void ipcBridge.shell.openExternal.invoke(url);
  }, []);

  const handleInstall = useCallback(
    (tool: CliToolInfo) => {
      if (!tool.installCommand) return;

      modal.confirm({
        title: t('settings.cliTools.installConfirmTitle', { defaultValue: 'Install {{name}}', name: tool.name }),
        content: (
          <div className='space-y-8px'>
            <div className='text-14px text-t-secondary'>
              {t('settings.cliTools.installConfirmDesc', { defaultValue: 'This will run the following command on your system:' })}
            </div>
            <div className='bg-fill-2 rd-8px px-12px py-8px font-mono text-13px text-t-primary break-all'>{tool.installCommand}</div>
          </div>
        ),
        okText: t('settings.cliTools.installBtn', { defaultValue: 'Install' }),
        cancelText: t('common.cancel', { defaultValue: 'Cancel' }),
        onOk: async () => {
          setInstallingBackend(tool.backend);
          try {
            const result = await ipcBridge.acpConversation.installCli.invoke({ backend: tool.backend as any });
            if (result.success) {
              message.success(t('settings.cliTools.installSuccess', { defaultValue: '{{name}} installed successfully!', name: tool.name }));
              await fetchCliVersions();
            } else {
              message.error(result.msg || t('settings.cliTools.installFailed', { defaultValue: 'Installation failed' }));
            }
          } catch (error) {
            message.error(t('settings.cliTools.installFailed', { defaultValue: 'Installation failed' }));
          } finally {
            setInstallingBackend(null);
          }
        },
      });
    },
    [modal, message, t, fetchCliVersions]
  );

  const handleSetup = useCallback(
    async (tool: CliToolInfo) => {
      setSettingUpBackend(tool.backend);
      try {
        const result = await ipcBridge.acpConversation.setupCli.invoke({ backend: tool.backend as any });
        if (result.success) {
          const output = result.data?.output || '';
          message.success(
            t('settings.cliTools.setupSuccess', {
              defaultValue: '{{name}} is working correctly',
              name: tool.name,
            }) + (output ? `: ${output.slice(0, 100)}` : '')
          );
        } else {
          message.warning(result.msg || t('settings.cliTools.setupFailed', { defaultValue: 'Setup verification failed' }));
        }
      } catch {
        message.error(t('settings.cliTools.setupFailed', { defaultValue: 'Setup verification failed' }));
      } finally {
        setSettingUpBackend(null);
      }
    },
    [message, t]
  );

  const installedTools = cliTools.filter((tool) => tool.installed);
  const notInstalledTools = cliTools.filter((tool) => !tool.installed);

  return (
    <div className='flex flex-col gap-16px min-h-0'>
      {messageContext}
      {modalContext}

      {/* Header with title and refresh */}
      <div className='flex gap-8px items-center justify-between'>
        <div className='text-14px text-t-primary'>{t('settings.cliTools.title', { defaultValue: 'CLI Tools' })}</div>
        <Tooltip content={t('settings.cliTools.refresh', { defaultValue: 'Refresh' })}>
          <Button type='text' size='small' icon={<Refresh theme='outline' size='16' fill={iconColors.secondary} />} loading={loading} onClick={() => void fetchCliVersions()} />
        </Tooltip>
      </div>

      <div className='text-12px text-t-secondary'>{t('settings.cliTools.description', { defaultValue: 'Manage CLI agent tools installed on your system. These tools power the AI agents available in AionUi.' })}</div>

      {loading && cliTools.length === 0 ? (
        <div className='py-24px flex justify-center'>
          <Spin size={24} />
        </div>
      ) : (
        <div className='space-y-16px'>
          {/* Installed Tools */}
          {installedTools.length > 0 && (
            <div className='space-y-4px'>
              <div className='text-13px font-medium text-t-secondary mb-8px'>
                {t('settings.cliTools.installed', { defaultValue: 'Installed' })} ({installedTools.length})
              </div>
              <div className='w-full flex flex-col divide-y divide-border-2'>
                {installedTools.map((tool) => (
                  <div key={tool.backend} className='flex items-center justify-between py-12px gap-16px'>
                    <div className='flex items-center gap-12px min-w-0 flex-1'>
                      <CheckOne theme='filled' size='18' fill='rgb(var(--green-6))' className='flex-shrink-0' />
                      <div className='min-w-0'>
                        <div className='text-14px text-t-primary font-medium'>{tool.name}</div>
                        {tool.cliCommand && <div className='text-12px text-t-secondary font-mono'>{tool.cliCommand}</div>}
                      </div>
                    </div>
                    <div className='flex items-center gap-8px flex-shrink-0'>
                      {tool.version && (
                        <Tag size='small' color='arcoblue'>
                          {tool.version}
                        </Tag>
                      )}
                      <Tooltip content={t('settings.cliTools.verifySetup', { defaultValue: 'Verify setup' })}>
                        <Button
                          type='text'
                          size='mini'
                          loading={settingUpBackend === tool.backend}
                          icon={<CheckOne theme='outline' size='14' fill={iconColors.secondary} />}
                          onClick={() => void handleSetup(tool)}
                        />
                      </Tooltip>
                      {tool.installUrl && (
                        <Tooltip content={t('settings.cliTools.viewDocs', { defaultValue: 'View documentation' })}>
                          <Button type='text' size='mini' icon={<LinkCloud theme='outline' size='14' fill={iconColors.secondary} />} onClick={() => handleOpenUrl(tool.installUrl!)} />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not Installed Tools */}
          {notInstalledTools.length > 0 && (
            <div className='space-y-4px'>
              <div className='text-13px font-medium text-t-secondary mb-8px'>
                {t('settings.cliTools.notInstalled', { defaultValue: 'Not Installed' })} ({notInstalledTools.length})
              </div>
              <div className='w-full flex flex-col divide-y divide-border-2'>
                {notInstalledTools.map((tool) => (
                  <div key={tool.backend} className='flex items-center justify-between py-12px gap-16px'>
                    <div className='flex items-center gap-12px min-w-0 flex-1'>
                      <CloseOne theme='filled' size='18' fill='rgb(var(--gray-5))' className='flex-shrink-0' />
                      <div className='min-w-0'>
                        <div className='text-14px text-t-primary font-medium'>{tool.name}</div>
                        {tool.cliCommand && <div className='text-12px text-t-secondary font-mono'>{tool.cliCommand}</div>}
                      </div>
                    </div>
                    <div className='flex items-center gap-8px flex-shrink-0'>
                      {tool.installCommand && (
                        <>
                          <Tooltip content={t('settings.cliTools.installTooltip', { defaultValue: 'Install {{name}} on your system', name: tool.name })}>
                            <Button
                              type='primary'
                              size='mini'
                              loading={installingBackend === tool.backend}
                              icon={<DownloadOne theme='outline' size='14' />}
                              onClick={() => handleInstall(tool)}
                            >
                              {t('settings.cliTools.installBtn', { defaultValue: 'Install' })}
                            </Button>
                          </Tooltip>
                          <Tooltip content={tool.installCommand}>
                            <Button
                              type='text'
                              size='mini'
                              icon={<Copy theme='outline' size='14' fill={iconColors.secondary} />}
                              onClick={() => handleCopyCommand(tool.installCommand!)}
                            />
                          </Tooltip>
                        </>
                      )}
                      {tool.installUrl && (
                        <Tooltip content={t('settings.cliTools.installGuide', { defaultValue: 'Installation guide' })}>
                          <Button type='text' size='mini' icon={<LinkCloud theme='outline' size='14' fill={iconColors.secondary} />} onClick={() => handleOpenUrl(tool.installUrl!)} />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {cliTools.length > 0 && (
            <div className='text-12px text-t-secondary'>
              {t('settings.cliTools.summary', {
                defaultValue: '{{installed}} of {{total}} CLI tools installed',
                installed: installedTools.length,
                total: cliTools.length,
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Standalone CLI Tools settings content component (for modal view).
 */
const CliToolsModalContent: React.FC = () => {
  const viewMode = useSettingsViewMode();
  const isPageMode = viewMode === 'page';

  return (
    <div className='flex flex-col h-full w-full'>
      <AionScrollArea className='flex-1 min-h-0 pb-16px' disableOverflow={isPageMode}>
        <div className='px-[12px] md:px-[32px] py-[24px]'>
          <CliToolsSection isPageMode={isPageMode} />
        </div>
      </AionScrollArea>
    </div>
  );
};

export default CliToolsModalContent;
